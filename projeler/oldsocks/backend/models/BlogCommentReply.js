///Applications/Works/oldsocks main/oldsocks/backend/models/BlogComment.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const BlogCommentReplySchema = new Schema(
  {
    comment: {
      type: Schema.Types.ObjectId,
      ref: "BlogComment",
      required: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: { type: String, required: true, trim: true, minlength: 2, maxlength: 1000 },
    approved: { type: Boolean, default: false },
    seen: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("BlogCommentReply", BlogCommentReplySchema);
