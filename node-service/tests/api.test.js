// Integration tests: real PostgreSQL + real Redis (both must be running locally).
// Run: npm test
const { test, before, after, describe } = require('node:test');
const assert = require('node:assert/strict');

// Short rate-limit window so the "counter expires" test doesn't wait a full minute.
process.env.RATE_LIMIT_WINDOW_SECONDS = '2';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const env = require('../src/config/env');
const redis = require('../src/config/redis');
const sequelize = require('../src/config/database');
const User = require('../src/models/User');

const RUN_ID = Date.now();
const userA = { name: 'Alice Test', email: `alice_${RUN_ID}@example.com`, password: 'Password123' };
const userB = { name: 'Bob Test', email: `bob_${RUN_ID}@example.com`, password: 'Password456' };

async function resetRateLimit() {
  const keys = await redis.keys('rate_limit:*');
  if (keys.length) await redis.del(...keys);
}

const login = (body) => request(app).post('/api/auth/login').send(body);

before(async () => {
  if (redis.status !== 'ready') await new Promise((resolve) => redis.once('ready', resolve));
  await sequelize.sync();
  await resetRateLimit();
});

after(async () => {
  await User.destroy({ where: { email: [userA.email, userB.email] } });
  await resetRateLimit();
  await sequelize.close();
  redis.disconnect();
});

describe('health', () => {
  test('reports database and redis up', async () => {
    const res = await request(app).get('/health');
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.data, { database: 'up', redis: 'up' });
  });
});

describe('auth', () => {
  test('register creates user, returns token, never the password hash', async () => {
    const res = await request(app).post('/api/auth/register').send(userA);
    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.token);
    assert.equal(res.body.data.user.email, userA.email);
    assert.equal(res.body.data.user.password, undefined);

    const resB = await request(app).post('/api/auth/register').send(userB);
    assert.equal(resB.status, 201);
  });

  test('password is stored as a bcrypt hash', async () => {
    const user = await User.findOne({ where: { email: userA.email } });
    assert.notEqual(user.password, userA.password);
    assert.match(user.password, /^\$2[aby]\$10\$/);
  });

  test('duplicate email -> 409', async () => {
    await resetRateLimit(); // register is rate limited too; keep these tests under 5 calls
    const res = await request(app).post('/api/auth/register').send(userA);
    assert.equal(res.status, 409);
    assert.equal(res.body.success, false);
  });

  test('missing register fields -> 400', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'x@example.com' });
    assert.equal(res.status, 400);
  });

  test('invalid email -> 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'X', email: 'not-an-email', password: 'Password123' });
    assert.equal(res.status, 400);
  });

  test('short password -> 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'X', email: 'short@example.com', password: 'short' });
    assert.equal(res.status, 400);
  });

  test('login succeeds and JWT carries userId + email', async () => {
    await resetRateLimit();
    const res = await login({ email: userA.email, password: userA.password });
    assert.equal(res.status, 200);
    assert.equal(res.body.message, 'Login successful');
    const payload = jwt.verify(res.body.token, env.jwtSecret, { algorithms: ['HS256'] });
    assert.equal(payload.email, userA.email);
    assert.ok(Number.isInteger(payload.userId));
    assert.ok(payload.exp > payload.iat);
  });

  test('wrong password -> 401', async () => {
    await resetRateLimit();
    const res = await login({ email: userA.email, password: 'WrongPass999' });
    assert.equal(res.status, 401);
    assert.equal(res.body.message, 'Invalid email or password');
  });

  test('unknown email -> 401 with the same message', async () => {
    const res = await login({ email: `nobody_${RUN_ID}@example.com`, password: 'Password123' });
    assert.equal(res.status, 401);
    assert.equal(res.body.message, 'Invalid email or password');
  });
});

describe('redis rate limiting', () => {
  test('5 attempts allowed, 6th -> 429 with Retry-After', async () => {
    await resetRateLimit();
    for (let i = 1; i <= 5; i += 1) {
      const res = await login({ email: userA.email, password: userA.password });
      assert.equal(res.status, 200, `attempt ${i} should pass`);
      assert.equal(res.headers['x-ratelimit-remaining'], String(5 - i));
    }
    const blocked = await login({ email: userA.email, password: userA.password });
    assert.equal(blocked.status, 429);
    assert.equal(blocked.body.success, false);
    assert.ok(Number(blocked.headers['retry-after']) > 0);
  });

  test('counter lives in redis under rate_limit:/login:<IP> with an expiry', async () => {
    const keys = await redis.keys('rate_limit:/login:*');
    assert.equal(keys.length, 1);
    assert.equal(await redis.get(keys[0]), '6');
    const ttl = await redis.ttl(keys[0]);
    assert.ok(ttl > 0 && ttl <= 2, `ttl was ${ttl}`);
  });

  test('failed attempts count too', async () => {
    await resetRateLimit();
    for (let i = 0; i < 5; i += 1) await login({ email: userA.email, password: 'wrong-pass-1' });
    assert.equal((await login({ email: userA.email, password: userA.password })).status, 429);
  });

  test('counter expires and login works again', async () => {
    await new Promise((resolve) => setTimeout(resolve, 2500));
    const res = await login({ email: userA.email, password: userA.password });
    assert.equal(res.status, 200);
  });

  test('register is rate limited too, with its own counter', async () => {
    await resetRateLimit();
    const register = () => request(app).post('/api/auth/register').send({});
    for (let i = 0; i < 5; i += 1) assert.equal((await register()).status, 400);
    assert.equal((await register()).status, 429);
    // Login counter is separate, so login still works.
    assert.equal((await login({ email: userA.email, password: userA.password })).status, 200);
  });
});
