const redis = require('../config/redis');
const env = require('../config/env');

// Allows `max` requests per IP per route within `windowSeconds`, then replies 429.
// Used on /login (password guessing) and /register (fake-account spam).
async function rateLimit(req, res, next) {
  // Separate counter per route + IP, e.g. "rate_limit:/login:127.0.0.1"
  const key = `rate_limit:${req.path}:${req.ip}`;
  const max = env.rateLimitMax;
  const windowSeconds = env.rateLimitWindowSeconds;

  let attempts;
  let ttl;
  try {
    attempts = await redis.incr(key);
    if (attempts === 1) {
      // First request in this window: start the countdown.
      await redis.expire(key, windowSeconds);
    }
    ttl = await redis.ttl(key);

  } catch (err) {
    // Redis down: let the request through rather than blocking everyone.
    console.error(`[rate-limit] Redis unavailable, skipping limit: ${err.message}`);
    return next();
  }

  res.set('X-RateLimit-Limit', String(max));
  res.set('X-RateLimit-Remaining', String(Math.max(0, max - attempts)));

  if (attempts > max) {
    const retryAfter = ttl > 0 ? ttl : windowSeconds;
    res.set('Retry-After', String(retryAfter));
    return res.status(429).json({
      success: false,
      message: `Too many attempts. Try again in ${retryAfter} seconds.`,
      retryAfter,
    });
  }

  next();
}

module.exports = { rateLimit };
