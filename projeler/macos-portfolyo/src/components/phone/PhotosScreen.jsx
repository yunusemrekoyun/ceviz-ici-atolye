import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import gsap from "gsap";
import { Check, ExternalLink, Search, Share2 } from "lucide-react";
import { phonePhotosTabs } from "#constants";

const PhotosScreen = ({
  photos = [],
  sections = null,
  tabs = [],
  activeTabId = null,
  onChangeTab,
}) => {
  const [rootTab, setRootTab] = useState("library");
  const [albumOpen, setAlbumOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [viewerItem, setViewerItem] = useState(null);
  const scrollRef = useRef(null);
  const prevViewRef = useRef({ rootTab: "library", albumOpen: false });
  const viewerRef = useRef(null);
  const viewerBackdropRef = useRef(null);
  const viewerBodyRef = useRef(null);
  const viewerNavRef = useRef(null);
  const viewerTlRef = useRef(null);
  const viewerDragRef = useRef({
    startY: 0,
    lastY: 0,
    lastTime: 0,
    velocityY: 0,
    active: false,
  });
  const isViewerAnimatingRef = useRef(false);

  const allPhotos = useMemo(() => photos.filter(Boolean), [photos]);
  const activeAlbumTitle = useMemo(() => {
    const match = tabs.find((t) => t.id === activeTabId);
    return match?.title ?? "Album";
  }, [activeTabId, tabs]);

  const activeAlbumPhotos = useMemo(() => {
    if (!sections || !activeTabId || !sections[activeTabId]) return allPhotos;
    return sections[activeTabId].filter(Boolean);
  }, [allPhotos, activeTabId, sections]);

  const albumCards = useMemo(() => {
    return tabs.map((tab) => {
      const items = sections?.[tab.id]?.filter(Boolean) ?? allPhotos;
      return {
        ...tab,
        count: items.length,
        cover: items[0]?.img ?? null,
      };
    });
  }, [allPhotos, sections, tabs]);

  const filteredLibraryPhotos = useMemo(() => {
    if (rootTab !== "library") return allPhotos;
    if (!query) return allPhotos;
    const q = query.toLowerCase();
    return allPhotos.filter((p) => String(p?.id ?? "").toLowerCase().includes(q));
  }, [allPhotos, query, rootTab]);

  const handleRootTabChange = (nextTab) => {
    setRootTab(nextTab);
    setAlbumOpen(false);
    setQuery("");
    setSelectMode(false);
    setSelectedIds([]);
  };

  const toggleSelected = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  };

  const toggleSelectMode = () => {
    const next = !selectMode;
    setSelectMode(next);
    if (!next) setSelectedIds([]);
  };

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (viewerItem) return;

    const prev = prevViewRef.current;
    const next = { rootTab, albumOpen };
    if (prev.rootTab === next.rootTab && prev.albumOpen === next.albumOpen) return;

    const order = { library: 0, foryou: 1, albums: 2, search: 3 };
    let direction = 1;
    let distance = 14;

    if (prev.rootTab !== next.rootTab) {
      const prevIdx = order[prev.rootTab] ?? 0;
      const nextIdx = order[next.rootTab] ?? 0;
      direction = nextIdx >= prevIdx ? 1 : -1;
      distance = 14;
    } else if (prev.albumOpen !== next.albumOpen && next.rootTab === "albums") {
      direction = next.albumOpen ? 1 : -1;
      distance = 24;
    }

    gsap.fromTo(
      el,
      { x: direction * distance, opacity: 0.01 },
      {
        x: 0,
        opacity: 1,
        duration: 0.28,
        ease: "power2.out",
        overwrite: "auto",
        clearProps: "transform,opacity",
      }
    );

    prevViewRef.current = next;
  }, [albumOpen, rootTab, viewerItem]);

  useEffect(() => {
    if (!viewerItem) return undefined;
    const el = viewerRef.current;
    if (!el) return undefined;

    if (viewerTlRef.current) viewerTlRef.current.kill();

    isViewerAnimatingRef.current = true;
    viewerDragRef.current.active = false;
    const tl = gsap.timeline({
      defaults: { ease: "power3.out", overwrite: "auto" },
      onComplete: () => {
        isViewerAnimatingRef.current = false;
      },
    });

    gsap.set(el, { opacity: 1 });
    gsap.set(viewerBackdropRef.current, { opacity: 0 });
    gsap.set(viewerBodyRef.current, { y: 18, scale: 0.985 });
    gsap.set(viewerNavRef.current, { opacity: 0 });

    tl.to(viewerBackdropRef.current, { opacity: 1, duration: 0.22 }, 0)
      .to(viewerBodyRef.current, { y: 0, scale: 1, duration: 0.28 }, 0)
      .to(viewerNavRef.current, { opacity: 1, duration: 0.2 }, 0.02);

    viewerTlRef.current = tl;

    return () => {
      if (viewerTlRef.current) {
        viewerTlRef.current.kill();
        viewerTlRef.current = null;
      }
    };
  }, [viewerItem]);

  const closeViewer = () => {
    const el = viewerRef.current;
    if (!el || isViewerAnimatingRef.current) {
      setViewerItem(null);
      return;
    }

    isViewerAnimatingRef.current = true;
    viewerDragRef.current.active = false;

    if (viewerTlRef.current) viewerTlRef.current.kill();
    const tl = gsap.timeline({
      defaults: { ease: "power2.in", overwrite: "auto" },
      onComplete: () => {
        isViewerAnimatingRef.current = false;
        setViewerItem(null);
      },
    });

    tl.to(viewerNavRef.current, { opacity: 0, duration: 0.12 }, 0)
      .to(viewerBodyRef.current, { y: 24, scale: 0.985, duration: 0.18 }, 0)
      .to(viewerBackdropRef.current, { opacity: 0, duration: 0.18 }, 0);

    viewerTlRef.current = tl;
  };

  const applyViewerDrag = (deltaYRaw = 0) => {
    const delta = Math.max(0, Math.min(deltaYRaw, 420));
    const progress = Math.min(1, delta / 320);
    const eased = 1 - (1 - progress) ** 2;
    const scale = 1 - eased * 0.12;

    if (viewerBodyRef.current) {
      gsap.set(viewerBodyRef.current, {
        y: delta,
        scale,
        force3D: true,
      });
    }
    if (viewerBackdropRef.current) {
      gsap.set(viewerBackdropRef.current, { opacity: 1 - eased });
    }
    if (viewerNavRef.current) {
      gsap.set(viewerNavRef.current, { opacity: 1 - eased * 0.9 });
    }

    return delta;
  };

  const animateViewerBack = () => {
    if (isViewerAnimatingRef.current) return;
    if (viewerTlRef.current) viewerTlRef.current.kill();

    isViewerAnimatingRef.current = true;
    const tl = gsap.timeline({
      defaults: { overwrite: "auto" },
      onComplete: () => {
        isViewerAnimatingRef.current = false;
      },
    });

    tl.to(viewerBodyRef.current, { y: 0, scale: 1, duration: 0.26, ease: "power3.out" }, 0)
      .to(viewerBackdropRef.current, { opacity: 1, duration: 0.22, ease: "power2.out" }, 0)
      .to(viewerNavRef.current, { opacity: 1, duration: 0.18, ease: "power2.out" }, 0.02);

    viewerTlRef.current = tl;
  };

  const handleViewerPointerDown = (e) => {
    if (isViewerAnimatingRef.current) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;

    const y = e.clientY;
    const now = performance.now();

    viewerDragRef.current.startY = y;
    viewerDragRef.current.lastY = y;
    viewerDragRef.current.lastTime = now;
    viewerDragRef.current.velocityY = 0;
    viewerDragRef.current.active = true;

    if (viewerTlRef.current) {
      viewerTlRef.current.kill();
      viewerTlRef.current = null;
    }

    if (viewerBodyRef.current?.setPointerCapture && e.pointerId != null) {
      try {
        viewerBodyRef.current.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }

    e.preventDefault?.();
  };

  const handleViewerPointerMove = (e) => {
    if (!viewerDragRef.current.active || isViewerAnimatingRef.current) return;

    const y = e.clientY;
    const now = performance.now();
    const dt = now - (viewerDragRef.current.lastTime || now);

    if (dt > 0) {
      viewerDragRef.current.velocityY = (y - viewerDragRef.current.lastY) / dt;
    }

    viewerDragRef.current.lastY = y;
    viewerDragRef.current.lastTime = now;

    const delta = y - viewerDragRef.current.startY;
    if (delta <= 0) {
      applyViewerDrag(0);
    } else {
      applyViewerDrag(delta);
    }

    e.preventDefault?.();
  };

  const handleViewerPointerUp = (e) => {
    if (!viewerDragRef.current.active || isViewerAnimatingRef.current) return;

    const delta = Math.max(0, e.clientY - viewerDragRef.current.startY);
    const velocityY = viewerDragRef.current.velocityY || 0;
    viewerDragRef.current.active = false;

    if (viewerBodyRef.current?.releasePointerCapture && e.pointerId != null) {
      try {
        viewerBodyRef.current.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }

    const shouldClose = delta > 140 || velocityY > 0.75;
    if (shouldClose) closeViewer();
    else animateViewerBack();

    e.preventDefault?.();
  };

  const handleShare = async () => {
    if (!viewerItem) return;
    const url = viewerItem?.src ?? viewerItem?.img ?? null;
    if (!url) return;

    try {
      if (navigator.share) {
        await navigator.share({ title: "Photo", url });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      // ignore
    }
  };

  const openAlbum = (tabId) => {
    onChangeTab?.(tabId);
    setAlbumOpen(true);
  };

  const renderLibrary = () => (
    <>
      <h3 className="phone-photos-large-title">Photos</h3>

      <div className="phone-photos-search">
        <div className="phone-photos-searchbox">
          <Search size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            aria-label="Search photos"
          />
        </div>
      </div>

      <div className="phone-photos-grid">
        {filteredLibraryPhotos.map((item) => (
          <button
            key={item.id}
            type="button"
            className="phone-photos-thumb"
            onClick={() => {
              if (selectMode) toggleSelected(item.id);
              else setViewerItem(item);
            }}
            aria-label={selectMode ? "Select photo" : "Open photo"}
          >
            <img
              src={item.img}
              alt={`photo-${item.id}`}
              loading="lazy"
              decoding="async"
              fetchPriority="low"
            />
            {item.type === "video" ? (
              <span className="phone-photos-thumb-video" aria-hidden>
                ▶
              </span>
            ) : null}
            {selectMode ? (
              <span
                className={clsx(
                  "phone-photos-thumb-select",
                  selectedIds.includes(item.id) && "is-selected"
                )}
                aria-hidden
              >
                {selectedIds.includes(item.id) ? <Check size={14} /> : null}
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </>
  );

  const renderAlbums = () => {
    if (albumOpen) {
      return (
        <>
          <div className="phone-photos-album-nav">
            <button
              type="button"
              className="phone-photos-back"
              onClick={() => setAlbumOpen(false)}
            >
              Albums
            </button>
            <p className="phone-photos-album-title">{activeAlbumTitle}</p>
            <span aria-hidden className="phone-photos-album-spacer" />
          </div>

          <div className="phone-photos-grid phone-photos-grid--album">
            {activeAlbumPhotos.map((item) => (
              <button
                key={item.id}
                type="button"
                className="phone-photos-thumb"
                onClick={() => {
                  if (selectMode) toggleSelected(item.id);
                  else setViewerItem(item);
                }}
                aria-label={selectMode ? "Select photo" : "Open photo"}
              >
                <img
                  src={item.img}
                  alt={`photo-${item.id}`}
                  loading="lazy"
                  decoding="async"
                  fetchPriority="low"
                />
                {item.type === "video" ? (
                  <span className="phone-photos-thumb-video" aria-hidden>
                    ▶
                  </span>
                ) : null}
                {selectMode ? (
                  <span
                    className={clsx(
                      "phone-photos-thumb-select",
                      selectedIds.includes(item.id) && "is-selected"
                    )}
                    aria-hidden
                  >
                    {selectedIds.includes(item.id) ? <Check size={14} /> : null}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </>
      );
    }

    return (
      <>
        <h3 className="phone-photos-large-title">Albums</h3>
        <div className="phone-photos-albums-grid">
          {albumCards.map((album) => (
            <button
              key={album.id}
              type="button"
              className={clsx(
                "phone-photos-album-card",
                album.id === activeTabId && "is-active"
              )}
              onClick={() => openAlbum(album.id)}
            >
              <div className="phone-photos-album-cover">
                {album.cover ? (
                  <img
                    src={album.cover}
                    alt={album.title}
                    loading="lazy"
                    decoding="async"
                    fetchPriority="low"
                  />
                ) : null}
              </div>
              <p className="phone-photos-album-name">{album.title}</p>
              <p className="phone-photos-album-count">{album.count}</p>
            </button>
          ))}
        </div>
      </>
    );
  };

  const renderSearch = () => (
    <>
      <h3 className="phone-photos-large-title">Search</h3>
      <div className="phone-photos-search phone-photos-search--standalone">
        <div className="phone-photos-searchbox">
          <Search size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search photos, people, places"
            aria-label="Search photos"
          />
        </div>
      </div>
      <div className="phone-photos-placeholder">
        <p>Search suggestions will appear here.</p>
      </div>
    </>
  );

  const renderForYou = () => (
    <>
      <h3 className="phone-photos-large-title">For You</h3>
      <div className="phone-photos-placeholder">
        <p>Memories and featured content will appear here.</p>
      </div>
    </>
  );

  return (
    <div className="phone-app phone-photos">
      <div className="phone-photos-nav" role="navigation" aria-label="Photos navigation">
        <span aria-hidden className="phone-photos-nav-spacer" />
        <p className="phone-photos-nav-title">
          {rootTab === "library"
            ? "Photos"
            : rootTab === "albums"
            ? albumOpen
              ? activeAlbumTitle
              : "Albums"
            : rootTab === "search"
            ? "Search"
            : "For You"}
        </p>
        <button
          type="button"
          className="phone-photos-nav-action"
          aria-label="Select"
          onClick={toggleSelectMode}
        >
          {selectMode ? "Done" : "Select"}
        </button>
      </div>

      <div ref={scrollRef} className="phone-photos-scroll">
        {rootTab === "library"
          ? renderLibrary()
          : rootTab === "albums"
          ? renderAlbums()
          : rootTab === "search"
          ? renderSearch()
          : renderForYou()}
      </div>

      <div className="phone-photos-tabbar" role="tablist" aria-label="Photos tabs">
        {phonePhotosTabs.map((t) => {
          const isActive = t.id === rootTab;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={clsx("phone-photos-tabbar-item", isActive && "is-active")}
              onClick={() => handleRootTabChange(t.id)}
            >
              <span className="phone-photos-tabbar-label">{t.label}</span>
            </button>
          );
        })}
      </div>

      {viewerItem ? (
        <div ref={viewerRef} className="phone-photos-viewer" role="dialog" aria-modal="true">
          <div ref={viewerBackdropRef} className="phone-photos-viewer-backdrop" />
          <div ref={viewerNavRef} className="phone-photos-viewer-nav">
            <button type="button" className="phone-photos-viewer-done" onClick={closeViewer}>
              Done
            </button>
            <div className="phone-photos-viewer-actions">
              <a
                className="phone-photos-viewer-action"
                href={viewerItem?.src ?? viewerItem?.img ?? undefined}
                target="_blank"
                rel="noreferrer"
                aria-label="Open in new tab"
              >
                <ExternalLink size={18} aria-hidden />
              </a>
              <button
                type="button"
                className="phone-photos-viewer-action"
                onClick={handleShare}
                aria-label="Share"
              >
                <Share2 size={18} aria-hidden />
              </button>
            </div>
          </div>

          <div
            ref={viewerBodyRef}
            className={clsx("phone-photos-viewer-body", viewerItem.type === "video" && "is-video")}
            onPointerDown={viewerItem.type === "video" ? undefined : handleViewerPointerDown}
            onPointerMove={viewerItem.type === "video" ? undefined : handleViewerPointerMove}
            onPointerUp={viewerItem.type === "video" ? undefined : handleViewerPointerUp}
            onPointerCancel={viewerItem.type === "video" ? undefined : handleViewerPointerUp}
          >
            {viewerItem.type === "video" ? (
              <video
                src={viewerItem.src}
                poster={viewerItem.img || undefined}
                controls
                playsInline
                autoPlay
                preload="metadata"
              />
            ) : (
              <img
                src={viewerItem.img}
                alt={`photo-${viewerItem.id}`}
                decoding="async"
              />
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default PhotosScreen;
