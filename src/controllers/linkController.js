const Link = require('../models/Link');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

// GET /api/links — get authenticated user's all links
const getMyLinks = catchAsync(async (req, res) => {
  const links = await Link.find({ userId: req.user.id })
    .sort({ order: 1, createdAt: 1 })
    .select('-clickEvents');

  res.status(200).json({
    status: 'success',
    results: links.length,
    data: { links },
  });
});

// POST /api/links — create a new link
const createLink = catchAsync(async (req, res, next) => {
  const { title, isActive } = req.body;
  let { url } = req.body;
  if (url && !/^https?:\/\//.test(url)) url = `https://${url}`;

  // Assign order: put new link at the end
  const lastLink = await Link.findOne({ userId: req.user.id }).sort({ order: -1 });
  const order = lastLink ? lastLink.order + 1 : 0;

  const link = await Link.create({
    userId: req.user.id,
    title,
    url,
    order,
    isActive: isActive !== undefined ? isActive : true,
  });

  res.status(201).json({
    status: 'success',
    data: { link },
  });
});

// GET /api/links/:id — get a single link (owner only)
const getLink = catchAsync(async (req, res, next) => {
  const link = await Link.findOne({ _id: req.params.id, userId: req.user.id });

  if (!link) {
    return next(new AppError('No link found with that ID.', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { link },
  });
});

// PATCH /api/links/:id — update a link
const updateLink = catchAsync(async (req, res, next) => {
  const { title, isActive } = req.body;
  let { url } = req.body;
  if (url && !/^https?:\/\//.test(url)) url = `https://${url}`;

  const link = await Link.findOneAndUpdate(
    { _id: req.params.id, userId: req.user.id },
    { title, url, isActive },
    { new: true, runValidators: true }
  );

  if (!link) {
    return next(new AppError('No link found with that ID.', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { link },
  });
});

// DELETE /api/links/:id — delete a link
const deleteLink = catchAsync(async (req, res, next) => {
  const link = await Link.findOneAndDelete({ _id: req.params.id, userId: req.user.id });

  if (!link) {
    return next(new AppError('No link found with that ID.', 404));
  }

  res.status(204).json({ status: 'success', data: null });
});

// PATCH /api/links/reorder — bulk reorder links
const reorderLinks = catchAsync(async (req, res, next) => {
  const { links } = req.body; // [{ id, order }, ...]

  // Verify all links belong to the current user before updating
  const ids = links.map((l) => l.id);
  const count = await Link.countDocuments({ _id: { $in: ids }, userId: req.user.id });

  if (count !== ids.length) {
    return next(new AppError('One or more links not found or do not belong to you.', 403));
  }

  // Bulk update using bulkWrite for efficiency
  const bulkOps = links.map(({ id, order }) => ({
    updateOne: {
      filter: { _id: id, userId: req.user.id },
      update: { $set: { order } },
    },
  }));

  await Link.bulkWrite(bulkOps);

  const updatedLinks = await Link.find({ userId: req.user.id })
    .sort({ order: 1 })
    .select('-clickEvents');

  res.status(200).json({
    status: 'success',
    data: { links: updatedLinks },
  });
});

// GET /api/links/:id/analytics — link analytics (owner only)
const getLinkAnalytics = catchAsync(async (req, res, next) => {
  const link = await Link.findOne({ _id: req.params.id, userId: req.user.id })
    .select('+clickEvents');

  if (!link) {
    return next(new AppError('No link found with that ID.', 404));
  }

  // Build daily clicks for the last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentEvents = link.clickEvents.filter((e) => e.clickedAt >= thirtyDaysAgo);

  const dailyClicks = {};
  recentEvents.forEach((event) => {
    const day = event.clickedAt.toISOString().split('T')[0];
    dailyClicks[day] = (dailyClicks[day] || 0) + 1;
  });

  res.status(200).json({
    status: 'success',
    data: {
      linkId: link._id,
      title: link.title,
      url: link.url,
      totalClicks: link.clickCount,
      recentClicks: recentEvents.length,
      dailyClicks,
    },
  });
});

// POST /api/links/:id/click — record a click (public)
const recordClick = catchAsync(async (req, res, next) => {
  const link = await Link.findOne({ _id: req.params.id, isActive: true })
    .select('+clickEvents');

  if (!link) {
    return next(new AppError('Link not found or is inactive.', 404));
  }

  await link.recordClick(req);

  res.status(200).json({
    status: 'success',
    data: { url: link.url },
  });
});

module.exports = {
  getMyLinks,
  createLink,
  getLink,
  updateLink,
  deleteLink,
  reorderLinks,
  getLinkAnalytics,
  recordClick,
};
