import mongoose from "mongoose";

const { Schema } = mongoose;

const ResumeConfigSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    url: { type: String, default: "" },
    publicId: { type: String, default: "" },
    fileName: { type: String, default: "" },
    bytes: { type: Number, default: 0 },
    updatedAtMs: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const ResumeConfig =
  mongoose.models.ResumeConfig ||
  mongoose.model("ResumeConfig", ResumeConfigSchema);

export default ResumeConfig;

