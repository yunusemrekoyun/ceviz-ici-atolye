"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Search,
  Share,
  SquareStack,
} from "lucide-react";
import { personalInfo, safariConfig } from "#constants";
import { normalizeExternalUrl } from "@/utils/externalUrl.js";

const PhoneSafariScreen = () => {
  const [view, setView] = useState("start");
  const [blogs, setBlogs] = useState(() => []);
  const [blogsLoaded, setBlogsLoaded] = useState(false);
  const [selectedBlogId, setSelectedBlogId] = useState(null);
  const [detailOrigin, setDetailOrigin] = useState("start");

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
    <div className="phone-safari">
      <div className="phone-safari-top">
        <div className="phone-safari-address">
          <Search size={14} aria-hidden />
          <span className="phone-safari-address-text">
            {safariConfig.toolbar.addressPlaceholder}
          </span>
        </div>
      </div>

      <div className="phone-safari-scroll">
        {view === "start" ? (
          <div className="phone-safari-start">
            <section className="phone-safari-section">
              <header className="phone-safari-section-header">
                <h3 className="phone-safari-section-title">
                  {safariConfig.startPage.favoriteBlogsTitle}
                </h3>
                <button
                  type="button"
                  className="phone-safari-section-link"
                  onClick={openAllBlogs}
                  disabled={!visibleBlogs.length}
                >
                  {safariConfig.startPage.viewAllBlogsLabel}
                </button>
              </header>

              {!blogsLoaded ? (
                <div className="phone-safari-empty">
                  <p className="phone-safari-empty-title">
                    {safariConfig.startPage.loadingBlogsTitle}
                  </p>
                  <p className="phone-safari-empty-subtitle">
                    {safariConfig.startPage.loadingBlogsSubtitle}
                  </p>
                </div>
              ) : favoriteBlogs.length ? (
                <div className="phone-safari-card-grid">
                  {favoriteBlogs.map(({ id, image, title, date }) => (
                    <button
                      key={id}
                      type="button"
                      className="phone-safari-card"
                      onClick={() => openBlogDetail({ id }, "start")}
                    >
                      <div className="phone-safari-card-thumb">
                        {image ? <img src={image} alt={title} loading="lazy" /> : null}
                      </div>
                      <div className="phone-safari-card-body">
                        <p className="phone-safari-card-date">{date}</p>
                        <p className="phone-safari-card-title">{title}</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="phone-safari-empty">
                  <p className="phone-safari-empty-title">
                    {safariConfig.startPage.emptyBlogsTitle}
                  </p>
                  <p className="phone-safari-empty-subtitle">
                    {safariConfig.startPage.emptyBlogsSubtitle}
                  </p>
                </div>
              )}
            </section>

            <section className="phone-safari-section">
              <header className="phone-safari-section-header">
                <h3 className="phone-safari-section-title">
                  {safariConfig.startPage.webProjectsTitle}
                </h3>
              </header>
              <div className="phone-safari-projects">
                <p className="phone-safari-projects-title">
                  {safariConfig.startPage.webProjectsComingSoonTitle}
                </p>
                <p className="phone-safari-projects-desc">
                  {safariConfig.startPage.webProjectsComingSoonDescription}
                </p>
                <div className="phone-safari-placeholder-grid">
                  {safariConfig.startPage.webProjectsPlaceholders.slice(0, 2).map(
                    ({ id, title, subtitle }) => (
                      <div key={id} className="phone-safari-placeholder">
                        <div className="phone-safari-placeholder-thumb" aria-hidden />
                        <div>
                          <p className="phone-safari-placeholder-title">{title}</p>
                          <p className="phone-safari-placeholder-subtitle">{subtitle}</p>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>
            </section>
          </div>
        ) : view === "blogs" ? (
          <div className="phone-safari-list">
            <header className="phone-safari-list-header">
              <button
                type="button"
                className="phone-safari-back"
                onClick={openStart}
              >
                <ChevronLeft size={16} aria-hidden />
                {safariConfig.allBlogsPage.backLabel}
              </button>
              <h3 className="phone-safari-list-title">
                {safariConfig.allBlogsPage.title}
              </h3>
            </header>

            <div className="phone-safari-list-grid">
              {visibleBlogs.length ? (
                visibleBlogs.map(({ id, image, title, date, summary }) => (
                  <button
                    key={id}
                    type="button"
                    className="phone-safari-card is-list"
                    onClick={() => openBlogDetail({ id }, "blogs")}
                  >
                    <div className="phone-safari-card-thumb">
                      {image ? <img src={image} alt={title} loading="lazy" /> : null}
                    </div>
                    <div className="phone-safari-card-body">
                      <p className="phone-safari-card-date">{date}</p>
                      <p className="phone-safari-card-title">{title}</p>
                      {summary ? (
                        <p className="phone-safari-card-summary">{summary}</p>
                      ) : null}
                    </div>
                  </button>
                ))
              ) : (
                <div className="phone-safari-empty">
                  <p className="phone-safari-empty-title">
                    {blogsLoaded
                      ? safariConfig.allBlogsPage.emptyBlogsTitle
                      : safariConfig.allBlogsPage.loadingBlogsTitle}
                  </p>
                  <p className="phone-safari-empty-subtitle">
                    {blogsLoaded
                      ? safariConfig.allBlogsPage.emptyBlogsSubtitle
                      : safariConfig.allBlogsPage.loadingBlogsSubtitle}
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="phone-safari-detail">
            {selectedBlog ? (
              <>
                <button
                  type="button"
                  className="phone-safari-back"
                  onClick={closeDetail}
                >
                  <ChevronLeft size={16} aria-hidden />
                  {safariConfig.detailPage.backLabel}
                </button>

                <div className="phone-safari-detail-meta">
                  <span>{selectedBlog.date}</span>
                  <span aria-hidden>•</span>
                  <span>
                    {readingTime} {safariConfig.detailPage.readTimeLabel}
                  </span>
                </div>
                <h2 className="phone-safari-detail-title">{selectedBlog.title}</h2>
                {selectedBlog.summary ? (
                  <p className="phone-safari-detail-summary">{selectedBlog.summary}</p>
                ) : null}

                <div className="phone-safari-detail-author">
                  {personalInfo?.avatar ? (
                    <img
                      src={personalInfo.avatar}
                      alt={personalInfo.name}
                      className="phone-safari-author-avatar"
                    />
                  ) : null}
                  <div>
                    <p className="phone-safari-author-name">
                      {safariConfig.detailPage.authorLabel} {personalInfo?.name}
                    </p>
                    <p className="phone-safari-author-role">{personalInfo?.role}</p>
                  </div>
                </div>

                {selectedBlog.image ? (
                  <div className="phone-safari-hero">
                    <img src={selectedBlog.image} alt={selectedBlog.title} />
                  </div>
                ) : null}

                <div className="phone-safari-detail-content">
                  {contentBlocks.length ? (
                    contentBlocks.map((block, index) => (
                      <p
                        key={`${selectedBlog.id}-${index}`}
                        className={`phone-safari-detail-paragraph${
                          index === 0 ? " is-lead" : ""
                        }`}
                      >
                        {block}
                      </p>
                    ))
                  ) : (
                    <div className="phone-safari-empty">
                      <p className="phone-safari-empty-title">
                        {safariConfig.detailPage.emptyContentTitle}
                      </p>
                      <p className="phone-safari-empty-subtitle">
                        {safariConfig.detailPage.emptyContentSubtitle}
                      </p>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className="phone-safari-link"
                  onClick={openExternalLink}
                  disabled={!selectedBlog.link}
                >
                  {safariConfig.detailPage.openExternalLabel}
                </button>
              </>
            ) : (
              <div className="phone-safari-empty">
                <p className="phone-safari-empty-title">
                  {safariConfig.allBlogsPage.emptyBlogsTitle}
                </p>
                <p className="phone-safari-empty-subtitle">
                  {safariConfig.allBlogsPage.emptyBlogsSubtitle}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="phone-safari-toolbar" role="toolbar" aria-label="Safari">
        <button type="button" className="phone-safari-toolbar-btn" aria-label="Back">
          <ChevronLeft size={18} />
        </button>
        <button type="button" className="phone-safari-toolbar-btn" aria-label="Forward">
          <ChevronRight size={18} />
        </button>
        <button type="button" className="phone-safari-toolbar-btn" aria-label="Share">
          <Share size={18} />
        </button>
        <button type="button" className="phone-safari-toolbar-btn" aria-label="Bookmarks">
          <BookOpen size={18} />
        </button>
        <button type="button" className="phone-safari-toolbar-btn" aria-label="Tabs">
          <SquareStack size={18} />
        </button>
      </div>
    </div>
  );
};

export default PhoneSafariScreen;
