/* eslint-env node */
import connectToDatabase from "@/lib/mongodb.js";
import ProjectsConfig from "@/models/ProjectsConfig.js";
import { projects as defaultProjects } from "#constants";

const PROJECTS_KEY = "main";
const MIN_PROJECT_ID = 5;
const MIN_FOLDER_ID = -1;
const RESERVED_LOCATION_IDS = new Set([1, 2, 3, 4]);
const defaultProjectFolders = [];

const safeString = (value) => String(value ?? "").trim();

const safeNumber = (value, fallback = null) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeLines = (value) => {
  if (Array.isArray(value)) {
    return value.map((line) => safeString(line)).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/\r?\n/)
      .map((line) => safeString(line))
      .filter(Boolean);
  }

  return [];
};

const normalizeItemType = (value) => {
  const type = safeString(value).toLowerCase();
  if (type === "link" || type === "image" || type === "text" || type === "video")
    return type;
  return "text";
};

export const normalizeProjectsPayload = (payload) => {
  const list = Array.isArray(payload) ? payload : [];

  return list
    .map((project, index) => {
      const id = safeNumber(project?.id, index + 1);
      const folderId = safeNumber(project?.folderId, null);

      const items = Array.isArray(project?.items)
        ? project.items
            .map((item, itemIndex) => {
              const type = normalizeItemType(item?.type);
              const itemId = safeNumber(item?.id, itemIndex + 1);
              return {
                id: itemId,
                type,
                name: safeString(item?.name),
                position: safeString(item?.position) || "top-10 left-10",
                description: type === "text" ? normalizeLines(item?.description) : [],
                href: type === "link" ? safeString(item?.href) : safeString(item?.href),
                imageUrl:
                  type === "image" ? safeString(item?.imageUrl) : safeString(item?.imageUrl),
                videoUrl:
                  type === "video" ? safeString(item?.videoUrl) : safeString(item?.videoUrl),
                posterUrl:
                  type === "video" ? safeString(item?.posterUrl) : safeString(item?.posterUrl),
              };
            })
            .filter((item) => item.id != null)
        : [];

      return {
        id,
        folderId,
        name: safeString(project?.name) || `Project ${id}`,
        type: safeString(project?.type),
        status: safeString(project?.status) || "draft",
        stack: safeString(project?.stack),
        finderPosition: safeString(project?.finderPosition) || "top-10 left-5",
        desktopPosition: safeString(project?.desktopPosition) || "top-[10vh] left-5",
        showOnDesktop: project?.showOnDesktop ?? true,
        showInFiles: project?.showInFiles ?? true,
        items,
      };
    })
    .filter((project) => project.id != null);
};

const normalizeProjectFoldersPayload = (payload) => {
  const list = Array.isArray(payload) ? payload : [];

  return list
    .map((folder, index) => {
      const id = safeNumber(folder?.id, null);
      return {
        id,
        name: safeString(folder?.name) || `Folder ${index + 1}`,
        finderPosition: safeString(folder?.finderPosition) || "top-10 left-10",
        desktopPosition: safeString(folder?.desktopPosition) || "top-16 left-10",
        showOnDesktop: folder?.showOnDesktop ?? true,
        showInFiles: folder?.showInFiles ?? true,
      };
    })
    .filter((folder) => folder.id != null);
};

const ensureSafeProjectIds = (projects) => {
  const list = Array.isArray(projects) ? projects : [];
  const used = new Set(RESERVED_LOCATION_IDS);
  let nextCandidate = MIN_PROJECT_ID;

  const allocate = () => {
    while (used.has(nextCandidate)) nextCandidate += 1;
    const id = nextCandidate;
    used.add(id);
    nextCandidate += 1;
    return id;
  };

  return list.map((project) => {
    const numericId = safeNumber(project?.id, null);
    const mustReassign =
      numericId == null ||
      numericId < MIN_PROJECT_ID ||
      RESERVED_LOCATION_IDS.has(numericId) ||
      used.has(numericId);

    if (mustReassign) {
      return { ...project, id: allocate() };
    }

    used.add(numericId);
    return { ...project, id: numericId };
  });
};

const ensureSafeFolderIds = (folders) => {
  const list = Array.isArray(folders) ? folders : [];
  const used = new Set();
  let nextCandidate = MIN_FOLDER_ID;

  const allocate = () => {
    while (used.has(nextCandidate)) nextCandidate -= 1;
    const id = nextCandidate;
    used.add(id);
    nextCandidate -= 1;
    return id;
  };

  return list.map((folder) => {
    const numericId = safeNumber(folder?.id, null);
    const mustReassign =
      numericId == null || numericId >= 0 || used.has(numericId);

    if (mustReassign) {
      return { ...folder, id: allocate() };
    }

    used.add(numericId);
    return { ...folder, id: numericId };
  });
};

const normalizeProjectFolderLinks = (projects, folders) => {
  const folderIds = new Set(
    (Array.isArray(folders) ? folders : []).map((folder) => folder.id)
  );

  return (Array.isArray(projects) ? projects : []).map((project) => {
    const folderId = safeNumber(project?.folderId, null);
    if (folderId == null || !folderIds.has(folderId)) {
      return { ...project, folderId: null };
    }
    return { ...project, folderId };
  });
};

export const getProjects = async ({ seedIfMissing = true } = {}) => {
  const connection = await connectToDatabase();
  if (!connection) {
    return {
      ok: false,
      projects: defaultProjects,
      projectFolders: defaultProjectFolders,
      source: "constants",
    };
  }

  const doc = await ProjectsConfig.findOne({ key: PROJECTS_KEY }).lean();
  if (doc?.projects?.length) {
    const normalized = normalizeProjectsPayload(doc.projects);
    const safeProjects = ensureSafeProjectIds(normalized);
    const normalizedFolders = normalizeProjectFoldersPayload(doc.projectFolders);
    const safeFolders = ensureSafeFolderIds(normalizedFolders);
    const linkedProjects = normalizeProjectFolderLinks(safeProjects, safeFolders);

    const hasChanges =
      JSON.stringify({
        projects: linkedProjects,
        projectFolders: safeFolders,
      }) !==
      JSON.stringify({
        projects: normalized,
        projectFolders: normalizedFolders,
      });
    if (hasChanges) {
      await ProjectsConfig.updateOne(
        { key: PROJECTS_KEY },
        {
          $set: {
            key: PROJECTS_KEY,
            projects: linkedProjects,
            projectFolders: safeFolders,
          },
        }
      );
      return {
        ok: true,
        projects: linkedProjects,
        projectFolders: safeFolders,
        source: "db-migrated",
      };
    }

    return {
      ok: true,
      projects: linkedProjects,
      projectFolders: safeFolders,
      source: "db",
    };
  }

  if (seedIfMissing) {
    await ProjectsConfig.updateOne(
      { key: PROJECTS_KEY },
      {
        $set: {
          key: PROJECTS_KEY,
          projects: defaultProjects,
          projectFolders: defaultProjectFolders,
        },
      },
      { upsert: true }
    );
  }

  return {
    ok: true,
    projects: defaultProjects,
    projectFolders: defaultProjectFolders,
    source: "seed",
  };
};

export const saveProjects = async ({ projects, projectFolders }) => {
  const connection = await connectToDatabase();
  if (!connection) {
    return { ok: false, error: "Database unavailable" };
  }

  const normalizedProjects = ensureSafeProjectIds(normalizeProjectsPayload(projects));
  const normalizedFolders = ensureSafeFolderIds(
    normalizeProjectFoldersPayload(projectFolders)
  );
  const linkedProjects = normalizeProjectFolderLinks(
    normalizedProjects,
    normalizedFolders
  );

  await ProjectsConfig.updateOne(
    { key: PROJECTS_KEY },
    {
      $set: {
        key: PROJECTS_KEY,
        projects: linkedProjects,
        projectFolders: normalizedFolders,
      },
    },
    { upsert: true }
  );

  return {
    ok: true,
    projects: linkedProjects,
    projectFolders: normalizedFolders,
  };
};
