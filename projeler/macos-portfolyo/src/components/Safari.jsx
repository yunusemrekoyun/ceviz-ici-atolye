import { useEffect, useMemo, useState } from "react";

import { personalInfo, safariConfig } from "#constants";
import {
  ChevronLeft,
  ChevronRight,
  PanelLeft,
  ShieldHalf,
  Share,
  Plus,
  Copy,
} from "lucide-react";
import WindowWrapper from "#hoc/windowWrapper.jsx";
import WindowControls from "#components/WindowControls.jsx";
import { normalizeExternalUrl } from "@/utils/externalUrl.js";

const Safari = () => {
  const [view, setView] = useState("start");
  const [blogs, setBlogs] = useState(() => []);
  const [blogsLoaded, setBlogsLoaded] = useState(false);
  const [selectedBlogId, setSelectedBlogId] = useState(null);
  const [detailOrigin, setDetailOrigin] = useState("start");
  const isStartPage = view === "start";
  const isBlogsPage = view === "blogs";
  const isDetailPage = view === "detail";

  useEffect(() => {
    let isActive = true;

    const fetchBlogs = async () => {
      try {
        const response = await fetch("/api/blogs");
        const data = await response.json().catch(() => ({}));
        if (!isActive) return;
        if (response.ok && Array.isArray(data?.posts)) {
          const source = typeof data?.source === "string" ? data.source : "";
          const isPlaceholderSource = source === "seed" || source === "constants";
          setBlogs(isPlaceholderSource ? [] : data.posts);
        }
      } catch {
        // keep empty state
      } finally {
        if (isActive) setBlogsLoaded(true);
      }
    };

    fetchBlogs();
    return () => {
      isActive = false;
    };
  }, []);

  const visibleBlogs = useMemo(() => {
    const list = Array.isArray(blogs) ? blogs : [];
    return list.filter((post) => (post?.status ?? "live") !== "draft");
  }, [blogs]);

  const favoriteBlogsCount = safariConfig?.startPage?.favoriteBlogsCount ?? 3;
  const favoriteBlogs = visibleBlogs.slice(0, Math.max(0, favoriteBlogsCount));
  const selectedBlog = useMemo(
    () => visibleBlogs.find((post) => post.id === selectedBlogId) ?? null,
    [visibleBlogs, selectedBlogId]
  );
  const otherBlogs = useMemo(
    () => visibleBlogs.filter((post) => post.id !== selectedBlogId).slice(0, 2),
    [visibleBlogs, selectedBlogId]
  );

  const contentBlocks = useMemo(() => {
    const content = String(selectedBlog?.content ?? "").trim();
    if (!content) return [];
    return content
      .split(/\n{2,}/)
      .map((block) => block.trim())
      .filter(Boolean);
  }, [selectedBlog]);
  const readingTime = useMemo(() => {
    const text = `${selectedBlog?.summary ?? ""} ${selectedBlog?.content ?? ""}`.trim();
    if (!text) return 1;
    const words = text.split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 180));
  }, [selectedBlog]);

  const openAllBlogs = () => setView("blogs");
  const openStart = () => setView("start");
  const openBlogDetail = (post, origin) => {
    const blogId = Number(post?.id ?? 0);
    if (!blogId) return;
    setSelectedBlogId(blogId);
    setDetailOrigin(origin);
    setView("detail");
  };
  const closeDetail = () => {
    setView(detailOrigin === "blogs" ? "blogs" : "start");
  };
  const openExternalLink = () => {
    const url = normalizeExternalUrl(selectedBlog?.link);
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <div id="window-header" className="safari-toolbar">
        <WindowControls target="safari" />

        <div className="safari-toolbar-group">
          <button
            type="button"
            className="safari-toolbar-btn"
            aria-label={safariConfig.toolbar.sidebarAriaLabel}
            disabled
          >
            <PanelLeft className="icon" />
          </button>

          <button
            type="button"
            className="safari-toolbar-btn"
            aria-label={safariConfig.toolbar.backAriaLabel}
            onClick={isStartPage ? undefined : openStart}
            disabled={isStartPage}
          >
            <ChevronLeft className="icon" />
          </button>

          <button
            type="button"
            className="safari-toolbar-btn"
            aria-label={safariConfig.toolbar.forwardAriaLabel}
            disabled
          >
            <ChevronRight className="icon" />
          </button>
        </div>

        <div className="safari-addressbar">
          <ShieldHalf className="icon safari-shield" />

          <input
            type="text"
            placeholder={safariConfig.toolbar.addressPlaceholder}
            className="safari-address-input"
          />
        </div>

        <div className="safari-toolbar-group safari-toolbar-actions">
          <button
            type="button"
            className="safari-toolbar-btn"
            aria-label={safariConfig.toolbar.shareAriaLabel}
            disabled
          >
            <Share className="icon" />
          </button>
          <button
            type="button"
            className="safari-toolbar-btn"
            aria-label={safariConfig.toolbar.newTabAriaLabel}
            onClick={openStart}
            disabled={isStartPage}
          >
            <Plus className="icon" />
          </button>
          <button
            type="button"
            className="safari-toolbar-btn"
            aria-label={safariConfig.toolbar.copyAriaLabel}
            disabled
          >
            <Copy className="icon" />
          </button>
        </div>
      </div>

      <div className="safari-body">
        {isStartPage ? (
          <div className="safari-start">
            <section className="safari-section">
              <header className="safari-section-header">
                <h2 className="safari-section-title">
                  {safariConfig.startPage.favoriteBlogsTitle}
                </h2>
                <button
                  type="button"
                  className="safari-section-link"
                  onClick={openAllBlogs}
                  disabled={!visibleBlogs.length}
                >
                  {safariConfig.startPage.viewAllBlogsLabel}
                </button>
              </header>

              {!blogsLoaded ? (
                <div className="safari-empty">
                  <p className="safari-empty-title">
                    {safariConfig.startPage.loadingBlogsTitle}
                  </p>
                  <p className="safari-empty-subtitle">
                    {safariConfig.startPage.loadingBlogsSubtitle}
                  </p>
                </div>
              ) : favoriteBlogs.length ? (
                <div className="safari-grid safari-grid--blogs">
                  {favoriteBlogs.map(({ id, image, title, date }) => (
                    <button
                      key={id}
                      type="button"
                      className="safari-card safari-card--button"
                      onClick={() => openBlogDetail({ id }, "start")}
                      title={title}
                    >
                      <div className="safari-card-thumb">
                        {image ? <img src={image} alt={title} loading="lazy" /> : null}
                      </div>

                      <div className="safari-card-content">
                        <p className="safari-card-date">{date}</p>
                        <h3 className="safari-card-title">{title}</h3>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="safari-empty">
                  <p className="safari-empty-title">
                    {safariConfig.startPage.emptyBlogsTitle}
                  </p>
                  <p className="safari-empty-subtitle">
                    {safariConfig.startPage.emptyBlogsSubtitle}
                  </p>
                </div>
              )}
            </section>

            <section className="safari-section">
              <header className="safari-section-header">
                <h2 className="safari-section-title">
                  {safariConfig.startPage.webProjectsTitle}
                </h2>
              </header>

              <div className="safari-projects">
                <p className="safari-projects-soon">
                  {safariConfig.startPage.webProjectsComingSoonTitle}
                </p>
                <p className="safari-projects-desc">
                  {safariConfig.startPage.webProjectsComingSoonDescription}
                </p>

                <div className="safari-grid safari-grid--projects">
                  {safariConfig.startPage.webProjectsPlaceholders.map(
                    ({ id, title, subtitle }) => (
                      <div key={id} className="safari-placeholder">
                        <div className="safari-placeholder-thumb" aria-hidden />
                        <div className="safari-placeholder-content">
                          <p className="safari-placeholder-title">{title}</p>
                          <p className="safari-placeholder-subtitle">
                            {subtitle}
                          </p>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            </section>
          </div>
        ) : isBlogsPage ? (
          <div className="safari-blogs">
            <header className="safari-blogs-header">
              <div className="safari-blogs-titles">
                <h2 className="safari-section-title">
                  {safariConfig.allBlogsPage.title}
                </h2>
                <p className="safari-blogs-subtitle">
                  {safariConfig.allBlogsPage.subtitle}
                </p>
              </div>

              <button
                type="button"
                className="safari-section-link"
                onClick={openStart}
              >
                {safariConfig.allBlogsPage.backLabel}
              </button>
            </header>

            <div className="safari-grid safari-grid--all">
              {visibleBlogs.length ? (
                visibleBlogs.map(({ id, image, title, date, summary }) => (
                  <button
                    key={id}
                    type="button"
                    className="safari-card safari-card--button"
                    onClick={() => openBlogDetail({ id }, "blogs")}
                    title={title}
                  >
                    <div className="safari-card-thumb">
                      {image ? <img src={image} alt={title} loading="lazy" /> : null}
                    </div>

                    <div className="safari-card-content">
                      <p className="safari-card-date">{date}</p>
                      <h3 className="safari-card-title">{title}</h3>
                      {summary ? (
                        <p className="safari-card-summary">{summary}</p>
                      ) : null}
                    </div>
                  </button>
                ))
              ) : (
                <div className="safari-empty">
                  <p className="safari-empty-title">
                    {blogsLoaded
                      ? safariConfig.allBlogsPage.emptyBlogsTitle
                      : safariConfig.allBlogsPage.loadingBlogsTitle}
                  </p>
                  <p className="safari-empty-subtitle">
                    {blogsLoaded
                      ? safariConfig.allBlogsPage.emptyBlogsSubtitle
                      : safariConfig.allBlogsPage.loadingBlogsSubtitle}
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : isDetailPage ? (
          <div className="safari-detail">
            {selectedBlog ? (
              <div className="safari-detail-article">
                <header className="safari-detail-header">
                  <div className="safari-detail-titles">
                    <div className="safari-detail-meta">
                      <span className="safari-detail-date">{selectedBlog.date}</span>
                      <span className="safari-detail-dot" aria-hidden>
                        •
                      </span>
                      <span className="safari-detail-read">
                        {readingTime} {safariConfig.detailPage.readTimeLabel}
                      </span>
                    </div>
                    <h2 className="safari-detail-title">{selectedBlog.title}</h2>
                    {selectedBlog.summary ? (
                      <p className="safari-detail-summary">{selectedBlog.summary}</p>
                    ) : null}
                  </div>
                  <div className="safari-detail-actions">
                    <button
                      type="button"
                      className="safari-detail-button"
                      onClick={closeDetail}
                    >
                      {safariConfig.detailPage.backLabel}
                    </button>
                    <button
                      type="button"
                      className="safari-detail-button is-primary"
                      onClick={openExternalLink}
                      disabled={!selectedBlog.link}
                    >
                      {safariConfig.detailPage.openExternalLabel}
                    </button>
                  </div>
                </header>

                <div className="safari-detail-author">
                  {personalInfo?.avatar ? (
                    <img
                      className="safari-detail-author-avatar"
                      src={personalInfo.avatar}
                      alt={personalInfo.name}
                    />
                  ) : null}
                  <div>
                    <p className="safari-detail-author-name">
                      {safariConfig.detailPage.authorLabel} {personalInfo?.name}
                    </p>
                    <p className="safari-detail-author-role">
                      {personalInfo?.role}
                    </p>
                  </div>
                </div>

                {selectedBlog.image ? (
                  <div className="safari-detail-hero">
                    <img src={selectedBlog.image} alt={selectedBlog.title} />
                  </div>
                ) : null}

                <div className="safari-detail-content">
                  {contentBlocks.length ? (
                    contentBlocks.map((block, index) => (
                      <p
                        key={`${selectedBlog.id}-${index}`}
                        className={`safari-detail-paragraph${
                          index === 0 ? " is-lead" : ""
                        }`}
                      >
                        {block}
                      </p>
                    ))
                  ) : (
                    <div className="safari-empty">
                      <p className="safari-empty-title">
                        {safariConfig.detailPage.emptyContentTitle}
                      </p>
                      <p className="safari-empty-subtitle">
                        {safariConfig.detailPage.emptyContentSubtitle}
                      </p>
                    </div>
                  )}
                </div>

                {otherBlogs.length ? (
                  <div className="safari-detail-related">
                    <div className="safari-detail-related-header">
                      <h3 className="safari-detail-related-title">
                        {safariConfig.detailPage.relatedTitle}
                      </h3>
                      <p className="safari-detail-related-subtitle">
                        {safariConfig.detailPage.relatedSubtitle}
                      </p>
                    </div>
                    <div className="safari-detail-related-grid">
                      {otherBlogs.map(({ id, image, title, date }) => (
                        <button
                          key={id}
                          type="button"
                          className="safari-card safari-card--button safari-card--compact"
                          onClick={() => openBlogDetail({ id }, "blogs")}
                          title={title}
                        >
                          <div className="safari-card-thumb">
                            {image ? (
                              <img src={image} alt={title} loading="lazy" />
                            ) : null}
                          </div>
                          <div className="safari-card-content">
                            <p className="safari-card-date">{date}</p>
                            <h3 className="safari-card-title">{title}</h3>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="safari-empty">
                <p className="safari-empty-title">
                  {safariConfig.allBlogsPage.emptyBlogsTitle}
                </p>
                <p className="safari-empty-subtitle">
                  {safariConfig.allBlogsPage.emptyBlogsSubtitle}
                </p>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </>
  );
};

const SafariWindow = WindowWrapper(Safari, "safari");
export default SafariWindow;
