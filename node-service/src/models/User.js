const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// node-service owns only the `users` table.
// `records` lives in the same database but is owned by python-service.
const User = sequelize.define(
  'User',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    // Always a bcrypt hash — never plaintext.
    password: { type: DataTypes.STRING(255), allowNull: false },
  },
  { tableName: 'users' }
);

module.exports = User;
