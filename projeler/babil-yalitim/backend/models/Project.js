const mongoose = require("mongoose");
const mediaSchema = require("./schemas/mediaSchema");

const projectTranslationSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, default: "" },
    description: { type: String, default: "" },
    category: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const projectSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    displayOrder: { type: Number, default: 1, min: 1 },
    description: String,
    category: String,

    cover: { type: mediaSchema, required: true },
    video: { type: mediaSchema },
    images: { type: [mediaSchema], default: [] },

    // 🆕 Tarih alanları (opsiyonel)
    startDate: { type: Date },
    endDate: { type: Date },
    completedAt: { type: Date },
    translations: {
      en: { type: projectTranslationSchema, default: () => ({}) },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

projectSchema.pre("validate", function (next) {
  if (this.startDate && this.endDate && this.endDate < this.startDate) {
    return next(new Error("Bitiş tarihi, başlangıç tarihinden önce olamaz."));
  }
  next();
});

projectSchema.virtual("durationDays").get(function () {
  if (this.startDate && this.endDate) {
    const ms = this.endDate - this.startDate;
    return Math.round(ms / (1000 * 60 * 60 * 24));
  }
});

projectSchema.index({ completedAt: -1 });

module.exports =
  mongoose.models.Project || mongoose.model("Project", projectSchema);
