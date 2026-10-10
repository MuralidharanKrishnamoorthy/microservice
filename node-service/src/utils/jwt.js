const jwt = require('jsonwebtoken');
const env = require('../config/env');

// HS256 + shared secret, so python-service can verify the same token.
function signToken(user) {
  return jwt.sign({ userId: user.id, email: user.email }, env.jwtSecret, {
    algorithm: 'HS256',
    expiresIn: env.jwtExpiresIn,
  });
}

module.exports = { signToken };
