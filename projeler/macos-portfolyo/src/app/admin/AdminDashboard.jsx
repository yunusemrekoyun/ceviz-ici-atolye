"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { normalizeExternalUrl } from "@/utils/externalUrl.js";
import { authFetch } from "@/utils/authFetch.js";

const FILE_TYPE_LABELS = {
  text: "TXT",
  link: "URL",
  image: "IMG",
  video: "VID",
};

const STATUS_LABELS = {
  live: "Live",
  draft: "Draft",
};

const safeNumber = (value, fallback = null) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeProjects = (list) =>
  Array.isArray(list)
    ? list.map((project) => ({
        ...project,
        folderId: safeNumber(project?.folderId, null),
        showOnDesktop: project.showOnDesktop ?? true,
        showInFiles: project.showInFiles ?? true,
        items: Array.isArray(project.items)
          ? project.items.map((item) => ({
              ...item,
              description: Array.isArray(item.description)
                ? item.description.join("\n")
                : item.description ?? "",
              href: item.href ?? "",
              imageUrl: item.imageUrl ?? "",
              videoUrl: item.videoUrl ?? "",
              posterUrl: item.posterUrl ?? "",
              position: item.position ?? "top-10 left-10",
            }))
          : [],
      }))
    : [];

const normalizeFolders = (list) =>
  Array.isArray(list)
    ? list
        .map((folder, index) => ({
          ...folder,
          id: safeNumber(folder?.id, null),
          name: String(folder?.name ?? "").trim() || `Folder ${index + 1}`,
          finderPosition: folder?.finderPosition ?? "top-10 left-10",
          desktopPosition: folder?.desktopPosition ?? "top-16 left-10",
          showOnDesktop: folder?.showOnDesktop ?? true,
          showInFiles: folder?.showInFiles ?? true,
        }))
        .filter((folder) => folder.id != null)
    : [];

const getNextId = (items = [], { min = 1 } = {}) => {
  const maxId = items.reduce((max, item) => {
    const value = Number(item?.id ?? 0);
    return Number.isFinite(value) && value > max ? value : max;
  }, 0);
  return Math.max(min, maxId + 1);
};

const getNextFolderId = (folders = []) => {
  const minId = folders.reduce((min, folder) => {
    const value = safeNumber(folder?.id, 0);
    return value < min ? value : min;
  }, 0);
  return minId <= -1 ? minId - 1 : -1;
};

const createProject = (id) => ({
  id,
  folderId: null,
  name: "New Project",
  type: "MERN",
  status: "draft",
  stack: "",
  finderPosition: "top-10 left-10",
  desktopPosition: "top-16 left-10",
  showOnDesktop: true,
  showInFiles: true,
  items: [],
});

const createProjectFolder = (id, name) => ({
  id,
  name: name || "Project Folder",
  finderPosition: "top-10 left-10",
  desktopPosition: "top-16 left-10",
  showOnDesktop: true,
  showInFiles: true,
});

const AUTO_FILE_POSITIONS = [
  "top-6 left-6",
  "top-6 left-48",
  "top-6 left-[22.5rem]",
  "top-[10rem] left-6",
  "top-[10rem] left-48",
  "top-[10rem] left-[22.5rem]",
  "top-[18rem] left-6",
  "top-[18rem] left-48",
  "top-[18rem] left-[22.5rem]",
  "top-[26rem] left-6",
  "top-[26rem] left-48",
  "top-[26rem] left-[22.5rem]",
  "top-[34rem] left-6",
  "top-[34rem] left-48",
  "top-[34rem] left-[22.5rem]",
  "top-[42rem] left-6",
  "top-[42rem] left-48",
  "top-[42rem] left-[22.5rem]",
  "top-[50rem] left-6",
  "top-[50rem] left-48",
  "top-[50rem] left-[22.5rem]",
  "top-[58rem] left-6",
  "top-[58rem] left-48",
  "top-[58rem] left-[22.5rem]",
];

const normalizePositionToken = (value) =>
  String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");

const getNextAutoFilePosition = (items) => {
  const used = new Set(
    (Array.isArray(items) ? items : [])
      .map((item) => normalizePositionToken(item?.position))
      .filter(Boolean)
  );

  const next = AUTO_FILE_POSITIONS.find((pos) => !used.has(pos));
  return next ?? AUTO_FILE_POSITIONS.at(-1) ?? "top-10 left-10";
};

const AUTO_PROJECT_FINDER_POSITIONS = [
  "top-10 left-10",
  "top-10 left-64",
  "top-10 left-[28rem]",
  "top-52 left-10",
  "top-52 left-64",
  "top-52 left-[28rem]",
  "top-96 left-10",
  "top-96 left-64",
  "top-96 left-[28rem]",
  "top-[34rem] left-10",
  "top-[34rem] left-64",
  "top-[34rem] left-[28rem]",
];

const AUTO_PROJECT_DESKTOP_POSITIONS = [
  "top-16 left-10",
  "top-16 left-72",
  "top-16 left-[30rem]",
  "top-52 left-10",
  "top-52 left-72",
  "top-52 left-[30rem]",
  "top-96 left-10",
  "top-96 left-72",
  "top-96 left-[30rem]",
  "top-[34rem] left-10",
  "top-[34rem] left-72",
  "top-[34rem] left-[30rem]",
];

const getNextAutoProjectPosition = (projects, field, fallback, options) => {
  const used = new Set(
    (Array.isArray(projects) ? projects : [])
      .map((project) => normalizePositionToken(project?.[field]))
      .filter(Boolean)
  );

  const list = Array.isArray(options) ? options : [];
  const next = list.find((pos) => !used.has(pos));
  return next ?? list.at(-1) ?? fallback;
};

const PositionGrid = ({ value, positions, onSelect }) => (
  <div className="admin-position-grid">
    {positions.map((pos, index) => (
      <button
        key={`${pos}-${index}`}
        type="button"
        className={`admin-position-cell${pos === value ? " is-active" : ""}`}
        onClick={() => onSelect(pos)}
        title={pos}
        aria-pressed={pos === value}
      >
        {index + 1}
      </button>
    ))}
  </div>
);

const createFile = (id, type, { position } = {}) => {
  const base = {
    id,
    type,
    position: position ?? "top-10 left-10",
  };

  if (type === "link") {
    return {
      ...base,
      name: "new-link.url",
      href: "",
    };
  }

  if (type === "image") {
    return {
      ...base,
      name: "new-image.png",
      imageUrl: "",
    };
  }

  if (type === "video") {
    return {
      ...base,
      name: "new-video.mp4",
      videoUrl: "",
      posterUrl: "",
    };
  }

  return {
    ...base,
    type: "text",
    name: "New Note.txt",
    description: "",
  };
};

const getStatusLabel = (statusKey) =>
  STATUS_LABELS[statusKey] ?? STATUS_LABELS.draft;

const getItemLabel = (item) => {
  if (!item) return "File";
  if (item.type === "link") return "External link";
  if (item.type === "image") return "Image asset";
  if (item.type === "video") return "Video clip";
  return "Text note";
};

const splitLines = (value) =>
  String(value ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

const serializeProjectsForSave = (list) =>
  Array.isArray(list)
    ? list.map((project) => ({
        id: project.id,
        folderId: safeNumber(project?.folderId, null),
        name: project.name,
        type: project.type,
        status: project.status,
        stack: project.stack,
        finderPosition: project.finderPosition,
        desktopPosition: project.desktopPosition,
        showOnDesktop: project.showOnDesktop ?? true,
        showInFiles: project.showInFiles ?? true,
        items: Array.isArray(project.items)
          ? project.items.map((item) => ({
              id: item.id,
              type: item.type,
              name: item.name,
              position: item.position,
              description: item.type === "text" ? splitLines(item.description) : [],
              href: item.href,
              imageUrl: item.imageUrl,
              videoUrl: item.videoUrl,
              posterUrl: item.posterUrl,
            }))
          : [],
      }))
    : [];

const serializeProjectFoldersForSave = (list) =>
  Array.isArray(list)
    ? list.map((folder) => ({
        id: folder.id,
        name: folder.name,
        finderPosition: folder.finderPosition,
        desktopPosition: folder.desktopPosition,
        showOnDesktop: folder.showOnDesktop ?? true,
        showInFiles: folder.showInFiles ?? true,
      }))
    : [];

export default function AdminDashboard({
  initialProjects,
  initialProjectFolders = [],
  user,
}) {
  const [projectList, setProjectList] = useState(() =>
    normalizeProjects(initialProjects)
  );
  const [folderList, setFolderList] = useState(() =>
    normalizeFolders(initialProjectFolders)
  );
  const [projectQuery, setProjectQuery] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState(() => {
    const normalized = normalizeProjects(initialProjects);
    return normalized[0]?.id ?? null;
  });
  const [selectedFileId, setSelectedFileId] = useState(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [saveState, setSaveState] = useState(() => ({
    status: "idle",
    message: "",
    lastSavedAt: null,
  }));
  const saveTimerRef = useRef(null);
  const saveAbortRef = useRef(null);
  const lastSavedSignatureRef = useRef(null);
  const skipNextAutosaveRef = useRef(true);
  const [imageUploadState, setImageUploadState] = useState(() => ({
    status: "idle",
    message: "",
  }));
  const imageUploadAbortRef = useRef(null);
  const imageUploadInputRef = useRef(null);
  const [videoUploadState, setVideoUploadState] = useState(() => ({
    status: "idle",
    message: "",
  }));
  const videoUploadAbortRef = useRef(null);
  const videoUploadInputRef = useRef(null);

  const selectedProject = useMemo(() => {
    if (selectedProjectId == null) return projectList[0] ?? null;
    return projectList.find((project) => project.id === selectedProjectId) ?? null;
  }, [projectList, selectedProjectId]);

  const selectedFolder = useMemo(() => {
    const folderId = selectedProject?.folderId;
    if (folderId == null) return null;
    return folderList.find((folder) => folder.id === folderId) ?? null;
  }, [folderList, selectedProject]);

  const folderCounts = useMemo(() => {
    const counts = new Map();
    projectList.forEach((project) => {
      const folderId = safeNumber(project?.folderId, null);
      if (folderId == null) return;
      counts.set(folderId, (counts.get(folderId) ?? 0) + 1);
    });
    return counts;
  }, [projectList]);

  const selectedFile = useMemo(() => {
    if (!selectedProject) return null;
    const fallback = selectedProject.items?.[0] ?? null;
    if (!selectedFileId) return fallback;
    return (
      selectedProject.items.find((item) => item.id === selectedFileId) ?? fallback
    );
  }, [selectedProject, selectedFileId]);

  const filteredProjects = useMemo(() => {
    const q = projectQuery.trim().toLowerCase();
    if (!q) return projectList;
    return projectList.filter((project) => {
      const haystack = `${project.name ?? ""} ${project.type ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [projectList, projectQuery]);

  useEffect(() => {
    if (!projectList.length) {
      if (selectedProjectId !== null) setSelectedProjectId(null);
      return;
    }
    const exists = projectList.some((project) => project.id === selectedProjectId);
    if (!exists) {
      setSelectedProjectId(projectList[0].id);
    }
  }, [projectList, selectedProjectId]);

  useEffect(() => {
    if (!selectedProject) {
      if (selectedFileId !== null) setSelectedFileId(null);
      return;
    }
    const exists = selectedProject.items?.some((item) => item.id === selectedFileId);
    if (!exists) {
      setSelectedFileId(selectedProject.items?.[0]?.id ?? null);
    }
  }, [selectedFileId, selectedProject]);

  const runSave = useCallback(async (payload, signature) => {
    if (saveAbortRef.current) {
      saveAbortRef.current.abort();
      saveAbortRef.current = null;
    }

    const controller = new AbortController();
    saveAbortRef.current = controller;

    setSaveState((prev) => ({
      ...prev,
      status: "saving",
      message: "",
    }));

    try {
      const response = await authFetch("/api/projects", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || "Failed to save");
      }

      lastSavedSignatureRef.current = signature;
      setSaveState((prev) => ({
        ...prev,
        status: "saved",
        message: "",
        lastSavedAt: Date.now(),
      }));
    } catch (error) {
      if (error?.name === "AbortError") return;
      setSaveState((prev) => ({
        ...prev,
        status: "error",
        message: error?.message || "Failed to save changes",
      }));
    } finally {
      saveAbortRef.current = null;
    }
  }, []);

  const scheduleSave = useCallback((payload, signature, { immediate = false } = {}) => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }

    if (immediate) {
      runSave(payload, signature);
      return;
    }

    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null;
      runSave(payload, signature);
    }, 650);
  }, [runSave]);

  useEffect(() => {
    const payload = {
      projects: serializeProjectsForSave(projectList),
      projectFolders: serializeProjectFoldersForSave(folderList),
    };
    const signature = JSON.stringify(payload);

    if (lastSavedSignatureRef.current == null) {
      lastSavedSignatureRef.current = signature;
      skipNextAutosaveRef.current = false;
      return;
    }

    if (skipNextAutosaveRef.current) {
      skipNextAutosaveRef.current = false;
      lastSavedSignatureRef.current = signature;
      return;
    }

    if (signature === lastSavedSignatureRef.current) return;
    scheduleSave(payload, signature);
  }, [folderList, projectList, scheduleSave]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (saveAbortRef.current) saveAbortRef.current.abort();
      if (imageUploadAbortRef.current) imageUploadAbortRef.current.abort();
      if (videoUploadAbortRef.current) videoUploadAbortRef.current.abort();
    };
  }, []);

  useEffect(() => {
    if (imageUploadAbortRef.current) {
      imageUploadAbortRef.current.abort();
      imageUploadAbortRef.current = null;
    }

    setImageUploadState({ status: "idle", message: "" });

    if (imageUploadInputRef.current) {
      imageUploadInputRef.current.value = "";
    }

    if (videoUploadAbortRef.current) {
      videoUploadAbortRef.current.abort();
      videoUploadAbortRef.current = null;
    }

    setVideoUploadState({ status: "idle", message: "" });

    if (videoUploadInputRef.current) {
      videoUploadInputRef.current.value = "";
    }
  }, [selectedProjectId, selectedFileId]);

  const handleSelectProject = (projectId) => {
    setSelectedProjectId(projectId);
    const nextProject = projectList.find((project) => project.id === projectId);
    setSelectedFileId(nextProject?.items?.[0]?.id ?? null);
  };

  const updateProjectField = (field, value) => {
    if (!selectedProject) return;
    setProjectList((prev) =>
      prev.map((project) =>
        project.id === selectedProject.id ? { ...project, [field]: value } : project
      )
    );
  };

  const updateFileField = (field, value) => {
    if (!selectedProject || !selectedFile) return;
    setProjectList((prev) =>
      prev.map((project) => {
        if (project.id !== selectedProject.id) return project;
        return {
          ...project,
          items: project.items.map((item) =>
            item.id === selectedFile.id ? { ...item, [field]: value } : item
          ),
        };
      })
    );
  };

  const updateFolderField = (folderId, field, value) => {
    if (folderId == null) return;
    setFolderList((prev) =>
      prev.map((folder) =>
        folder.id === folderId ? { ...folder, [field]: value } : folder
      )
    );
  };

  const parseFolderId = (value) => {
    if (value === "" || value == null) return null;
    return safeNumber(value, null);
  };

  const handleCreateFolder = () => {
    if (!selectedProject) return;
    const name = newFolderName.trim();
    if (!name) return;

    const existing = folderList.find(
      (folder) => folder.name?.trim()?.toLowerCase() === name.toLowerCase()
    );
    if (existing) {
      updateProjectField("folderId", existing.id);
      setNewFolderName("");
      return;
    }

    const nextId = getNextFolderId(folderList);
    const rootProjects = projectList.filter((project) => project.folderId == null);
    const finderPosition = getNextAutoProjectPosition(
      [...rootProjects, ...folderList],
      "finderPosition",
      "top-10 left-10",
      AUTO_PROJECT_FINDER_POSITIONS
    );
    const desktopPosition = getNextAutoProjectPosition(
      [...rootProjects, ...folderList],
      "desktopPosition",
      "top-16 left-10",
      AUTO_PROJECT_DESKTOP_POSITIONS
    );

    const newFolder = {
      ...createProjectFolder(nextId, name),
      finderPosition,
      desktopPosition,
    };
    setFolderList((prev) => [...prev, newFolder]);
    updateProjectField("folderId", newFolder.id);
    setNewFolderName("");
  };

  const handleDeleteFolder = (folderId) => {
    const target = folderList.find((folder) => folder.id === folderId);
    if (!target) return;
    const count = folderCounts.get(folderId) ?? 0;
    const message = count
      ? `Delete "${target.name}"? ${count} project(s) will move to desktop.`
      : `Delete "${target.name}"?`;
    if (!window.confirm(message)) return;

    setFolderList((prev) => prev.filter((folder) => folder.id !== folderId));
    setProjectList((prev) =>
      prev.map((project) =>
        project.folderId === folderId ? { ...project, folderId: null } : project
      )
    );
  };

  const handleAddProject = () => {
    const nextId = getNextId(projectList, { min: 5 });
    const finderPosition = getNextAutoProjectPosition(
      projectList,
      "finderPosition",
      "top-10 left-10",
      AUTO_PROJECT_FINDER_POSITIONS
    );
    const desktopPosition = getNextAutoProjectPosition(
      projectList,
      "desktopPosition",
      "top-16 left-10",
      AUTO_PROJECT_DESKTOP_POSITIONS
    );

    const newProject = {
      ...createProject(nextId),
      finderPosition,
      desktopPosition,
    };
    const nextProjects = [...projectList, newProject];
    setProjectList(nextProjects);
    setSelectedProjectId(newProject.id);
    setSelectedFileId(null);
  };

  const handleDuplicateProject = () => {
    if (!selectedProject) return;
    const nextId = getNextId(projectList, { min: 5 });
    const finderPosition = getNextAutoProjectPosition(
      projectList,
      "finderPosition",
      selectedProject.finderPosition ?? "top-10 left-10",
      AUTO_PROJECT_FINDER_POSITIONS
    );
	    const desktopPosition = getNextAutoProjectPosition(
	      projectList,
	      "desktopPosition",
	      selectedProject.desktopPosition ?? "top-16 left-10",
	      AUTO_PROJECT_DESKTOP_POSITIONS
	    );

    let nextItemId = getNextId(selectedProject.items);
    const duplicated = {
      ...selectedProject,
      id: nextId,
      name: `${selectedProject.name} Copy`,
      finderPosition,
      desktopPosition,
      items: selectedProject.items.map((item) => ({
        ...item,
        id: nextItemId++,
      })),
    };
    const nextProjects = [...projectList, duplicated];
    setProjectList(nextProjects);
    setSelectedProjectId(duplicated.id);
    setSelectedFileId(duplicated.items?.[0]?.id ?? null);
  };

  const handleDeleteProject = () => {
    if (!selectedProject) return;
    if (!window.confirm("Delete this project?")) return;
    const nextProjects = projectList.filter(
      (project) => project.id !== selectedProject.id
    );
    setProjectList(nextProjects);
    setSelectedProjectId(nextProjects[0]?.id ?? null);
    setSelectedFileId(nextProjects[0]?.items?.[0]?.id ?? null);
  };

  const handleAddFile = (type) => {
    if (!selectedProject) return;
    const nextId = getNextId(selectedProject.items);
    const position = getNextAutoFilePosition(selectedProject.items);
    const newItem = createFile(nextId, type, { position });
    setProjectList((prev) =>
      prev.map((project) =>
        project.id === selectedProject.id
          ? { ...project, items: [...project.items, newItem] }
          : project
      )
    );
    setSelectedFileId(newItem.id);
  };

  const handleRemoveFile = (itemId) => {
    if (!selectedProject) return;
    const nextItems = selectedProject.items.filter((item) => item.id !== itemId);
    setProjectList((prev) =>
      prev.map((project) =>
        project.id === selectedProject.id ? { ...project, items: nextItems } : project
      )
    );
    if (selectedFileId === itemId) {
      setSelectedFileId(nextItems[0]?.id ?? null);
    }
  };

  const openLink = (href) => {
    const url = normalizeExternalUrl(href);
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleUploadImage = async (file) => {
    if (!selectedProject || !selectedFile || selectedFile.type !== "image") return;
    if (!file) return;

    const projectId = selectedProject.id;
    const fileId = selectedFile.id;

    if (imageUploadAbortRef.current) {
      imageUploadAbortRef.current.abort();
      imageUploadAbortRef.current = null;
    }

    const controller = new AbortController();
    imageUploadAbortRef.current = controller;

    setImageUploadState({ status: "uploading", message: "" });

    try {
      const body = new FormData();
      body.append("file", file);
      body.append("folder", "projects");

      const response = await authFetch("/api/media/upload", {
        method: "POST",
        body,
        signal: controller.signal,
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok || !data?.asset?.url) {
        throw new Error(data?.error || "Upload failed");
      }

      const uploadedUrl = data.asset.url;

      setProjectList((prev) =>
        prev.map((project) => {
          if (project.id !== projectId) return project;
          return {
            ...project,
            items: project.items.map((item) =>
              item.id === fileId ? { ...item, imageUrl: uploadedUrl } : item
            ),
          };
        })
      );

      setImageUploadState({ status: "done", message: "" });
    } catch (error) {
      if (error?.name === "AbortError") return;
      setImageUploadState({
        status: "error",
        message: error?.message || "Upload failed",
      });
    } finally {
      imageUploadAbortRef.current = null;
    }
  };

  const handleImageInputChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";
    handleUploadImage(file);
  };

  const handleUploadVideo = async (file) => {
    if (!selectedProject || !selectedFile || selectedFile.type !== "video") return;
    if (!file) return;

    const projectId = selectedProject.id;
    const fileId = selectedFile.id;

    if (videoUploadAbortRef.current) {
      videoUploadAbortRef.current.abort();
      videoUploadAbortRef.current = null;
    }

    const controller = new AbortController();
    videoUploadAbortRef.current = controller;

    setVideoUploadState({ status: "uploading", message: "" });

    try {
      const body = new FormData();
      body.append("file", file);
      body.append("folder", "projects");

      const response = await authFetch("/api/media/upload", {
        method: "POST",
        body,
        signal: controller.signal,
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok || !data?.asset?.url) {
        throw new Error(data?.error || "Upload failed");
      }

      const asset = data.asset;

      setProjectList((prev) =>
        prev.map((project) => {
          if (project.id !== projectId) return project;
          return {
            ...project,
            items: project.items.map((item) =>
              item.id === fileId
                ? {
                    ...item,
                    videoUrl: asset.url,
                    posterUrl: asset.posterUrl ?? item.posterUrl ?? "",
                    href: asset.url,
                  }
                : item
            ),
          };
        })
      );

      setVideoUploadState({ status: "done", message: "" });
    } catch (error) {
      if (error?.name === "AbortError") return;
      setVideoUploadState({
        status: "error",
        message: error?.message || "Upload failed",
      });
    } finally {
      videoUploadAbortRef.current = null;
    }
  };

  const handleVideoInputChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = "";
    handleUploadVideo(file);
  };

  const handleManualSave = () => {
    const payload = {
      projects: serializeProjectsForSave(projectList),
      projectFolders: serializeProjectFoldersForSave(folderList),
    };
    const signature = JSON.stringify(payload);
    scheduleSave(payload, signature, { immediate: true });
  };

  const handleAutoProjectPosition = (field, positions) => {
    const fallback = positions?.[0] ?? "top-10 left-10";
    const next = getNextAutoProjectPosition(projectList, field, fallback, positions);
    updateProjectField(field, next);
  };

  const handleAutoFolderPosition = (field, positions) => {
    if (!selectedFolder) return;
    const fallback = positions?.[0] ?? "top-10 left-10";
    const rootProjects = projectList.filter((project) => project.folderId == null);
    const next = getNextAutoProjectPosition(
      [...rootProjects, ...folderList],
      field,
      fallback,
      positions
    );
    updateFolderField(selectedFolder.id, field, next);
  };

  const handleAutoFilePosition = () => {
    if (!selectedProject) return;
    const next = getNextAutoFilePosition(selectedProject.items);
    updateFileField("position", next);
  };

  return (
    <main className="admin-canvas">
      <header className="admin-topbar">
        <div className="admin-topbar-brand">
          <div className="admin-logo">OS</div>
          <div>
            <p className="admin-brand-title">Portfolio OS</p>
            <p className="admin-brand-subtitle">Admin</p>
          </div>
        </div>

        <div className="admin-topbar-actions">
          <div className="admin-sync">
            <span
              className={`admin-sync-pill is-${saveState.status}`}
              title={saveState.message || ""}
            >
              {saveState.status === "saving"
                ? "Saving…"
                : saveState.status === "saved"
                  ? "Saved"
                  : saveState.status === "error"
                    ? "Save failed"
                    : "Up to date"}
            </span>
            <button
              className="admin-button ghost"
              type="button"
              onClick={handleManualSave}
              disabled={saveState.status === "saving"}
            >
              Save
            </button>
            <a className="admin-button ghost" href="/admin/media">
              Photos
            </a>
            <a className="admin-button ghost" href="/admin/blogs">
              Blogs
            </a>
          </div>

          <div className="admin-user">
            <div className="admin-user-avatar">
              {user?.username?.slice(0, 2).toUpperCase() ?? "AD"}
            </div>
            <div>
              <p className="admin-user-name">{user?.username ?? "admin"}</p>
              <p className="admin-user-meta">
                {user?.email ?? "admin@portfolio.local"}
              </p>
            </div>
          </div>

          <form action="/api/auth/logout" method="post">
            <button className="admin-button ghost" type="submit">
              Log out
            </button>
          </form>
        </div>
      </header>

      <div className="admin-body">
        <aside className="admin-sidebar">
          <div className="admin-sidebar-header">
            <div>
              <h2 className="admin-sidebar-title">Projects</h2>
              <p className="admin-sidebar-subtitle">Finder + iOS Files</p>
            </div>
            <button
              className="admin-button ghost small"
              type="button"
              onClick={handleAddProject}
            >
              New
            </button>
          </div>

          <div className="admin-sidebar-search">
            <input
              className="admin-input"
              type="text"
              value={projectQuery}
              onChange={(event) => setProjectQuery(event.target.value)}
              placeholder="Search projects…"
            />
          </div>

          <div className="admin-project-list" role="listbox" aria-label="Projects">
            {filteredProjects.length ? (
              filteredProjects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  className={`admin-project-row ${
                    project.id === selectedProject?.id ? "is-active" : ""
                  }`}
                  onClick={() => handleSelectProject(project.id)}
                  role="option"
                  aria-selected={project.id === selectedProject?.id}
                >
                  <span className="admin-project-row-main">
                    <span
                      className={`admin-status-dot ${
                        project.status === "live" ? "is-live" : "is-draft"
                      }`}
                    />
                    <span className="admin-project-title">{project.name}</span>
                  </span>
                  <span className="admin-project-row-meta">
                    <span className="admin-pill">
                      {project.type ? project.type : "Project"}
                    </span>
                    <span className="admin-project-meta">
                      {project.items?.length ?? 0} items
                    </span>
                  </span>
                </button>
              ))
            ) : (
              <div className="admin-empty">
                <p className="admin-empty-title">No projects</p>
                <p className="admin-empty-subtitle">
                  Create your first project to populate Finder + iOS Files.
                </p>
                <button className="admin-button" type="button" onClick={handleAddProject}>
                  Create project
                </button>
              </div>
            )}
          </div>

          <div className="admin-sidebar-footer">
            <p className="admin-note">
              Tip: changes auto-save. Use “Show in Files” to control iOS visibility.
            </p>
          </div>
        </aside>

        <section className="admin-main">
          {selectedProject ? (
            <>
              <div className="admin-main-header">
                <div className="admin-main-title">
                  <h2 className="admin-main-name">{selectedProject.name}</h2>
                  <span
                    className={`admin-badge ${
                      selectedProject?.status === "live" ? "is-live" : "is-draft"
                    }`}
                  >
                    {getStatusLabel(selectedProject?.status)}
                  </span>
                </div>
                <div className="admin-inline-actions">
                  <button
                    className="admin-button ghost small"
                    type="button"
                    onClick={handleDuplicateProject}
                    disabled={!selectedProject}
                  >
                    Duplicate
                  </button>
                  <button
                    className="admin-button ghost small danger"
                    type="button"
                    onClick={handleDeleteProject}
                    disabled={!selectedProject}
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="admin-main-content">
                <div className="admin-card">
                  <div className="admin-card-header">
                    <div>
                      <h3 className="admin-card-title">Project settings</h3>
                      <p className="admin-card-subtitle">
                        Controls name, stack, and where the folder appears.
                      </p>
                    </div>
                  </div>

                  <div className="admin-form-grid">
                    <label className="admin-field">
                      <span>Name</span>
                      <input
                        className="admin-input"
                        type="text"
                        value={selectedProject.name ?? ""}
                        onChange={(event) =>
                          updateProjectField("name", event.target.value)
                        }
                      />
                    </label>
                    <label className="admin-field">
                      <span>Type</span>
                      <input
                        className="admin-input"
                        type="text"
                        value={selectedProject.type ?? ""}
                        onChange={(event) =>
                          updateProjectField("type", event.target.value)
                        }
                      />
                    </label>
                    <label className="admin-field">
                      <span>Stack</span>
                      <input
                        className="admin-input"
                        type="text"
                        value={selectedProject.stack ?? ""}
                        onChange={(event) =>
                          updateProjectField("stack", event.target.value)
                        }
                      />
                    </label>
                    <label className="admin-field">
                      <span>Status</span>
                      <select
                        className="admin-select"
                        value={selectedProject.status ?? "draft"}
                        onChange={(event) =>
                          updateProjectField("status", event.target.value)
                        }
                      >
                        <option value="draft">Draft</option>
                        <option value="live">Live</option>
                      </select>
                    </label>
                  </div>

                  <div className="admin-divider" />

                  <div className="admin-toggle-list">
                    <div className="admin-toggle-row">
                      <div>
                        <p className="admin-toggle-label">Show on desktop</p>
                        <p className="admin-toggle-desc">
                          Adds a folder icon to the macOS desktop.
                        </p>
                      </div>
                      <button
                        className={`admin-toggle ${
                          selectedProject?.showOnDesktop ? "is-on" : ""
                        }`}
                        type="button"
                        onClick={() =>
                          updateProjectField(
                            "showOnDesktop",
                            !selectedProject?.showOnDesktop
                          )
                        }
                      >
                        <span className="admin-toggle-knob" />
                      </button>
                    </div>
                    <div className="admin-toggle-row">
                      <div>
                        <p className="admin-toggle-label">Show in Files</p>
                        <p className="admin-toggle-desc">
                          Visible under Projects on iOS.
                        </p>
                      </div>
                      <button
                        className={`admin-toggle ${
                          selectedProject?.showInFiles ? "is-on" : ""
                        }`}
                        type="button"
                        onClick={() =>
                          updateProjectField(
                            "showInFiles",
                            !selectedProject?.showInFiles
                          )
                        }
                      >
                        <span className="admin-toggle-knob" />
                      </button>
                    </div>
                  </div>

                  <div className="admin-divider" />

                  <div className="admin-form-grid">
                    <label className="admin-field admin-field--span">
                      <span>Project folder</span>
                      <select
                        className="admin-select"
                        value={
                          selectedProject?.folderId == null
                            ? ""
                            : String(selectedProject.folderId)
                        }
                        onChange={(event) =>
                          updateProjectField(
                            "folderId",
                            parseFolderId(event.target.value)
                          )
                        }
                      >
                        <option value="">No folder (show on desktop)</option>
                        {folderList.map((folder) => (
                          <option key={folder.id} value={String(folder.id)}>
                            {folder.name}
                          </option>
                        ))}
                      </select>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <input
                          className="admin-input mt-0 flex-1 min-w-[220px]"
                          type="text"
                          placeholder="New folder name"
                          value={newFolderName}
                          onChange={(event) => setNewFolderName(event.target.value)}
                        />
                        <button
                          className="admin-button"
                          type="button"
                          onClick={handleCreateFolder}
                          disabled={!newFolderName.trim()}
                        >
                          Create & assign
                        </button>
                      </div>
                      {selectedProject?.folderId != null ? (
                        <p className="mt-2 text-xs text-slate-500">
                          This project will appear inside its folder on the desktop.
                        </p>
                      ) : null}
                    </label>
                  </div>

                  <div className="admin-form-grid">
                    <div className="admin-field">
                      <span>Finder position</span>
                      <div className="admin-position-picker">
                        <PositionGrid
                          value={selectedProject?.finderPosition ?? ""}
                          positions={AUTO_PROJECT_FINDER_POSITIONS}
                          onSelect={(pos) => updateProjectField("finderPosition", pos)}
                        />
                        <div className="admin-position-actions">
                          <button
                            className="admin-button ghost small"
                            type="button"
                            onClick={() =>
                              handleAutoProjectPosition(
                                "finderPosition",
                                AUTO_PROJECT_FINDER_POSITIONS
                              )
                            }
                          >
                            Auto place
                          </button>
                          <span className="admin-position-hint">
                            Click a square to place the icon.
                          </span>
                        </div>
                      </div>
                      <input
                        className="admin-input"
                        type="text"
                        value={selectedProject?.finderPosition ?? ""}
                        onChange={(event) =>
                          updateProjectField("finderPosition", event.target.value)
                        }
                      />
                    </div>
                    <div className="admin-field">
                      <span>Desktop position</span>
                      <div className="admin-position-picker">
                        <PositionGrid
                          value={selectedProject?.desktopPosition ?? ""}
                          positions={AUTO_PROJECT_DESKTOP_POSITIONS}
                          onSelect={(pos) => updateProjectField("desktopPosition", pos)}
                        />
                        <div className="admin-position-actions">
                          <button
                            className="admin-button ghost small"
                            type="button"
                            onClick={() =>
                              handleAutoProjectPosition(
                                "desktopPosition",
                                AUTO_PROJECT_DESKTOP_POSITIONS
                              )
                            }
                          >
                            Auto place
                          </button>
                          <span className="admin-position-hint">
                            Matches macOS desktop grid.
                          </span>
                        </div>
                      </div>
                      <input
                        className="admin-input"
                        type="text"
                        value={selectedProject?.desktopPosition ?? ""}
                        onChange={(event) =>
                          updateProjectField("desktopPosition", event.target.value)
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="admin-card">
                  <div className="admin-card-header">
                    <div>
                      <h3 className="admin-card-title">Project folders</h3>
                      <p className="admin-card-subtitle">
                        Rename or remove folders created for desktop grouping.
                      </p>
                    </div>
                  </div>

                  {folderList.length ? (
                    <div className="admin-file-list">
                      {folderList.map((folder) => (
                        <div key={folder.id} className="admin-file-row admin-folder-row">
                          <div className="min-w-0 flex-1">
                            <input
                              className="admin-input mt-0"
                              type="text"
                              value={folder.name ?? ""}
                              onChange={(event) =>
                                updateFolderField(
                                  folder.id,
                                  "name",
                                  event.target.value
                                )
                              }
                            />
                            <p className="admin-file-meta">
                              {(folderCounts.get(folder.id) ?? 0)} project(s)
                            </p>
                          </div>
                          <div className="admin-file-actions-inline">
                            <button
                              className="admin-button ghost small danger"
                              type="button"
                              onClick={() => handleDeleteFolder(folder.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="admin-empty-inline">
                      No folders yet. Create one from a project.
                    </p>
                  )}
                </div>

                {selectedFolder ? (
                  <div className="admin-card">
                    <div className="admin-card-header">
                      <div>
                        <h3 className="admin-card-title">Folder settings</h3>
                        <p className="admin-card-subtitle">
                          Shared placement for the folder on Finder + desktop.
                        </p>
                      </div>
                    </div>

                    <div className="admin-form-grid">
                      <label className="admin-field admin-field--span">
                        <span>Folder name</span>
                        <input
                          className="admin-input"
                          type="text"
                          value={selectedFolder.name ?? ""}
                          onChange={(event) =>
                            updateFolderField(
                              selectedFolder.id,
                              "name",
                              event.target.value
                            )
                          }
                        />
                      </label>
                    </div>

                    <div className="admin-form-grid">
                      <div className="admin-field">
                        <span>Finder position</span>
                        <div className="admin-position-picker">
                          <PositionGrid
                            value={selectedFolder.finderPosition ?? ""}
                            positions={AUTO_PROJECT_FINDER_POSITIONS}
                            onSelect={(pos) =>
                              updateFolderField(selectedFolder.id, "finderPosition", pos)
                            }
                          />
                          <div className="admin-position-actions">
                            <button
                              className="admin-button ghost small"
                              type="button"
                              onClick={() =>
                                handleAutoFolderPosition(
                                  "finderPosition",
                                  AUTO_PROJECT_FINDER_POSITIONS
                                )
                              }
                            >
                              Auto place
                            </button>
                            <span className="admin-position-hint">
                              Place the folder among desktop items.
                            </span>
                          </div>
                        </div>
                        <input
                          className="admin-input"
                          type="text"
                          value={selectedFolder.finderPosition ?? ""}
                          onChange={(event) =>
                            updateFolderField(
                              selectedFolder.id,
                              "finderPosition",
                              event.target.value
                            )
                          }
                        />
                      </div>
                      <div className="admin-field">
                        <span>Desktop position</span>
                        <div className="admin-position-picker">
                          <PositionGrid
                            value={selectedFolder.desktopPosition ?? ""}
                            positions={AUTO_PROJECT_DESKTOP_POSITIONS}
                            onSelect={(pos) =>
                              updateFolderField(selectedFolder.id, "desktopPosition", pos)
                            }
                          />
                          <div className="admin-position-actions">
                            <button
                              className="admin-button ghost small"
                              type="button"
                              onClick={() =>
                                handleAutoFolderPosition(
                                  "desktopPosition",
                                  AUTO_PROJECT_DESKTOP_POSITIONS
                                )
                              }
                            >
                              Auto place
                            </button>
                            <span className="admin-position-hint">
                              Matches macOS desktop grid.
                            </span>
                          </div>
                        </div>
                        <input
                          className="admin-input"
                          type="text"
                          value={selectedFolder.desktopPosition ?? ""}
                          onChange={(event) =>
                            updateFolderField(
                              selectedFolder.id,
                              "desktopPosition",
                              event.target.value
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="admin-split">
                  <div className="admin-card admin-card--files">
                    <div className="admin-card-header">
                      <div>
                        <h3 className="admin-card-title">Files</h3>
                        <p className="admin-card-subtitle">
                          {selectedProject.items?.length ?? 0} items inside this
                          folder.
                        </p>
                      </div>
                      <div className="admin-inline-actions">
                        <button
                          className="admin-button ghost small"
                          type="button"
                          onClick={() => handleAddFile("text")}
                        >
                          Text
                        </button>
                        <button
                          className="admin-button ghost small"
                          type="button"
                          onClick={() => handleAddFile("link")}
                        >
                          Link
                        </button>
                        <button
                          className="admin-button ghost small"
                          type="button"
                          onClick={() => handleAddFile("image")}
                        >
                          Image
                        </button>
                        <button
                          className="admin-button ghost small"
                          type="button"
                          onClick={() => handleAddFile("video")}
                        >
                          Video
                        </button>
                      </div>
                    </div>

                    <div className="admin-file-list">
                      {selectedProject?.items?.length ? (
                        selectedProject.items.map((item) => (
                          <div
                            key={item.id}
                            className={`admin-file-row ${
                              item.id === selectedFile?.id ? "is-active" : ""
                            }`}
                            onClick={() => setSelectedFileId(item.id)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") setSelectedFileId(item.id);
                            }}
                          >
                            <div>
                              <p className="admin-file-name">{item.name}</p>
                              <p className="admin-file-meta">{getItemLabel(item)}</p>
                            </div>
                            <div className="admin-file-actions-inline">
                              {item.type === "link" ? (
                                <button
                                  className="admin-button ghost small"
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openLink(item.href);
                                  }}
                                >
                                  Open
                                </button>
                              ) : null}
                              <span className="admin-pill">
                                {FILE_TYPE_LABELS[item.type] ?? "FILE"}
                              </span>
                              <button
                                className="admin-button ghost small danger"
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleRemoveFile(item.id);
                                }}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="admin-empty-inline">No files yet.</p>
                      )}
                    </div>
                  </div>

                  <div className="admin-card admin-card--editor">
                    <div className="admin-card-header">
                      <div>
                        <h3 className="admin-card-title">Editor</h3>
                        <p className="admin-card-subtitle">
                          {selectedFile
                            ? getItemLabel(selectedFile)
                            : "Select a file to edit."}
                        </p>
                      </div>
                      {selectedFile?.type === "link" && selectedFile.href ? (
                        <button
                          className="admin-button ghost small"
                          type="button"
                          onClick={() => openLink(selectedFile.href)}
                        >
                          Open
                        </button>
                      ) : null}
                    </div>

                    {selectedFile ? (
                      <div className="admin-form-grid">
                        <label className="admin-field">
                          <span>File name</span>
                          <input
                            className="admin-input"
                            type="text"
                            value={selectedFile.name ?? ""}
                            onChange={(event) =>
                              updateFileField("name", event.target.value)
                            }
                          />
                        </label>
                        <label className="admin-field">
                          <span>File type</span>
                          <input
                            className="admin-input"
                            type="text"
                            value={FILE_TYPE_LABELS[selectedFile.type] ?? "FILE"}
                            readOnly
                          />
                        </label>
                        {selectedFile.type === "link" ? (
                          <label className="admin-field">
                            <span>URL</span>
                            <input
                              className="admin-input"
                              type="url"
                              value={selectedFile.href ?? ""}
                              onChange={(event) =>
                                updateFileField("href", event.target.value)
                              }
                            />
                          </label>
                        ) : null}
                        {selectedFile.type === "image" ? (
                          <>
                            <label className="admin-field admin-field--span">
                              <span>Upload image (Cloudinary)</span>
                              <input
                                ref={imageUploadInputRef}
                                className="admin-input"
                                type="file"
                                accept="image/*"
                                disabled={imageUploadState.status === "uploading"}
                                onChange={handleImageInputChange}
                              />
                              <div className="mt-2 flex items-center gap-2 flex-wrap">
                                <span
                                  className={`admin-sync-pill ${
                                    imageUploadState.status === "uploading"
                                      ? "is-saving"
                                      : imageUploadState.status === "done"
                                        ? "is-saved"
                                        : imageUploadState.status === "error"
                                          ? "is-error"
                                          : "is-idle"
                                  }`}
                                >
                                  {imageUploadState.status === "uploading"
                                    ? "Uploading…"
                                    : imageUploadState.status === "done"
                                      ? "Uploaded"
                                      : imageUploadState.status === "error"
                                        ? "Upload failed"
                                        : "Pick an image to upload"}
                                </span>
                                {imageUploadState.status === "error" &&
                                imageUploadState.message ? (
                                  <span className="text-xs text-red-600">
                                    {imageUploadState.message}
                                  </span>
                                ) : null}
                                {selectedFile.imageUrl ? (
                                  <button
                                    className="admin-button ghost small"
                                    type="button"
                                    onClick={() => openLink(selectedFile.imageUrl)}
                                  >
                                    Preview
                                  </button>
                                ) : null}
                              </div>
                            </label>
                            <label className="admin-field admin-field--span">
                              <span>Image URL</span>
                              <input
                                className="admin-input"
                                type="text"
                                value={selectedFile.imageUrl ?? ""}
                                onChange={(event) =>
                                  updateFileField("imageUrl", event.target.value)
                                }
                              />
                            </label>
                          </>
                        ) : null}
                        {selectedFile.type === "video" ? (
                          <>
                            <label className="admin-field admin-field--span">
                              <span>Upload video (Cloudinary)</span>
                              <input
                                ref={videoUploadInputRef}
                                className="admin-input"
                                type="file"
                                accept="video/*"
                                disabled={videoUploadState.status === "uploading"}
                                onChange={handleVideoInputChange}
                              />
                              <div className="mt-2 flex items-center gap-2 flex-wrap">
                                <span
                                  className={`admin-sync-pill ${
                                    videoUploadState.status === "uploading"
                                      ? "is-saving"
                                      : videoUploadState.status === "done"
                                        ? "is-saved"
                                        : videoUploadState.status === "error"
                                          ? "is-error"
                                          : "is-idle"
                                  }`}
                                >
                                  {videoUploadState.status === "uploading"
                                    ? "Uploading…"
                                    : videoUploadState.status === "done"
                                      ? "Uploaded"
                                      : videoUploadState.status === "error"
                                        ? "Upload failed"
                                        : "Pick a video to upload"}
                                </span>
                                {videoUploadState.status === "error" &&
                                videoUploadState.message ? (
                                  <span className="text-xs text-red-600">
                                    {videoUploadState.message}
                                  </span>
                                ) : null}
                                {selectedFile.videoUrl ? (
                                  <button
                                    className="admin-button ghost small"
                                    type="button"
                                    onClick={() => openLink(selectedFile.videoUrl)}
                                  >
                                    Preview
                                  </button>
                                ) : null}
                              </div>
                            </label>
                            <label className="admin-field admin-field--span">
                              <span>Video URL</span>
                              <input
                                className="admin-input"
                                type="text"
                                value={selectedFile.videoUrl ?? ""}
                                onChange={(event) =>
                                  updateFileField("videoUrl", event.target.value)
                                }
                              />
                            </label>
                            <label className="admin-field admin-field--span">
                              <span>Poster URL</span>
                              <input
                                className="admin-input"
                                type="text"
                                value={selectedFile.posterUrl ?? ""}
                                onChange={(event) =>
                                  updateFileField("posterUrl", event.target.value)
                                }
                              />
                              {selectedFile.posterUrl ? (
                                <div className="mt-2">
                                  <button
                                    className="admin-button ghost small"
                                    type="button"
                                    onClick={() => openLink(selectedFile.posterUrl)}
                                  >
                                    Preview poster
                                  </button>
                                </div>
                              ) : null}
                            </label>
                          </>
                        ) : null}
                        {selectedFile.type === "text" ? (
                          <label className="admin-field admin-field--span">
                            <span>Text</span>
                            <textarea
                              className="admin-textarea"
                              value={selectedFile.description ?? ""}
                              onChange={(event) =>
                                updateFileField("description", event.target.value)
                              }
                            />
                          </label>
                        ) : null}
                        <div className="admin-field">
                          <span>Finder position</span>
                          <div className="admin-position-picker">
                            <PositionGrid
                              value={selectedFile.position ?? ""}
                              positions={AUTO_FILE_POSITIONS}
                              onSelect={(pos) => updateFileField("position", pos)}
                            />
                            <div className="admin-position-actions">
                              <button
                                className="admin-button ghost small"
                                type="button"
                                onClick={handleAutoFilePosition}
                              >
                                Auto place
                              </button>
                              <span className="admin-position-hint">
                                Keeps items from overlapping.
                              </span>
                            </div>
                          </div>
                          <input
                            className="admin-input"
                            type="text"
                            value={selectedFile.position ?? ""}
                            onChange={(event) =>
                              updateFileField("position", event.target.value)
                            }
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="admin-empty-inline">
                        Select a file from the left to start editing.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="admin-main-empty">
              <p className="admin-empty-title">Select a project</p>
              <p className="admin-empty-subtitle">
                Pick a project from the sidebar or create a new one.
              </p>
              <button className="admin-button" type="button" onClick={handleAddProject}>
                Create project
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
