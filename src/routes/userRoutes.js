const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const { uploadAvatar } = require('../config/cloudinary');
const { updateProfileValidation } = require('../middleware/validators');
const { publicLimiter } = require('../middleware/rateLimiter');

// Public route — view someone's profile
router.get('/:username', publicLimiter, userController.getPublicProfile);

// All routes below require authentication
router.use(protect);

router.get('/dashboard/stats', userController.getDashboardStats);
router.patch('/profile', updateProfileValidation, userController.updateProfile);
router.patch('/avatar', uploadAvatar.single('avatar'), userController.updateAvatar);
router.delete('/avatar', userController.deleteAvatar);
router.delete('/account', userController.deleteAccount);

module.exports = router;
