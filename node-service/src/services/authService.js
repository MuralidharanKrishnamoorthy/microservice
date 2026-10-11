const bcrypt = require('bcrypt');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { signToken } = require('../utils/jwt');

async function register({ name, email, password }) {
  try {
    if (!name || !email || !password) {
      throw ApiError.badRequest('Name, email and password are required');
    }

    
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      throw ApiError.badRequest('Invalid email format');
    }

    // Same rules as frontend validatePassword; the client check can be bypassed.
    if (password.length < 8) {
      throw ApiError.badRequest('Password must be at least 8 characters');
    }
    if (!/[A-Z]/.test(password)) {
      throw ApiError.badRequest('Password must contain an uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      throw ApiError.badRequest('Password must contain a lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      throw ApiError.badRequest('Password must contain a number');
    }
    if (!/[^A-Za-z0-9\s]/.test(password)) {
      throw ApiError.badRequest('Password must contain a special character (e.g. @ # $ !)');
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      throw ApiError.conflict('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashedPassword });

    return {
      user: { id: user.id, name: user.name, email: user.email },
      token: signToken(user),
    };
  } catch (error) {
    throw error;
  }
}

async function login({ email, password }) {
  try {
    if (!email || !password) {
      throw ApiError.badRequest('Email and password are required');
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    return {
      user: { id: user.id, name: user.name, email: user.email },
      token: signToken(user),
    };
  } catch (error) {
    throw error;
  }
}

module.exports = { register, login };
