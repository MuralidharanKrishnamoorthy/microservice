const { Sequelize } = require('sequelize');
const env = require('./env');

// One Sequelize instance for the whole service, configured from DATABASE_URL.
const sequelize = new Sequelize(env.databaseUrl, {
  dialect: 'postgres',
  
});

module.exports = sequelize;
