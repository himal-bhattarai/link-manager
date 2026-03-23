const mongoose = require('mongoose');

const clickEventSchema = new mongoose.Schema(
  {
    ip: String,
    userAgent: String,
    referrer: String,
    country: String,
    clickedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const linkSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Link title is required'],
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
    },
    url: {
      type: String,
      required: [true, 'URL is required'],
      trim: true,
      match: [
        /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)$/,
        'Please provide a valid URL (must start with http:// or https://)',
      ],
    },
    order: {
      type: Number,
      default: 0,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    thumbnail: {
      type: String,
      default: '',
    },
    clickCount: {
      type: Number,
      default: 0,
    },
    // Store last 500 click events (rolling window)
    clickEvents: {
      type: [clickEventSchema],
      default: [],
      select: false, // Don't return by default
    },
  },
  {
    timestamps: true,
  }
);

// Index for fast public profile queries
linkSchema.index({ userId: 1, order: 1 });
linkSchema.index({ userId: 1, isActive: 1 });

// Instance method: record a click
linkSchema.methods.recordClick = async function (req) {
  this.clickCount += 1;

  const event = {
    ip: req.ip,
    userAgent: req.headers['user-agent'] || '',
    referrer: req.headers['referer'] || '',
    clickedAt: new Date(),
  };

  // Keep last 500 events only
  if (this.clickEvents.length >= 500) {
    this.clickEvents.shift();
  }
  this.clickEvents.push(event);

  await this.save();
};

const Link = mongoose.model('Link', linkSchema);
module.exports = Link;
