///Applications/Works/oldsocks main/oldsocks/backend/models/BlogCategory.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const BlogCommentSchema = new Schema(
  {
    blog: {
      type: Schema.Types.ObjectId,
      ref: "Blog",
      required: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: { type: String, required: true, trim: true, minlength: 2, maxlength: 1000 },
    replies: [
      {
        type: Schema.Types.ObjectId,
        ref: "BlogCommentReply",
      },
    ],
    approved: { type: Boolean, default: false },
    seen: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("BlogComment", BlogCommentSchema);
