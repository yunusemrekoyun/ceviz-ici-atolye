/********************************************************
 * backend/models/Subscriber.js
 * "İndirimlerden haberdar et" bülten aboneleri
 ********************************************************/
const mongoose = require("mongoose");

const SubscriberSchema = mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Subscriber", SubscriberSchema);
