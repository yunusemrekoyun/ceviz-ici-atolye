"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { photosLinks } from "#constants";
import { authFetch } from "@/utils/authFetch.js";

const normalizeItems = (items) =>
  Array.isArray(items)
    ? items.map((item) => ({
        id: Number(item?.id ?? 0),
        type: item?.type === "video" ? "video" : "image",
        src: item?.src ?? "",
        thumb: item?.thumb ?? "",
        publicId: item?.publicId ?? "",
        format: item?.format ?? "",
        width: Number(item?.width ?? 0),
        height: Number(item?.height ?? 0),
        duration: Number(item?.duration ?? 0),
        bytes: Number(item?.bytes ?? 0),
        albumId: Number(item?.albumId ?? 1) || 1,
        createdAt: Number(item?.createdAt ?? 0),
      }))
    : [];

const serializeItemsForSave = (items) =>
  Array.isArray(items)
    ? items.map((item) => ({
        id: item.id,
        type: item.type,
        src: item.src,
        thumb: item.thumb,
        publicId: item.publicId,
        format: item.format,
        width: item.width,
        height: item.height,
        duration: item.duration,
        bytes: item.bytes,
        albumId: item.albumId,
        createdAt: item.createdAt,
      }))
    : [];

const getNextId = (items) => {
  const maxId = items.reduce((max, item) => {
    const value = Number(item?.id ?? 0);
    return Number.isFinite(value) && value > max ? value : max;
  }, 0);
  return Math.max(1, maxId + 1);
};

const formatBytes = (bytes) => {
  const value = Number(bytes ?? 0);
  if (!Number.isFinite(value) || value <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let idx = 0;
  let sized = value;
  while (sized >= 1024 && idx < units.length - 1) {
    sized /= 1024;
    idx += 1;
  }
  const precision = idx === 0 ? 0 : idx === 1 ? 1 : 2;
  return `${sized.toFixed(precision)} ${units[idx]}`;
};

const normalizeResume = (resume) => ({
  title: resume?.title ?? "Resume.pdf",
  url: resume?.url ?? "",
  publicId: resume?.publicId ?? "",
  fileName: resume?.fileName ?? resume?.title ?? "Resume.pdf",
  bytes: Number(resume?.bytes ?? 0),
  updatedAtMs: Number(resume?.updatedAtMs ?? 0),
});

const formatTimestamp = (value) => {
  const ms = Number(value ?? 0);
  if (!Number.isFinite(ms) || ms <= 0) return "";
  return new Date(ms).toLocaleString();
};

export default function MediaDashboard({ initialItems, initialResume, user }) {
  const [items, setItems] = useState(() => normalizeItems(initialItems));
  const [query, setQuery] = useState("");
  const [resume, setResume] = useState(() => normalizeResume(initialResume));
  const [selectedId, setSelectedId] = useState(() => {
    const normalized = normalizeItems(initialItems);
    return normalized[0]?.id ?? null;
  });
  const [saveState, setSaveState] = useState(() => ({
    status: "idle",
    message: "",
    lastSavedAt: null,
  }));
  const [uploadState, setUploadState] = useState(() => ({
    status: "idle",
    message: "",
  }));
  const uploadAbortRef = useRef(null);
  const resumeUploadAbortRef = useRef(null);
  const resumeFileInputRef = useRef(null);
  const saveTimerRef = useRef(null);
  const saveAbortRef = useRef(null);
  const lastSavedSignatureRef = useRef(null);
  const skipNextAutosaveRef = useRef(true);
  const fileInputRef = useRef(null);
  const [resumeUploadState, setResumeUploadState] = useState(() => ({
    status: "idle",
    message: "",
  }));

  const selectedItem = useMemo(() => {
    if (!selectedId) return items[0] ?? null;
    return items.find((item) => item.id === selectedId) ?? items[0] ?? null;
  }, [items, selectedId]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const haystack = `${item.type} ${item.publicId} ${item.format} ${item.src}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [items, query]);

  useEffect(() => {
    if (!items.length) {
      if (selectedId !== null) setSelectedId(null);
      return;
    }
    const exists = items.some((item) => item.id === selectedId);
    if (!exists) {
      setSelectedId(items[0].id);
    }
  }, [items, selectedId]);

  const runSave = useCallback(async (payload, signature) => {
    if (saveAbortRef.current) {
      saveAbortRef.current.abort();
      saveAbortRef.current = null;
    }

    const controller = new AbortController();
    saveAbortRef.current = controller;

    setSaveState((prev) => ({ ...prev, status: "saving", message: "" }));

    try {
      const response = await authFetch("/api/media/photos", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ items: payload }),
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

  const scheduleSave = useCallback(
    (payload, signature, { immediate = false } = {}) => {
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
    },
    [runSave]
  );

  useEffect(() => {
    const payload = serializeItemsForSave(items);
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
  }, [items, scheduleSave]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (saveAbortRef.current) saveAbortRef.current.abort();
      if (uploadAbortRef.current) uploadAbortRef.current.abort();
      if (resumeUploadAbortRef.current) resumeUploadAbortRef.current.abort();
    };
  }, []);

  const handleManualSave = () => {
    const payload = serializeItemsForSave(items);
    const signature = JSON.stringify(payload);
    scheduleSave(payload, signature, { immediate: true });
  };

  const updateItemField = (field, value) => {
    if (!selectedItem) return;
    setItems((prev) =>
      prev.map((item) =>
        item.id === selectedItem.id ? { ...item, [field]: value } : item
      )
    );
  };

  const handleDeleteItem = (id) => {
    const target = items.find((item) => item.id === id);
    if (!target) return;
    if (!window.confirm("Remove this media item?")) return;
    const next = items.filter((item) => item.id !== id);
    setItems(next);
    if (selectedId === id) {
      setSelectedId(next[0]?.id ?? null);
    }
  };

  const handleUploadFiles = async (files, { defaultAlbumId = 1 } = {}) => {
    const list = Array.from(files ?? []).filter(Boolean);
    if (!list.length) return;

    if (uploadAbortRef.current) {
      uploadAbortRef.current.abort();
      uploadAbortRef.current = null;
    }

    const controller = new AbortController();
    uploadAbortRef.current = controller;

    setUploadState({ status: "uploading", message: "" });

    try {
      const created = [];
      let nextId = getNextId(items);

      for (let i = 0; i < list.length; i += 1) {
        const file = list[i];
        const body = new FormData();
        body.append("file", file);

        const response = await authFetch("/api/media/upload", {
          method: "POST",
          body,
          signal: controller.signal,
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data?.ok || !data?.asset?.url) {
          throw new Error(data?.error || "Upload failed");
        }

        const resourceType = data.asset.resourceType === "video" ? "video" : "image";
        const src = data.asset.url;
        const thumb = resourceType === "video" ? data.asset.posterUrl ?? "" : src;

        const now = Date.now();
        created.push({
          id: nextId++,
          type: resourceType,
          src,
          thumb,
          publicId: data.asset.publicId ?? "",
          format: data.asset.format ?? "",
          width: Number(data.asset.width ?? 0),
          height: Number(data.asset.height ?? 0),
          duration: Number(data.asset.duration ?? 0),
          bytes: Number(data.asset.bytes ?? 0),
          albumId: Number(defaultAlbumId ?? 1) || 1,
          createdAt: now,
        });
      }

      setItems((prev) => [...prev, ...created]);
      setSelectedId(created.at(-1)?.id ?? null);
      setUploadState({ status: "done", message: "" });
    } catch (error) {
      if (error?.name === "AbortError") return;
      setUploadState({
        status: "error",
        message: error?.message || "Upload failed",
      });
    } finally {
      uploadAbortRef.current = null;
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileInputChange = (event) => {
    const files = event.target.files;
    if (!files || !files.length) return;
    const album = selectedItem?.albumId ?? 1;
    handleUploadFiles(files, { defaultAlbumId: album });
  };

  const openInNewTab = (url) => {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleResumeUpload = async (file) => {
    if (!file) return;

    if (resumeUploadAbortRef.current) {
      resumeUploadAbortRef.current.abort();
      resumeUploadAbortRef.current = null;
    }

    const controller = new AbortController();
    resumeUploadAbortRef.current = controller;

    setResumeUploadState({ status: "uploading", message: "" });

    try {
      const body = new FormData();
      body.append("file", file);
      body.append("folder", "resume");

      const response = await authFetch("/api/media/upload", {
        method: "POST",
        body,
        signal: controller.signal,
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.ok || !data?.asset?.url) {
        throw new Error(data?.error || "Upload failed");
      }

      const saveResponse = await authFetch("/api/media/resume", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          url: data.asset.url,
          publicId: data.asset.publicId,
          fileName: file.name,
          bytes: data.asset.bytes,
        }),
        signal: controller.signal,
      });

      const saved = await saveResponse.json().catch(() => ({}));
      if (!saveResponse.ok || !saved?.ok || !saved?.resume?.url) {
        throw new Error(saved?.error || "Failed to save resume");
      }

      setResume(normalizeResume(saved.resume));
      setResumeUploadState({ status: "done", message: "" });
    } catch (error) {
      if (error?.name === "AbortError") return;
      setResumeUploadState({
        status: "error",
        message: error?.message || "Upload failed",
      });
    } finally {
      resumeUploadAbortRef.current = null;
      if (resumeFileInputRef.current) resumeFileInputRef.current.value = "";
    }
  };

  const handleResumeFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    handleResumeUpload(file);
  };

  return (
    <main className="admin-canvas">
      <header className="admin-topbar">
        <div className="admin-topbar-brand">
          <div className="admin-logo">OS</div>
          <div>
            <p className="admin-brand-title">Portfolio OS</p>
            <p className="admin-brand-subtitle">Admin • Media</p>
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
            <a className="admin-button ghost" href="/admin">
              Projects
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
              <h2 className="admin-sidebar-title">Photos</h2>
              <p className="admin-sidebar-subtitle">
                macOS Photos + iOS Photos library
              </p>
            </div>
          </div>

          <div className="admin-sidebar-search">
            <input
              className="admin-input"
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search media…"
            />
          </div>

          <div className="admin-project-list" role="listbox" aria-label="Media items">
            {filteredItems.length ? (
              filteredItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`admin-project-row ${item.id === selectedItem?.id ? "is-active" : ""}`}
                  onClick={() => setSelectedId(item.id)}
                  role="option"
                  aria-selected={item.id === selectedItem?.id}
                >
                  <span className="admin-project-row-main">
                    <span className={`admin-pill`}>{item.type.toUpperCase()}</span>
                    <span className="admin-project-title">
                      {item.publicId ? item.publicId.split("/").at(-1) : `Media ${item.id}`}
                    </span>
                  </span>
                  <span className="admin-project-row-meta">
                    <span className="admin-project-meta">
                      {item.format ? item.format.toUpperCase() : ""}
                      {item.bytes ? ` • ${formatBytes(item.bytes)}` : ""}
                    </span>
                  </span>
                </button>
              ))
            ) : (
              <div className="admin-empty">
                <p className="admin-empty-title">No media yet</p>
                <p className="admin-empty-subtitle">
                  Upload your first image or video to populate Photos.
                </p>
              </div>
            )}
          </div>

          <div className="admin-sidebar-footer">
            <p className="admin-note">
              Tip: uploads auto-save. Use Albums to organize Photos.
            </p>
          </div>
        </aside>

        <section className="admin-main">
          <div className="admin-main-header">
            <div className="admin-main-title">
              <p className="admin-main-name">Media Library</p>
            </div>

            <div className="admin-inline-actions">
              <label className="admin-button ghost small">
                Add media
                <input
                  ref={fileInputRef}
                  className="sr-only"
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  disabled={uploadState.status === "uploading"}
                  onChange={handleFileInputChange}
                />
              </label>
              <span
                className={`admin-sync-pill ${
                  uploadState.status === "uploading"
                    ? "is-saving"
                    : uploadState.status === "done"
                      ? "is-saved"
                      : uploadState.status === "error"
                        ? "is-error"
                        : "is-idle"
                }`}
                title={uploadState.message || ""}
              >
                {uploadState.status === "uploading"
                  ? "Uploading…"
                  : uploadState.status === "done"
                    ? "Uploaded"
                    : uploadState.status === "error"
                      ? "Upload failed"
                      : "Ready"}
              </span>
            </div>
          </div>

          <div className="admin-main-content">
            <div className="admin-card">
              <div className="admin-card-header">
                <div>
                  <h3 className="admin-card-title">Resume PDF</h3>
                  <p className="admin-card-subtitle">
                    Upload a PDF to update Resume across macOS + iOS.
                  </p>
                </div>
                <div className="admin-inline-actions">
                  <button
                    type="button"
                    className="admin-button ghost small"
                    onClick={() => openInNewTab("/api/resume/file")}
                    disabled={!resume?.url}
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    className="admin-button ghost small"
                    onClick={() => openInNewTab("/api/resume/file?download=1")}
                    disabled={!resume?.url}
                  >
                    Download
                  </button>
                </div>
              </div>

              <div className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {resume?.fileName || resume?.title || "Resume.pdf"}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {resume?.bytes ? `${formatBytes(resume.bytes)} • ` : ""}
                    {resume?.updatedAtMs ? `Updated ${formatTimestamp(resume.updatedAtMs)}` : ""}
                  </p>
                </div>

                <div className="admin-inline-actions">
                  <label className="admin-button ghost small">
                    Upload PDF
                    <input
                      ref={resumeFileInputRef}
                      className="sr-only"
                      type="file"
                      accept="application/pdf"
                      disabled={resumeUploadState.status === "uploading"}
                      onChange={handleResumeFileChange}
                    />
                  </label>
                  <span
                    className={`admin-sync-pill ${
                      resumeUploadState.status === "uploading"
                        ? "is-saving"
                        : resumeUploadState.status === "done"
                          ? "is-saved"
                          : resumeUploadState.status === "error"
                            ? "is-error"
                            : "is-idle"
                    }`}
                    title={resumeUploadState.message || ""}
                  >
                    {resumeUploadState.status === "uploading"
                      ? "Uploading…"
                      : resumeUploadState.status === "done"
                        ? "Updated"
                        : resumeUploadState.status === "error"
                          ? "Upload failed"
                          : "Ready"}
                  </span>
                </div>
              </div>
            </div>

            <div className="admin-split">
              <div className="admin-card admin-card--files">
                <div className="admin-card-header">
                  <div>
                    <h3 className="admin-card-title">Preview</h3>
                    <p className="admin-card-subtitle">
                      {selectedItem ? `Item #${selectedItem.id}` : "Select a media item."}
                    </p>
                  </div>
                  {selectedItem ? (
                    <div className="admin-inline-actions">
                      <button
                        type="button"
                        className="admin-button ghost small danger"
                        onClick={() => handleDeleteItem(selectedItem.id)}
                      >
                        Delete
                      </button>
                    </div>
                  ) : null}
                </div>

                {selectedItem ? (
                  <div className="mt-4">
                    <div className="w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
                      {selectedItem.type === "video" ? (
                        <video
                          src={selectedItem.src}
                          poster={selectedItem.thumb || undefined}
                          controls
                          preload="metadata"
                          className="w-full h-auto"
                        />
                      ) : (
                        <img
                          src={selectedItem.thumb || selectedItem.src}
                          alt={`media-${selectedItem.id}`}
                          className="w-full h-auto"
                          loading="lazy"
                          decoding="async"
                        />
                      )}
                    </div>

                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      {selectedItem.src ? (
                        <button
                          type="button"
                          className="admin-button ghost small"
                          onClick={() => openInNewTab(selectedItem.src)}
                        >
                          Open
                        </button>
                      ) : null}
                      {selectedItem.type === "video" && selectedItem.thumb ? (
                        <button
                          type="button"
                          className="admin-button ghost small"
                          onClick={() => openInNewTab(selectedItem.thumb)}
                        >
                          Poster
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <p className="admin-empty-inline">Select an item from the sidebar.</p>
                )}
              </div>

              <div className="admin-card admin-card--editor">
                <div className="admin-card-header">
                  <div>
                    <h3 className="admin-card-title">Details</h3>
                    <p className="admin-card-subtitle">
                      Controls what appears in macOS Photos + iOS Photos.
                    </p>
                  </div>
                </div>

                {selectedItem ? (
                  <div className="admin-form-grid">
                    <label className="admin-field admin-field--span">
                      <span>Album</span>
                      <select
                        className="admin-select"
                        value={selectedItem.albumId ?? 1}
                        onChange={(event) =>
                          updateItemField("albumId", Number(event.target.value) || 1)
                        }
                      >
                        {photosLinks.map((album) => (
                          <option key={album.id} value={album.id}>
                            {album.title}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="admin-field admin-field--span">
                      <span>Source URL</span>
                      <input
                        className="admin-input"
                        type="text"
                        value={selectedItem.src ?? ""}
                        onChange={(event) => updateItemField("src", event.target.value)}
                      />
                    </label>

                    <label className="admin-field admin-field--span">
                      <span>Thumbnail / Poster URL</span>
                      <input
                        className="admin-input"
                        type="text"
                        value={selectedItem.thumb ?? ""}
                        onChange={(event) => updateItemField("thumb", event.target.value)}
                      />
                    </label>

                    <label className="admin-field">
                      <span>Type</span>
                      <input
                        className="admin-input"
                        type="text"
                        value={selectedItem.type.toUpperCase()}
                        readOnly
                      />
                    </label>

                    <label className="admin-field">
                      <span>Format</span>
                      <input
                        className="admin-input"
                        type="text"
                        value={selectedItem.format ?? ""}
                        readOnly
                      />
                    </label>

                    <label className="admin-field">
                      <span>Resolution</span>
                      <input
                        className="admin-input"
                        type="text"
                        value={
                          selectedItem.width && selectedItem.height
                            ? `${selectedItem.width}×${selectedItem.height}`
                            : ""
                        }
                        readOnly
                      />
                    </label>

                    <label className="admin-field">
                      <span>Size</span>
                      <input
                        className="admin-input"
                        type="text"
                        value={formatBytes(selectedItem.bytes)}
                        readOnly
                      />
                    </label>

                    {selectedItem.type === "video" ? (
                      <label className="admin-field">
                        <span>Duration</span>
                        <input
                          className="admin-input"
                          type="text"
                          value={selectedItem.duration ? `${selectedItem.duration}s` : ""}
                          readOnly
                        />
                      </label>
                    ) : null}
                  </div>
                ) : (
                  <p className="admin-empty-inline">
                    Upload media to start building your Photos library.
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
