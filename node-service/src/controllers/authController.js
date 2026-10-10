const authService = require('../services/authService');
const ApiError = require('../utils/ApiError');

// Controllers only translate HTTP <-> service calls; logic lives in services.
// Each one catches its own errors and sends the { success: false, message } shape.

function sendError(res, err) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ success: false, message: err.message });
  }
  console.error(err);
  res.status(500).json({ success: false, message: 'Internal server error' });
}

async function register(req, res) {
  try {
    const { user, token } = await authService.register(req.body);
    res.status(201).json({ success: true, message: 'Registration successful', token, data: { user } });
  } catch (err) {
    sendError(res, err);
  }
}

async function login(req, res) {
  try {
    const { user, token } = await authService.login(req.body);
    res.json({ success: true, message: 'Login successful', token, data: { user } });
  } catch (err) {
    sendError(res, err);
  }
}

module.exports = { register, login };
