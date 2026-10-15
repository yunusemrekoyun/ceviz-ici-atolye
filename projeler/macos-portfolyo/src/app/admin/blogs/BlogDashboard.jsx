"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { normalizeExternalUrl } from "@/utils/externalUrl.js";
import { authFetch } from "@/utils/authFetch.js";

const STATUS_LABELS = {
  live: "Live",
  draft: "Draft",
};

const normalizePosts = (list) =>
  Array.isArray(list)
    ? list
        .map((post) => ({
          id: Number(post?.id ?? 0),
          title: post?.title ?? "",
          summary: post?.summary ?? "",
          content: post?.content ?? "",
          date: post?.date ?? "",
          link: post?.link ?? "",
          status: post?.status === "draft" ? "draft" : "live",
          image: post?.image ?? "",
          imagePublicId: post?.imagePublicId ?? "",
          imageFormat: post?.imageFormat ?? "",
          imageWidth: Number(post?.imageWidth ?? 0),
          imageHeight: Number(post?.imageHeight ?? 0),
          imageBytes: Number(post?.imageBytes ?? 0),
          createdAt: Number(post?.createdAt ?? 0),
          updatedAt: Number(post?.updatedAt ?? 0),
        }))
        .filter((post) => Number.isFinite(post.id) && post.id > 0)
    : [];

const serializePostsForSave = (list) =>
  Array.isArray(list)
    ? list.map((post) => ({
        id: post.id,
        title: post.title,
        summary: post.summary,
        content: post.content,
        date: post.date,
        link: post.link,
        status: post.status,
        image: post.image,
        imagePublicId: post.imagePublicId,
        imageFormat: post.imageFormat,
        imageWidth: post.imageWidth,
        imageHeight: post.imageHeight,
        imageBytes: post.imageBytes,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
      }))
    : [];

const getNextId = (items = []) => {
  const maxId = items.reduce((max, item) => {
    const value = Number(item?.id ?? 0);
    return Number.isFinite(value) && value > max ? value : max;
  }, 0);
  return Math.max(1, maxId + 1);
};

const createPost = (id) => {
  const now = Date.now();
  const dateLabel = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return {
    id,
    title: "New Blog Post",
    summary: "",
    content: "",
    date: dateLabel,
    link: "",
    status: "draft",
    image: "",
    imagePublicId: "",
    imageFormat: "",
    imageWidth: 0,
    imageHeight: 0,
    imageBytes: 0,
    createdAt: now,
    updatedAt: now,
  };
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

const getStatusLabel = (statusKey) =>
  STATUS_LABELS[statusKey] ?? STATUS_LABELS.draft;

export default function BlogDashboard({ initialPosts, user }) {
  const [posts, setPosts] = useState(() => normalizePosts(initialPosts));
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(() => {
    const normalized = normalizePosts(initialPosts);
    return normalized[0]?.id ?? null;
  });
  const [saveState, setSaveState] = useState(() => ({
    status: "idle",
    message: "",
    lastSavedAt: null,
  }));
  const [imageUploadState, setImageUploadState] = useState(() => ({
    status: "idle",
    message: "",
  }));
  const saveTimerRef = useRef(null);
  const saveAbortRef = useRef(null);
  const imageUploadAbortRef = useRef(null);
  const imageInputRef = useRef(null);
  const lastSavedSignatureRef = useRef(null);
  const skipNextAutosaveRef = useRef(true);

  const selectedPost = useMemo(() => {
    if (!selectedId) return posts[0] ?? null;
    return posts.find((post) => post.id === selectedId) ?? posts[0] ?? null;
  }, [posts, selectedId]);

  const filteredPosts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return posts;
    return posts.filter((post) => {
      const haystack = `${post.title} ${post.summary} ${post.date} ${post.link}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [posts, query]);

  useEffect(() => {
    if (!posts.length) {
      if (selectedId !== null) setSelectedId(null);
      return;
    }
    const exists = posts.some((post) => post.id === selectedId);
    if (!exists) {
      setSelectedId(posts[0].id);
    }
  }, [posts, selectedId]);

  const updateSelectedPost = (updates) => {
    if (!selectedPost) return;
    const updatedAt = Date.now();
    setPosts((prev) =>
      prev.map((post) =>
        post.id === selectedPost.id ? { ...post, ...updates, updatedAt } : post
      )
    );
  };

  const handleAddPost = () => {
    const nextId = getNextId(posts);
    const newPost = createPost(nextId);
    setPosts((prev) => [newPost, ...prev]);
    setSelectedId(newPost.id);
  };

  const handleDeletePost = (postId) => {
    if (!postId) return;
    if (!window.confirm("Delete this blog post?")) return;
    const nextPosts = posts.filter((post) => post.id !== postId);
    setPosts(nextPosts);
    setSelectedId(nextPosts[0]?.id ?? null);
  };

  const runSave = useCallback(async (payload, signature) => {
    if (saveAbortRef.current) {
      saveAbortRef.current.abort();
      saveAbortRef.current = null;
    }

    const controller = new AbortController();
    saveAbortRef.current = controller;

    setSaveState((prev) => ({ ...prev, status: "saving", message: "" }));

    try {
      const response = await authFetch("/api/blogs", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ posts: payload }),
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
    const payload = serializePostsForSave(posts);
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
  }, [posts, scheduleSave]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (saveAbortRef.current) saveAbortRef.current.abort();
      if (imageUploadAbortRef.current) imageUploadAbortRef.current.abort();
    };
  }, []);

  const handleManualSave = () => {
    const payload = serializePostsForSave(posts);
    const signature = JSON.stringify(payload);
    scheduleSave(payload, signature, { immediate: true });
  };

  const openInNewTab = (href) => {
    const url = normalizeExternalUrl(href);
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleUploadImage = async (file) => {
    if (!selectedPost || !file) return;

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
      body.append("folder", "blogs");

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
      updateSelectedPost({
        image: asset.url,
        imagePublicId: asset.publicId,
        imageFormat: asset.format,
        imageWidth: asset.width ?? 0,
        imageHeight: asset.height ?? 0,
        imageBytes: asset.bytes ?? 0,
      });

      setImageUploadState({ status: "done", message: "" });
    } catch (error) {
      if (error?.name === "AbortError") return;
      setImageUploadState({
        status: "error",
        message: error?.message || "Upload failed",
      });
    } finally {
      imageUploadAbortRef.current = null;
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  const handleImageInputChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    handleUploadImage(file);
  };

  return (
    <main className="admin-canvas">
      <header className="admin-topbar">
        <div className="admin-topbar-brand">
          <div className="admin-logo">OS</div>
          <div>
            <p className="admin-brand-title">Portfolio OS</p>
            <p className="admin-brand-subtitle">Admin • Blogs</p>
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
            <a className="admin-button ghost" href="/admin/media">
              Photos
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
              <h2 className="admin-sidebar-title">Blogs</h2>
              <p className="admin-sidebar-subtitle">Safari favorites + all posts</p>
            </div>
            <button className="admin-button ghost small" type="button" onClick={handleAddPost}>
              New
            </button>
          </div>

          <div className="admin-sidebar-search">
            <input
              className="admin-input"
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search blogs…"
            />
          </div>

          <div className="admin-project-list" role="listbox" aria-label="Blog posts">
            {filteredPosts.length ? (
              filteredPosts.map((post) => (
                <button
                  key={post.id}
                  type="button"
                  className={`admin-project-row ${
                    post.id === selectedPost?.id ? "is-active" : ""
                  }`}
                  onClick={() => setSelectedId(post.id)}
                  role="option"
                  aria-selected={post.id === selectedPost?.id}
                >
                  <span className="admin-project-row-main">
                    <span
                      className={`admin-status-dot ${
                        post.status === "live" ? "is-live" : "is-draft"
                      }`}
                    />
                    <span className="admin-project-title">{post.title || "Untitled"}</span>
                  </span>
                  <span className="admin-project-row-meta">
                    <span className="admin-pill">{post.date || "No date"}</span>
                  </span>
                </button>
              ))
            ) : (
              <div className="admin-empty">
                <p className="admin-empty-title">No blogs</p>
                <p className="admin-empty-subtitle">
                  Add a post to populate Safari’s Favorite Blogs section.
                </p>
                <button className="admin-button" type="button" onClick={handleAddPost}>
                  Create blog
                </button>
              </div>
            )}
          </div>

          <div className="admin-sidebar-footer">
            <p className="admin-note">Tip: only Live posts appear in Safari.</p>
          </div>
        </aside>

        <section className="admin-main">
          {selectedPost ? (
            <>
              <div className="admin-main-header">
                <div className="admin-main-title">
                  <h2 className="admin-main-name">{selectedPost.title}</h2>
                  <span
                    className={`admin-badge ${
                      selectedPost.status === "live" ? "is-live" : "is-draft"
                    }`}
                  >
                    {getStatusLabel(selectedPost.status)}
                  </span>
                </div>
                <div className="admin-inline-actions">
                  <button
                    className="admin-button ghost small danger"
                    type="button"
                    onClick={() => handleDeletePost(selectedPost.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="admin-main-content">
                <div className="admin-split">
                  <div className="admin-card admin-card--files">
                    <div className="admin-card-header">
                      <div>
                        <h3 className="admin-card-title">Cover image</h3>
                        <p className="admin-card-subtitle">
                          Upload a thumbnail for Safari cards.
                        </p>
                      </div>
                      <div className="admin-inline-actions">
                        <label className="admin-button ghost small">
                          Upload image
                          <input
                            ref={imageInputRef}
                            className="sr-only"
                            type="file"
                            accept="image/*"
                            onChange={handleImageInputChange}
                            disabled={imageUploadState.status === "uploading"}
                          />
                        </label>
                        {selectedPost.image ? (
                          <button
                            className="admin-button ghost small danger"
                            type="button"
                            onClick={() =>
                              updateSelectedPost({
                                image: "",
                                imagePublicId: "",
                                imageFormat: "",
                                imageWidth: 0,
                                imageHeight: 0,
                                imageBytes: 0,
                              })
                            }
                          >
                            Remove
                          </button>
                        ) : null}
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
                          title={imageUploadState.message || ""}
                        >
                          {imageUploadState.status === "uploading"
                            ? "Uploading…"
                            : imageUploadState.status === "done"
                              ? "Updated"
                              : imageUploadState.status === "error"
                                ? "Upload failed"
                                : "Ready"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
                        {selectedPost.image ? (
                          <img
                            src={selectedPost.image}
                            alt={selectedPost.title}
                            className="w-full h-auto"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <div className="h-40 w-full flex items-center justify-center text-xs text-slate-500">
                            No image uploaded
                          </div>
                        )}
                      </div>

                      {selectedPost.image ? (
                        <div className="mt-3 flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            className="admin-button ghost small"
                            onClick={() => openInNewTab(selectedPost.image)}
                          >
                            Open
                          </button>
                          <span className="admin-pill">
                            {selectedPost.imageFormat
                              ? selectedPost.imageFormat.toUpperCase()
                              : "IMG"}
                          </span>
                          {selectedPost.imageWidth && selectedPost.imageHeight ? (
                            <span className="admin-pill">
                              {selectedPost.imageWidth}×{selectedPost.imageHeight}
                            </span>
                          ) : null}
                          {selectedPost.imageBytes ? (
                            <span className="admin-pill">
                              {formatBytes(selectedPost.imageBytes)}
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="admin-card admin-card--editor">
                    <div className="admin-card-header">
                      <div>
                        <h3 className="admin-card-title">Details</h3>
                        <p className="admin-card-subtitle">
                          Edit copy, links, and publishing status.
                        </p>
                      </div>
                    </div>

                    <div className="admin-form-grid">
                      <label className="admin-field admin-field--span">
                        <span>Title</span>
                        <input
                          className="admin-input"
                          type="text"
                          value={selectedPost.title}
                          onChange={(event) =>
                            updateSelectedPost({ title: event.target.value })
                          }
                        />
                      </label>

                      <label className="admin-field">
                        <span>Status</span>
                        <select
                          className="admin-select"
                          value={selectedPost.status}
                          onChange={(event) =>
                            updateSelectedPost({ status: event.target.value })
                          }
                        >
                          <option value="live">Live</option>
                          <option value="draft">Draft</option>
                        </select>
                      </label>

                      <label className="admin-field">
                        <span>Date label</span>
                        <input
                          className="admin-input"
                          type="text"
                          value={selectedPost.date}
                          placeholder="Aug 15, 2025"
                          onChange={(event) =>
                            updateSelectedPost({ date: event.target.value })
                          }
                        />
                      </label>

                      <label className="admin-field admin-field--span">
                        <span>External link</span>
                        <input
                          className="admin-input"
                          type="text"
                          value={selectedPost.link}
                          placeholder="https://..."
                          onChange={(event) =>
                            updateSelectedPost({ link: event.target.value })
                          }
                        />
                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            className="admin-button ghost small"
                            onClick={() => openInNewTab(selectedPost.link)}
                            disabled={!selectedPost.link}
                          >
                            Open link
                          </button>
                        </div>
                      </label>

                      <label className="admin-field admin-field--span">
                        <span>Summary</span>
                        <textarea
                          className="admin-textarea"
                          value={selectedPost.summary}
                          placeholder="Short description that appears in All Blogs."
                          onChange={(event) =>
                            updateSelectedPost({ summary: event.target.value })
                          }
                        />
                      </label>

                      <label className="admin-field admin-field--span">
                        <span>Content</span>
                        <textarea
                          className="admin-textarea"
                          value={selectedPost.content}
                          placeholder="Write the full blog content shown in Safari."
                          onChange={(event) =>
                            updateSelectedPost({ content: event.target.value })
                          }
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="admin-main-empty">
              <h2 className="admin-empty-title">Select a blog post</h2>
              <p className="admin-empty-subtitle">
                Create a new post to start showing blogs inside Safari.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
