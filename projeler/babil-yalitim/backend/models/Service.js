// backend/models/Service.js
const mongoose = require("mongoose");
const mediaSchema = require("./schemas/mediaSchema");

const serviceTranslationSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, default: "" },
    type: { type: String, trim: true, default: "" },
    category: { type: String, trim: true, default: "" },
    usageAreas: { type: [String], default: [] },
    description: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const subServiceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    displayOrder: { type: Number, default: 1, min: 1 },
    type: { type: String, default: "", trim: true },
    category: { type: String, default: "", trim: true },
    usageAreas: { type: [String], default: [] },
    description: { type: String, required: true, trim: true },
    cover: { type: mediaSchema, required: true },
    images: { type: [mediaSchema], default: [] },
    translations: {
      en: { type: serviceTranslationSchema, default: () => ({}) },
    },
  },
  { _id: true }
);

const serviceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    displayOrder: { type: Number, default: 1, min: 1 },
    type: { type: String, default: "" },
    category: { type: String, default: "" },
    usageAreas: { type: [String], default: [] },
    description: { type: String, required: true },

    cover: { type: mediaSchema, required: true }, // artık image | video
    images: { type: [mediaSchema], default: [] }, // image | video karışık
    subServices: { type: [subServiceSchema], default: [] },
    translations: {
      en: { type: serviceTranslationSchema, default: () => ({}) },
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Service || mongoose.model("Service", serviceSchema);
