import mongoose from "mongoose";

const { Schema } = mongoose;

const PhotoMediaItemSchema = new Schema(
  {
    id: { type: Number, required: true },
    type: { type: String, default: "image" }, // image | video
    src: { type: String, default: "" },
    thumb: { type: String, default: "" },
    publicId: { type: String, default: "" },
    format: { type: String, default: "" },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
    duration: { type: Number, default: 0 },
    bytes: { type: Number, default: 0 },
    albumId: { type: Number, default: 1 },
    createdAt: { type: Number, default: 0 },
  },
  { _id: false }
);

const PhotosLibraryConfigSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    items: { type: [PhotoMediaItemSchema], default: [] },
  },
  { timestamps: true }
);

const PhotosLibraryConfig =
  mongoose.models.PhotosLibraryConfig ||
  mongoose.model("PhotosLibraryConfig", PhotosLibraryConfigSchema);

export default PhotosLibraryConfig;

