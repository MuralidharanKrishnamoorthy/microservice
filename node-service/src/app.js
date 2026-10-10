const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const sequelize = require('./config/database');
const redis = require('./config/redis');
const authRoutes = require('./routes/authRoutes');

const app = express();

// Only the configured frontend origin may call this API from a browser.
app.use(cors({ origin: env.corsOrigin }));
app.use(express.json());

// Reports whether this service can reach its dependencies.
app.get('/health', async (req, res) => {
  const checks = { database: 'down', redis: 'down' };
  try {
    await sequelize.authenticate();
    checks.database = 'up';
  } catch (err) {
    console.error(`[health] database check failed: ${err.message}`);
  }
  try {
    if ((await redis.ping()) === 'PONG') checks.redis = 'up';
  } catch (err) {
    console.error(`[health] redis check failed: ${err.message}`);
  }

  const healthy = checks.database === 'up' && checks.redis === 'up';
  res.status(healthy ? 200 : 503).json({ success: healthy, service: 'node-service', data: checks });
});

app.use('/api/auth', authRoutes);

// Unknown routes
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
});

module.exports = app;
