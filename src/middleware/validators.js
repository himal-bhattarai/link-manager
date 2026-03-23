const { body, param, validationResult } = require('express-validator');
const AppError = require('../utils/AppError');

// Middleware: check validation results and return errors
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((e) => e.msg).join('. ');
    return next(new AppError(messages, 400));
  }
  next();
};

// Auth validators
const registerValidation = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 3, max: 30 }).withMessage('Username must be 3–30 characters')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores')
    .toLowerCase(),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Must be a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),
  body('displayName')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Display name cannot exceed 50 characters'),
  validate,
];

const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Must be a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required'),
  validate,
];

const updatePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Must contain at least one number'),
  body('confirmPassword')
    .notEmpty().withMessage('Please confirm your new password')
    .custom((val, { req }) => {
      if (val !== req.body.newPassword) throw new Error('Passwords do not match');
      return true;
    }),
  validate,
];

// Link validators
const createLinkValidation = [
  body('title')
    .trim()
    .notEmpty().withMessage('Link title is required')
    .isLength({ max: 100 }).withMessage('Title cannot exceed 100 characters'),
  body('url')
    .trim()
    .notEmpty().withMessage('URL is required')
    .custom((val) => {
      const withProtocol = /^https?:\/\//.test(val) ? val : `https://${val}`
      try { new URL(withProtocol); return true } catch { throw new Error('Must be a valid URL') }
    }),
  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be a boolean'),
  validate,
];

const updateLinkValidation = [
  body('title')
    .optional()
    .trim()
    .notEmpty().withMessage('Title cannot be empty')
    .isLength({ max: 100 }).withMessage('Title cannot exceed 100 characters'),
  body('url')
    .optional()
    .trim()
    .custom((val) => {
      const withProtocol = /^https?:\/\//.test(val) ? val : `https://${val}`
      try { new URL(withProtocol); return true } catch { throw new Error('Must be a valid URL') }
    }),
  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be a boolean'),
  validate,
];

const reorderLinksValidation = [
  body('links')
    .isArray({ min: 1 }).withMessage('links must be a non-empty array')
    .custom((links) => {
      for (const item of links) {
        if (!item.id) throw new Error('Each link must have an id');
        if (typeof item.order !== 'number') throw new Error('Each link must have a numeric order');
      }
      return true;
    }),
  validate,
];

// Profile validators
const updateProfileValidation = [
  body('displayName')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Display name cannot exceed 50 characters'),
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 160 }).withMessage('Bio cannot exceed 160 characters'),
  validate,
];

module.exports = {
  registerValidation,
  loginValidation,
  updatePasswordValidation,
  createLinkValidation,
  updateLinkValidation,
  reorderLinksValidation,
  updateProfileValidation,
};
