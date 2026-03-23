const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect, optionalAuth } = require('../middleware/auth');
const {
  registerValidation,
  loginValidation,
  updatePasswordValidation,
} = require('../middleware/validators');
const { authLimiter } = require('../middleware/rateLimiter');

// Public routes
router.post('/register', authLimiter, registerValidation, authController.register);
router.post('/login', authLimiter, loginValidation, authController.login);
router.post('/logout', authController.logout);
router.get('/check-username/:username', authController.checkUsername);

// Returns current user if logged in, or { user: null } if not — never 401
router.get('/me', optionalAuth, authController.getMe);

// Protected routes (require login)
router.use(protect);
router.patch('/update-password', updatePasswordValidation, authController.updatePassword);

module.exports = router;
