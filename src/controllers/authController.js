const User = require('../models/User');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { createAndSendToken } = require('../utils/jwt');

// POST /api/auth/register
const register = catchAsync(async (req, res, next) => {
  const { username, email, password, displayName } = req.body;

  // Check if username or email already taken
  const existingUser = await User.findOne({ $or: [{ username }, { email }] });
  if (existingUser) {
    const field = existingUser.username === username ? 'Username' : 'Email';
    return next(new AppError(`${field} is already taken.`, 400));
  }

  const newUser = await User.create({
    username,
    email,
    password,
    displayName: displayName || username,
  });

  createAndSendToken(newUser, 201, res);
});

// POST /api/auth/login
const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // Find user and explicitly select password
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.correctPassword(password))) {
    return next(new AppError('Incorrect email or password.', 401));
  }

  if (!user.isActive) {
    return next(new AppError('This account has been deactivated. Please contact support.', 403));
  }

  createAndSendToken(user, 200, res);
});

// POST /api/auth/logout
const logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
    secure: process.env.NODE_ENV === 'production',
  });

  res.status(200).json({ status: 'success', message: 'Logged out successfully.' });
};

// GET /api/auth/me
const getMe = catchAsync(async (req, res) => {
  // optionalAuth sets req.user if logged in, otherwise it's undefined
  if (!req.user) {
    return res.status(200).json({ status: 'success', data: { user: null } });
  }

  const user = await User.findById(req.user.id);

  res.status(200).json({
    status: 'success',
    data: {
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
      },
    },
  });
});

// PATCH /api/auth/update-password
const updatePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  // Get user with password
  const user = await User.findById(req.user.id).select('+password');

  if (!(await user.correctPassword(currentPassword))) {
    return next(new AppError('Your current password is incorrect.', 401));
  }

  if (currentPassword === newPassword) {
    return next(new AppError('New password must be different from your current password.', 400));
  }

  user.password = newPassword;
  await user.save();

  createAndSendToken(user, 200, res);
});

// GET /api/auth/check-username/:username
const checkUsername = catchAsync(async (req, res) => {
  const { username } = req.params;
  const exists = await User.exists({ username: username.toLowerCase() });

  res.status(200).json({
    status: 'success',
    data: { available: !exists },
  });
});

module.exports = { register, login, logout, getMe, updatePassword, checkUsername };
