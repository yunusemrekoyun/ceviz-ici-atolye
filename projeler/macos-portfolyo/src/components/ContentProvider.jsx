import React, { createContext, useContext, useMemo } from "react";

import { assets, locations as baseLocations, photosLinks } from "#constants";

const ContentContext = createContext(null);

const safeNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const PROJECT_FILE_TYPES = {
  text: { fileType: "txt", icon: "/images/txt.png" },
  link: { fileType: "url", icon: "/images/safari.png" },
  image: { fileType: "img", icon: "/images/image.png" },
  video: { fileType: "video", icon: "/images/video.svg" },
};

const buildProjectFile = (item) => {
  const meta = PROJECT_FILE_TYPES[item?.type] ?? PROJECT_FILE_TYPES.text;

  return {
    id: item?.id,
    name: item?.name,
    icon: meta.icon,
    kind: "file",
    fileType: meta.fileType,
    position: item?.position,
    description: item?.description,
    subtitle: item?.subtitle,
    image: item?.image,
    imageUrl: item?.imageUrl,
    videoUrl: item?.videoUrl || item?.href,
    posterUrl: item?.posterUrl,
    href: item?.href,
  };
};

const buildProjectFolder = (project) => ({
  id: project?.id,
  name: project?.name,
  icon: assets.images.folder,
  kind: "folder",
  position: project?.finderPosition,
  windowPosition: project?.desktopPosition,
  showOnDesktop: project?.showOnDesktop ?? true,
  showInFiles: project?.showInFiles ?? true,
  children: Array.isArray(project?.items) ? project.items.map(buildProjectFile) : [],
});

const buildProjectGroupFolder = (folder, projects) => ({
  id: folder?.id,
  name: folder?.name || "Project Folder",
  icon: assets.images.folder,
  kind: "folder",
  position: folder?.finderPosition ?? "top-10 left-10",
  windowPosition: folder?.desktopPosition ?? "top-16 left-10",
  showOnDesktop: folder?.showOnDesktop ?? true,
  showInFiles: folder?.showInFiles ?? true,
  children: (Array.isArray(projects) ? projects : []).map(buildProjectFolder),
});

const buildLocations = (projects, projectFolders) => {
  const list = Array.isArray(projects) ? projects : [];
  const folders = Array.isArray(projectFolders) ? projectFolders : [];
  const folderMap = new Map(folders.map((folder) => [folder.id, folder]));
  const grouped = new Map();
  const ungrouped = [];

  list.forEach((project) => {
    const folderId = safeNumber(project?.folderId);
    if (folderId != null && folderMap.has(folderId)) {
      if (!grouped.has(folderId)) grouped.set(folderId, []);
      grouped.get(folderId).push(project);
      return;
    }
    ungrouped.push(project);
  });

  const folderNodes = folders.map((folder) =>
    buildProjectGroupFolder(folder, grouped.get(folder.id) ?? [])
  );
  const projectNodes = ungrouped.map(buildProjectFolder);

  const work = {
    ...baseLocations.work,
    children: [...folderNodes, ...projectNodes],
  };

  return {
    ...baseLocations,
    work,
  };
};

const findFolderById = (locations, id) => {
  const needle = safeNumber(id);
  if (needle == null) return null;

  let match = null;

  const traverse = (node) => {
    if (!node || match) return;
    if (node.id === needle && node.kind === "folder") {
      match = node;
      return;
    }

    if (Array.isArray(node.children)) {
      node.children.forEach((child) => {
        if (child?.kind === "folder") traverse(child);
      });
    }
  };

  Object.values(locations ?? {}).forEach(traverse);
  return match;
};

const normalizePhotoLibraryItems = (items) =>
  Array.isArray(items)
    ? items
        .map((item, idx) => {
          const id = safeNumber(item?.id) ?? idx + 1;
          const type = item?.type === "video" ? "video" : "image";
          const src = String(item?.src ?? "").trim();
          const thumb = String(item?.thumb ?? "").trim();
          const albumId = safeNumber(item?.albumId) ?? 1;

          return {
            id,
            type,
            src,
            img: type === "video" ? thumb : thumb || src,
            albumId,
          };
        })
        .filter((item) => item.id != null && item.img)
    : [];

const buildPhotoSections = (items) => {
  const list = Array.isArray(items) ? items : [];
  const sections = {};

  const allAlbumId = photosLinks?.[0]?.id ?? 1;
  sections[allAlbumId] = list;

  (Array.isArray(photosLinks) ? photosLinks : []).forEach((album) => {
    if (!album?.id || album.id === allAlbumId) return;
    const filtered = list.filter((item) => item.albumId === album.id);
    if (filtered.length) {
      sections[album.id] = filtered;
    }
  });

  return sections;
};

const filterLocationsForFiles = (nodes) => {
  const list = Array.isArray(nodes) ? nodes : [];
  return list
    .map((node) => {
      if (!node || node.kind !== "folder") return node;
      if (node.showInFiles === false) return null;
      const nextChildren = Array.isArray(node.children)
        ? filterLocationsForFiles(node.children)
        : [];
      return { ...node, children: nextChildren };
    })
    .filter(Boolean);
};

export function ContentProvider({
  projects,
  projectFolders = [],
  photosLibraryItems = [],
  children,
}) {
  const locations = useMemo(
    () => buildLocations(projects, projectFolders),
    [projects, projectFolders]
  );
  const photosGallery = useMemo(
    () => normalizePhotoLibraryItems(photosLibraryItems),
    [photosLibraryItems]
  );
  const photosSections = useMemo(
    () => buildPhotoSections(photosGallery),
    [photosGallery]
  );

  const desktopProjects = useMemo(() => {
    const list = locations.work?.children ?? [];
    return list.filter((project) => project?.showOnDesktop !== false);
  }, [locations.work]);

  const phoneLocations = useMemo(() => {
    const workChildren = filterLocationsForFiles(locations.work?.children ?? []);
    return {
      ...locations,
      work: {
        ...locations.work,
        children: workChildren,
      },
    };
  }, [locations]);

  const value = useMemo(
    () => ({
      projects,
      projectFolders,
      locations,
      desktopProjects,
      phoneLocations,
      photosGallery,
      photosSections,
      findFolderLocationById: (id, { scope = "desktop" } = {}) => {
        const sourceLocations = scope === "phone" ? phoneLocations : locations;
        return findFolderById(sourceLocations, id);
      },
    }),
    [
      desktopProjects,
      locations,
      phoneLocations,
      photosGallery,
      photosSections,
      projectFolders,
      projects,
    ]
  );

  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}

export function useContent() {
  const ctx = useContext(ContentContext);
  if (!ctx) {
    throw new Error("useContent must be used within <ContentProvider />");
  }
  return ctx;
}
