const express = require('express');
const router = express.Router();
const linkController = require('../controllers/linkController');
const { protect } = require('../middleware/auth');
const {
  createLinkValidation,
  updateLinkValidation,
  reorderLinksValidation,
} = require('../middleware/validators');
const { publicLimiter } = require('../middleware/rateLimiter');

// Public route — record a click (no auth needed)
router.post('/:id/click', publicLimiter, linkController.recordClick);

// All routes below require authentication
router.use(protect);

router
  .route('/')
  .get(linkController.getMyLinks)
  .post(createLinkValidation, linkController.createLink);

router.patch('/reorder', reorderLinksValidation, linkController.reorderLinks);

router
  .route('/:id')
  .get(linkController.getLink)
  .patch(updateLinkValidation, linkController.updateLink)
  .delete(linkController.deleteLink);

router.get('/:id/analytics', linkController.getLinkAnalytics);

module.exports = router;
