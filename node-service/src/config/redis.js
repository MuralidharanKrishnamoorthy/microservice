const Redis = require('ioredis');
const env = require('./env');

// Host and port come from .env — switching to e.g. REDIS_PORT=6380 needs no code change.
const redis = new Redis({
  host: env.redisHost,
  port: env.redisPort,
  // Fail fast instead of queueing commands forever when Redis is down,
  // so the rate limiter can decide what to do (see rateLimitMiddleware).
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
});

redis.on('ready', () => console.log(`[redis] connected to ${env.redisHost}:${env.redisPort}`));
redis.on('error', (err) => console.error(`[redis] ${err.message}`));

module.exports = redis;
