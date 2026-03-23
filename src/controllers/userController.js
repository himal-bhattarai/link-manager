const User = require('../models/User');
const Link = require('../models/Link');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { cloudinary } = require('../config/cloudinary');

// GET /api/users/:username — public profile page
const getPublicProfile = catchAsync(async (req, res, next) => {
  const user = await User.findOne({
    username: req.params.username.toLowerCase(),
    isActive: true,
  });

  if (!user) {
    return next(new AppError('No user found with that username.', 404));
  }

  const links = await Link.find({ userId: user._id, isActive: true })
    .sort({ order: 1 })
    .select('title url clickCount thumbnail createdAt');

  res.status(200).json({
    status: 'success',
    data: {
      profile: {
        username: user.username,
        displayName: user.displayName,
        bio: user.bio,
        avatarUrl: user.avatarUrl,
      },
      links,
    },
  });
});

// PATCH /api/users/profile — update own profile
const updateProfile = catchAsync(async (req, res, next) => {
  const { displayName, bio } = req.body;

  // Prevent updating password or email here
  if (req.body.password || req.body.email) {
    return next(new AppError('This route is not for password or email updates.', 400));
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    { displayName, bio },
    { new: true, runValidators: true }
  );

  res.status(200).json({
    status: 'success',
    data: {
      user: {
        id: updatedUser._id,
        username: updatedUser.username,
        displayName: updatedUser.displayName,
        bio: updatedUser.bio,
        avatarUrl: updatedUser.avatarUrl,
      },
    },
  });
});

// PATCH /api/users/avatar — upload/update avatar
const updateAvatar = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('Please upload an image file.', 400));
  }

  // Delete old avatar from Cloudinary if it exists
  if (req.user.avatarPublicId) {
    await cloudinary.uploader.destroy(req.user.avatarPublicId);
  }

  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    {
      avatarUrl: req.file.path,
      avatarPublicId: req.file.filename,
    },
    { new: true }
  );

  res.status(200).json({
    status: 'success',
    data: {
      avatarUrl: updatedUser.avatarUrl,
    },
  });
});

// DELETE /api/users/avatar — remove avatar
const deleteAvatar = catchAsync(async (req, res, next) => {
  if (req.user.avatarPublicId) {
    await cloudinary.uploader.destroy(req.user.avatarPublicId);
  }

  await User.findByIdAndUpdate(req.user.id, {
    avatarUrl: '',
    avatarPublicId: '',
  });

  res.status(200).json({
    status: 'success',
    message: 'Avatar removed successfully.',
  });
});

// DELETE /api/users/account — delete own account
const deleteAccount = catchAsync(async (req, res, next) => {
  const { password } = req.body;

  if (!password) {
    return next(new AppError('Please provide your password to confirm account deletion.', 400));
  }

  const user = await User.findById(req.user.id).select('+password');
  if (!(await user.correctPassword(password))) {
    return next(new AppError('Incorrect password.', 401));
  }

  // Delete all user links
  await Link.deleteMany({ userId: req.user.id });

  // Delete avatar from Cloudinary
  if (user.avatarPublicId) {
    await cloudinary.uploader.destroy(user.avatarPublicId);
  }

  // Delete user
  await User.findByIdAndDelete(req.user.id);

  // Clear cookie
  res.cookie('jwt', '', { expires: new Date(0), httpOnly: true });

  res.status(204).json({ status: 'success', data: null });
});

// GET /api/users/dashboard/stats — dashboard overview stats
const getDashboardStats = catchAsync(async (req, res) => {
  const links = await Link.find({ userId: req.user.id }).select('clickCount isActive title url');

  const totalLinks = links.length;
  const activeLinks = links.filter((l) => l.isActive).length;
  const totalClicks = links.reduce((sum, l) => sum + l.clickCount, 0);
  const topLinks = [...links]
    .sort((a, b) => b.clickCount - a.clickCount)
    .slice(0, 5)
    .map((l) => ({ title: l.title, url: l.url, clickCount: l.clickCount }));

  res.status(200).json({
    status: 'success',
    data: {
      stats: {
        totalLinks,
        activeLinks,
        inactiveLinks: totalLinks - activeLinks,
        totalClicks,
        topLinks,
      },
    },
  });
});

module.exports = {
  getPublicProfile,
  updateProfile,
  updateAvatar,
  deleteAvatar,
  deleteAccount,
  getDashboardStats,
};
