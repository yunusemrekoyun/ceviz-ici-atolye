import mongoose from "mongoose";

const { Schema } = mongoose;

const ProjectItemSchema = new Schema(
  {
    id: { type: Number, required: true },
    type: { type: String, default: "text" },
    name: { type: String, default: "" },
    position: { type: String, default: "top-10 left-10" },
    description: { type: [String], default: [] },
    href: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
    videoUrl: { type: String, default: "" },
    posterUrl: { type: String, default: "" },
  },
  { _id: false }
);

const ProjectSchema = new Schema(
  {
    id: { type: Number, required: true },
    folderId: { type: Number, default: null },
    name: { type: String, default: "" },
    type: { type: String, default: "" },
    status: { type: String, default: "draft" },
    stack: { type: String, default: "" },
    finderPosition: { type: String, default: "top-10 left-5" },
    desktopPosition: { type: String, default: "top-[10vh] left-5" },
    showOnDesktop: { type: Boolean, default: true },
    showInFiles: { type: Boolean, default: true },
    items: { type: [ProjectItemSchema], default: [] },
  },
  { _id: false }
);

const ProjectFolderSchema = new Schema(
  {
    id: { type: Number, required: true },
    name: { type: String, default: "" },
    finderPosition: { type: String, default: "top-10 left-10" },
    desktopPosition: { type: String, default: "top-16 left-10" },
    showOnDesktop: { type: Boolean, default: true },
    showInFiles: { type: Boolean, default: true },
  },
  { _id: false }
);

const ProjectsConfigSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    projects: { type: [ProjectSchema], default: [] },
    projectFolders: { type: [ProjectFolderSchema], default: [] },
  },
  { timestamps: true }
);

const ProjectsConfig =
  mongoose.models.ProjectsConfig ||
  mongoose.model("ProjectsConfig", ProjectsConfigSchema);

export default ProjectsConfig;
