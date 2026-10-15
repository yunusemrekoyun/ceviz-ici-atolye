import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import gsap from "gsap";
import {
  Briefcase,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  File,
  FileText,
  Folder,
  Globe,
  Image as ImageIcon,
  MoreHorizontal,
  Share2,
  Search,
  Trash2,
  User,
  Video,
} from "lucide-react";
import { phoneFinderOptionsSheetConfig, resumeConfig } from "#constants";
import PhoneActionSheet from "#components/phone/PhoneActionSheet.jsx";
import { normalizeExternalUrl } from "@/utils/externalUrl.js";

const LOCATION_META = {
  work: { icon: Briefcase, tint: "is-blue" },
  about: { icon: User, tint: "is-orange" },
  resume: { icon: FileText, tint: "is-green" },
  trash: { icon: Trash2, tint: "is-gray" },
};

const FILE_META = {
  txt: { icon: FileText, tint: "is-blue" },
  img: { icon: ImageIcon, tint: "is-purple" },
  url: { icon: Globe, tint: "is-blue" },
  pdf: { icon: FileText, tint: "is-red" },
  video: { icon: Video, tint: "is-red" },
};

const normalizeText = (value) =>
  String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const truncateLabel = (value, maxLength = 18) => {
  const text = String(value ?? "").trim();
  if (!text) return "";
  if (text.length <= maxLength) return text;
  const sliced = text.slice(0, Math.max(1, maxLength - 3)).trimEnd();
  return `${sliced}...`;
};

const getFinderRouteKey = ({ view, activeLocation, folderStack }) => {
  if (view === "browse") return "browse";
  const locId = activeLocation?.id ?? activeLocation?.type ?? "location";
  const stack =
    Array.isArray(folderStack) && folderStack.length
      ? folderStack.map((node) => node?.id ?? node?.name).join("/")
      : "";
  return `loc:${locId}/${stack}`;
};

const FinderScreen = ({ locations = [], activeLocation, onSelectLocation }) => {
  const [view, setView] = useState("browse"); // browse | location
  const [folderStack, setFolderStack] = useState([]);
  const [query, setQuery] = useState("");
  const [previewItem, setPreviewItem] = useState(null);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [transition, setTransition] = useState(null);
  const previewRef = useRef(null);
  const previewTlRef = useRef(null);
  const transitionTlRef = useRef(null);
  const fromPanelRef = useRef(null);
  const toPanelRef = useRef(null);
  const navTitleRef = useRef(null);
  const navLeftRef = useRef(null);
  const scrollPositionsRef = useRef(new Map());

  const currentFolder = folderStack.at(-1) ?? activeLocation;
  const items = currentFolder?.children;
  const isTransitioning = Boolean(transition);

  const filteredLocations = useMemo(() => {
    if (!query) return locations;
    const q = normalizeText(query);
    return locations.filter((loc) => normalizeText(loc.name).includes(q));
  }, [locations, query]);

  const filteredItems = useMemo(() => {
    const baseItems = Array.isArray(items) ? items : [];
    if (!query) return baseItems;
    const q = normalizeText(query);
    return baseItems.filter((item) => normalizeText(item.name).includes(q));
  }, [items, query]);

  const currentPathLabel = useMemo(() => {
    if (view === "browse") return "Browse";
    const base = activeLocation?.name ?? "Location";
    const path = folderStack.map((node) => node?.name).filter(Boolean);
    return [base, ...path].join(" / ");
  }, [activeLocation?.name, folderStack, view]);

  const handleCopyPath = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(currentPathLabel);
      }
    } catch {
      // ignore
    }
  };

  const handleOpenResume = () => {
    window.open(resumeConfig.viewUrl, "_blank", "noopener,noreferrer");
  };

  const startTransition = ({
    direction,
    nextView,
    nextFolderStack,
    nextQuery,
    nextActiveLocation,
  }) => {
    if (isTransitioning) return;

    const fromState = {
      view,
      folderStack,
      query,
      activeLocation,
    };
    const fromKey = getFinderRouteKey(fromState);
    const fromScrollTop = toPanelRef.current?.scrollTop ?? 0;
    scrollPositionsRef.current.set(fromKey, fromScrollTop);

    const toStateKey = getFinderRouteKey({
      view: nextView,
      folderStack: nextFolderStack,
      activeLocation: nextActiveLocation ?? activeLocation,
    });
    const toScrollTop =
      direction === "back" ? scrollPositionsRef.current.get(toStateKey) ?? 0 : 0;

    setTransition({ direction, from: fromState, fromScrollTop, toScrollTop });

    if (nextActiveLocation) onSelectLocation?.(nextActiveLocation);
    setFolderStack(nextFolderStack);
    setQuery(nextQuery);
    setView(nextView);
  };

  const openLocation = (loc) => {
    if (!loc || isTransitioning) return;
    startTransition({
      direction: "forward",
      nextView: "location",
      nextFolderStack: [],
      nextQuery: "",
      nextActiveLocation: loc,
    });
  };

  const goToBrowse = () => {
    if (view === "browse" || isTransitioning) return;
    setFolderStack([]);
    setQuery("");
    setView("browse");
  };

  const goBack = () => {
    if (folderStack.length > 0) {
      startTransition({
        direction: "back",
        nextView: "location",
        nextFolderStack: folderStack.slice(0, -1),
        nextQuery: "",
      });
      return;
    }

    startTransition({
      direction: "back",
      nextView: "browse",
      nextFolderStack: [],
      nextQuery: "",
    });
  };

  const openItem = (item) => {
    if (!item) return;
    if (item.kind === "folder" && Array.isArray(item.children)) {
      startTransition({
        direction: "forward",
        nextView: "location",
        nextFolderStack: [...folderStack, item],
        nextQuery: "",
      });
      return;
    }

    const href = normalizeExternalUrl(item.href || item.url || null);
    if (item.fileType === "url" && href) {
      window.open(href, "_blank", "noopener,noreferrer");
      return;
    }

    setPreviewItem(item);
  };

  useLayoutEffect(() => {
    if (!transition) return undefined;

    const fromEl = fromPanelRef.current;
    const toEl = toPanelRef.current;
    if (!fromEl || !toEl) return undefined;

    if (transitionTlRef.current) {
      transitionTlRef.current.kill();
      transitionTlRef.current = null;
    }

    const direction = transition.direction;
    const width = Math.max(
      320,
      fromEl.getBoundingClientRect().width || 0,
      toEl.getBoundingClientRect().width || 0
    );
    const edgeOffset = Math.round(width * 0.28);
    const inX = direction === "forward" ? width : -edgeOffset;
    const outX = direction === "forward" ? -edgeOffset : width;
    const fromOpacity = direction === "forward" ? 0.92 : 1;

    fromEl.scrollTop = transition.fromScrollTop ?? 0;
    toEl.scrollTop = transition.toScrollTop ?? 0;

    gsap.set([fromEl, toEl], { willChange: "transform, opacity" });
    gsap.set(fromEl, { x: 0, opacity: 1 });
    gsap.set(toEl, { x: inX, opacity: 1 });

    const titleEl = navTitleRef.current;
    const leftEl = navLeftRef.current;
    const navTargets = [titleEl, leftEl].filter(Boolean);
    if (navTargets.length) gsap.killTweensOf(navTargets);

    if (titleEl) {
      gsap.fromTo(
        titleEl,
        { x: direction === "forward" ? 10 : -10, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.24, ease: "power2.out", overwrite: "auto" }
      );
    }
    if (leftEl) {
      gsap.fromTo(
        leftEl,
        { x: direction === "forward" ? 6 : -6, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.22, ease: "power2.out", overwrite: "auto" }
      );
    }

    const tl = gsap.timeline({
      defaults: { overwrite: "auto", ease: "power2.out" },
      onComplete: () => {
        transitionTlRef.current = null;
        setTransition(null);
      },
    });

    tl.to(fromEl, { x: outX, opacity: fromOpacity, duration: 0.24 }, 0).to(
      toEl,
      { x: 0, opacity: 1, duration: 0.3 },
      0
    );
    tl.set([fromEl, toEl], { clearProps: "willChange" });
    tl.set(toEl, { clearProps: "transform" });

    transitionTlRef.current = tl;

    return () => {
      tl.kill();
      transitionTlRef.current = null;
    };
  }, [transition]);

  const closePreview = () => {
    const el = previewRef.current;
    if (!el) {
      setPreviewItem(null);
      return;
    }

    if (previewTlRef.current) previewTlRef.current.kill();
    previewTlRef.current = gsap.to(el, {
      y: 14,
      opacity: 0,
      scale: 0.985,
      duration: 0.18,
      ease: "power2.in",
      onComplete: () => {
        setPreviewItem(null);
      },
    });
  };

  useEffect(() => {
    if (!previewItem) return undefined;
    const el = previewRef.current;
    if (!el) return undefined;

    if (previewTlRef.current) previewTlRef.current.kill();
    gsap.set(el, { y: 18, opacity: 0, scale: 0.985 });
    previewTlRef.current = gsap.to(el, {
      y: 0,
      opacity: 1,
      scale: 1,
      duration: 0.26,
      ease: "power3.out",
    });

    return () => {
      if (previewTlRef.current) {
        previewTlRef.current.kill();
        previewTlRef.current = null;
      }
    };
  }, [previewItem]);

  const backLabel = (() => {
    if (view === "browse") return "";
    if (folderStack.length === 0) return "Browse";
    if (folderStack.length === 1) return activeLocation?.name ?? "Browse";
    return folderStack.at(-2)?.name ?? activeLocation?.name ?? "Browse";
  })();
  const backLabelShort = truncateLabel(backLabel, 18);

  const navTitle =
    view === "browse" ? "" : currentFolder?.name ?? activeLocation?.name ?? "Files";

  const previewKind = previewItem?.fileType ?? null;
  const previewTitle = previewItem?.name ?? "Preview";
  const previewImageSrc =
    previewItem?.imageUrl || previewItem?.img || previewItem?.src || null;
  const previewPdfSrc =
    previewItem?.href || previewItem?.fileUrl || resumeConfig.viewUrl;
  const previewVideoSrc =
    previewItem?.videoUrl || previewItem?.href || previewItem?.src || null;
  const previewPosterSrc = previewItem?.posterUrl || null;
  const previewTextContent = Array.isArray(previewItem?.description)
    ? previewItem.description
    : previewItem?.description
    ? [previewItem.description]
    : [];

  const handleShare = async () => {
    if (!previewItem) return;

    const shareUrl =
      previewKind === "pdf"
        ? previewPdfSrc
        : previewKind === "img"
        ? previewImageSrc
        : previewKind === "video"
        ? previewVideoSrc
        : previewItem?.href || null;

    if (!shareUrl) return;

    try {
      if (navigator.share) {
        await navigator.share({ title: previewTitle, url: shareUrl });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      }
    } catch {
      // ignore
    }
  };

  const renderContent = ({
    contentView,
    contentQuery,
    contentFilteredLocations,
    contentFilteredItems,
    readOnly = false,
  }) => (
    <>
      {contentView === "browse" && <h3 className="phone-finder-large-title">Browse</h3>}

      <div className={clsx("phone-finder-search", contentView !== "browse" && "is-compact")}>
        <div className="phone-finder-searchbox">
          <Search size={16} />
          <input
            value={contentQuery}
            onChange={
              readOnly
                ? undefined
                : (e) => setQuery(e.target.value)
            }
            placeholder="Search"
            aria-label="Search files"
            readOnly={readOnly}
            tabIndex={readOnly ? -1 : 0}
          />
        </div>
      </div>

      {contentView === "browse" ? (
        <div className="phone-finder-section">
          <p className="phone-finder-section-title">Locations</p>
          <div className="phone-finder-list">
            {contentFilteredLocations.map((loc) => {
              const meta = LOCATION_META[loc.type] ?? LOCATION_META.work;
              const Icon = meta.icon;
              return (
                <button
                  key={loc.id}
                  type="button"
                  className="phone-finder-row"
                  onClick={readOnly ? undefined : () => openLocation(loc)}
                  tabIndex={readOnly ? -1 : 0}
                >
                  <span className={clsx("phone-finder-row-icon", meta.tint)}>
                    <Icon size={18} />
                  </span>
                  <span className="phone-finder-row-text">{loc.name}</span>
                  <ChevronRight size={18} className="phone-finder-row-chevron" />
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="phone-finder-section">
          <div className="phone-finder-list">
            {contentFilteredItems.map((item) => {
              const meta =
                item.kind === "folder"
                  ? { icon: Folder, tint: "is-blue" }
                  : FILE_META[item.fileType] ?? { icon: File, tint: "is-blue" };
              const Icon = meta.icon;
              const subtitle =
                item.kind === "folder"
                  ? "Folder"
                  : item.fileType?.toUpperCase?.() ?? "File";
              return (
                <button
                  key={item.id}
                  type="button"
                  className="phone-finder-row"
                  onClick={readOnly ? undefined : () => openItem(item)}
                  tabIndex={readOnly ? -1 : 0}
                >
                  <span className={clsx("phone-finder-row-icon", meta.tint)}>
                    <Icon size={18} />
                  </span>
                  <span className="phone-finder-row-main">
                    <span className="phone-finder-row-title">{item.name}</span>
                    <span className="phone-finder-row-subtitle">{subtitle}</span>
                  </span>
                  {item.kind === "folder" ? (
                    <ChevronRight size={18} className="phone-finder-row-chevron" />
                  ) : (
                    <span aria-hidden className="phone-finder-row-chevron-spacer" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );

  const fromState = transition?.from ?? null;
  const fromFilteredLocations = useMemo(() => {
    if (!fromState) return [];
    if (!fromState.query) return locations;
    const q = normalizeText(fromState.query);
    return locations.filter((loc) => normalizeText(loc.name).includes(q));
  }, [fromState, locations]);

  const fromFilteredItems = useMemo(() => {
    if (!fromState) return [];
    const fromFolder = fromState.folderStack.at(-1) ?? fromState.activeLocation;
    const baseItems = Array.isArray(fromFolder?.children) ? fromFolder.children : [];
    if (!fromState.query) return baseItems;
    const q = normalizeText(fromState.query);
    return baseItems.filter((item) => normalizeText(item.name).includes(q));
  }, [fromState]);

  return (
    <div className="phone-app phone-finder">
      <div className="phone-finder-nav" role="navigation" aria-label="Files navigation">
        <div className="phone-finder-nav-left" ref={navLeftRef}>
          {view !== "browse" ? (
            <button
              type="button"
              className="phone-finder-nav-btn"
              onClick={goBack}
              disabled={isTransitioning}
            >
              <ChevronLeft size={18} />
              <span>{backLabelShort}</span>
            </button>
          ) : (
            <span aria-hidden className="phone-finder-nav-spacer" />
          )}
        </div>
        <p ref={navTitleRef} className="phone-finder-nav-title">
          {navTitle}
        </p>
        <div className="phone-finder-nav-right">
          <button
            type="button"
            className="phone-finder-nav-action"
            aria-label="More options"
            onClick={() => setOptionsOpen(true)}
            disabled={isTransitioning}
          >
            <MoreHorizontal size={20} aria-hidden />
          </button>
        </div>
      </div>

      {previewItem ? (
        <div
          ref={previewRef}
          className={clsx(
            "phone-finder-preview",
            previewKind === "img" && "is-image",
            previewKind === "video" && "is-video"
          )}
          role="dialog"
          aria-modal="true"
          aria-label={previewTitle}
        >
          <div className="phone-finder-preview-nav">
            <button
              type="button"
              className="phone-finder-preview-done"
              onClick={closePreview}
            >
              Done
            </button>
            <p className="phone-finder-preview-title">{previewTitle}</p>
            <div className="phone-finder-preview-actions">
              {previewKind === "pdf" ? (
                <a
                  className="phone-finder-preview-action"
                  href={previewPdfSrc}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Open in new tab"
                >
                  <ExternalLink size={18} aria-hidden />
                </a>
              ) : null}
              {previewKind === "img" && previewImageSrc ? (
                <a
                  className="phone-finder-preview-action"
                  href={previewImageSrc}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Open in new tab"
                >
                  <ExternalLink size={18} aria-hidden />
                </a>
              ) : null}
              {previewKind === "video" && previewVideoSrc ? (
                <a
                  className="phone-finder-preview-action"
                  href={previewVideoSrc}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Open in new tab"
                >
                  <ExternalLink size={18} aria-hidden />
                </a>
              ) : null}
              <button
                type="button"
                className="phone-finder-preview-action"
                onClick={handleShare}
                aria-label="Share"
              >
                <Share2 size={18} aria-hidden />
              </button>
            </div>
          </div>

          <div className="phone-finder-preview-body">
            {previewKind === "img" ? (
              previewImageSrc ? (
                <div className="phone-finder-preview-image">
                  <img src={previewImageSrc} alt={previewTitle} />
                </div>
              ) : (
                <div className="phone-finder-preview-empty">
                  <p>No image available.</p>
                </div>
              )
            ) : null}

            {previewKind === "pdf" ? (
              <iframe
                title={previewTitle}
                className="phone-finder-preview-pdf"
                src={previewPdfSrc}
              />
            ) : null}

            {previewKind === "video" ? (
              previewVideoSrc ? (
                <div className="phone-finder-preview-video">
                  <video
                    src={previewVideoSrc}
                    poster={previewPosterSrc || undefined}
                    controls
                    playsInline
                  />
                </div>
              ) : (
                <div className="phone-finder-preview-empty">
                  <p>No video available.</p>
                </div>
              )
            ) : null}

            {previewKind === "txt" ? (
              <div className="phone-finder-preview-text">
                {previewItem?.image ? (
                  <div className="phone-finder-preview-hero">
                    <img src={previewItem.image} alt={previewTitle} />
                  </div>
                ) : null}

                {previewItem?.subtitle ? (
                  <p className="phone-finder-preview-subtitle">
                    {previewItem.subtitle}
                  </p>
                ) : null}

                {previewTextContent.length ? (
                  <div className="phone-finder-preview-paragraphs">
                    {previewTextContent.map((line, idx) => (
                      <p key={idx}>{line}</p>
                    ))}
                  </div>
                ) : (
                  <p className="phone-finder-preview-empty">No content available.</p>
                )}
              </div>
            ) : null}

            {previewKind !== "img" &&
            previewKind !== "pdf" &&
            previewKind !== "txt" &&
            previewKind !== "video" ? (
              <div className="phone-finder-preview-empty">
                <p>Preview not available.</p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div
        className={clsx(
          "phone-finder-content",
          isTransitioning && "is-transitioning",
          transition?.direction === "back" && "is-back"
        )}
        aria-busy={isTransitioning || undefined}
      >
        {transition ? (
          <div
            ref={fromPanelRef}
            className="phone-finder-content-panel is-from"
            aria-hidden="true"
          >
            {renderContent({
              contentView: fromState?.view ?? "browse",
              contentQuery: fromState?.query ?? "",
              contentFilteredLocations: fromFilteredLocations,
              contentFilteredItems: fromFilteredItems,
              readOnly: true,
            })}
          </div>
        ) : null}

        <div
          ref={toPanelRef}
          className={clsx("phone-finder-content-panel", transition && "is-to")}
        >
          {renderContent({
            contentView: view,
            contentQuery: query,
            contentFilteredLocations: filteredLocations,
            contentFilteredItems: filteredItems,
          })}
        </div>
      </div>

      <PhoneActionSheet
        open={optionsOpen}
        title={phoneFinderOptionsSheetConfig.title}
        message={currentPathLabel}
        actions={[
          view !== "browse"
            ? {
                id: "browse",
                label: phoneFinderOptionsSheetConfig.actions.browseLocations,
                onPress: goToBrowse,
              }
            : null,
          query
            ? {
                id: "clear",
                label: phoneFinderOptionsSheetConfig.actions.clearSearch,
                onPress: () => setQuery(""),
              }
            : null,
          {
            id: "copy",
            label: phoneFinderOptionsSheetConfig.actions.copyPath,
            onPress: handleCopyPath,
          },
          {
            id: "resume",
            label: phoneFinderOptionsSheetConfig.actions.openResume,
            onPress: handleOpenResume,
          },
        ].filter(Boolean)}
        onClose={() => setOptionsOpen(false)}
      />
    </div>
  );
};

export default FinderScreen;
