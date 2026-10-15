const mongoose = require("mongoose");

const NewsletterSubscriberSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },
    // istersen ileride double-opt-in eklemek için:
    verifiedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "NewsletterSubscriber",
  NewsletterSubscriberSchema
);
