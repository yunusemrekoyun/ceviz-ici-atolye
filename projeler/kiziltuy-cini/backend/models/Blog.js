// models/Blog.js
const mongoose = require("mongoose");
const Counter = require("./Counter");

const BlogSchema = new mongoose.Schema(
  {
    blogId: { type: String, unique: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    images: [
      {
        data: Buffer,
        contentType: String,
      },
    ],
  },
  { timestamps: true }
);

// BLOG000 formatlı ID üret
BlogSchema.pre("save", async function (next) {
  if (this.isNew) {
    const counter = await Counter.findOneAndUpdate(
      { _id: "blog" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.blogId = `BLOG${String(counter.seq - 1).padStart(3, "0")}`;
  }
  next();
});

module.exports = mongoose.model("Blog", BlogSchema);
