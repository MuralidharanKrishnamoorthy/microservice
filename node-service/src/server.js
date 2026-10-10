const app = require('./app');
const env = require('./config/env');
const sequelize = require('./config/database');

async function start() {
  await sequelize.authenticate();
  console.log('[db] connected to PostgreSQL');

  // Creates the users table if it does not exist yet.
  // A real deployment would use Sequelize migrations instead.
  await sequelize.sync();

  app.listen(env.port, () => {
    console.log(`[node-service] listening on http://localhost:${env.port}`);
  });
}

start().catch((err) => {
  console.error('[node-service] failed to start:', err.message);
  process.exit(1);
});
