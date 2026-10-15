import mongoose from "mongoose";

const { Schema } = mongoose;

const BlogPostSchema = new Schema(
  {
    id: { type: Number, required: true },
    title: { type: String, default: "" },
    summary: { type: String, default: "" },
    content: { type: String, default: "" },
    date: { type: String, default: "" },
    link: { type: String, default: "" },
    status: { type: String, default: "live" },
    image: { type: String, default: "" },
    imagePublicId: { type: String, default: "" },
    imageFormat: { type: String, default: "" },
    imageWidth: { type: Number, default: 0 },
    imageHeight: { type: Number, default: 0 },
    imageBytes: { type: Number, default: 0 },
    createdAt: { type: Number, default: 0 },
    updatedAt: { type: Number, default: 0 },
  },
  { _id: false }
);

const BlogsConfigSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    posts: { type: [BlogPostSchema], default: [] },
  },
  { timestamps: true }
);

const BlogsConfig =
  mongoose.models.BlogsConfig || mongoose.model("BlogsConfig", BlogsConfigSchema);

export default BlogsConfig;
