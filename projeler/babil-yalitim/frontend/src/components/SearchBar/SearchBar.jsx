import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { FaSearch } from "react-icons/fa";
import { X } from "lucide-react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import api from "../../api";
import { useLocale } from "../../i18n/LocaleContext.jsx";
import { localizePath, stripLocalePrefix } from "../../i18n/routing.js";

const normalizeTypeToPath = (type = "", id = "", fallbackPath = "") => {
  if (fallbackPath) return fallbackPath;

  const t = String(type).toLowerCase();
  if (!id) return null;
  if (t.startsWith("blog")) return `/blog/${id}`;
  if (t.startsWith("journal") || t.startsWith("news")) return `/journals/${id}`;
  if (t.startsWith("project")) return `/project-detail/${id}`;
  if (t.startsWith("service")) return `/services/${id}`;
  if (t.startsWith("about")) return "/about";
  if (t.startsWith("contact") || t.startsWith("iletisim")) return "/iletisim";
  if (t.startsWith("whyus")) return "/whyus";
  if (t.startsWith("kvkk")) return "/kvkk";
  return null;
};

const typeLabelMap = {
  tr: {
    blog: "Blog",
    blogs: "Blog",
    journal: "Haberler",
    journals: "Haberler",
    news: "Haberler",
    project: "Projeler",
    projects: "Projeler",
    "project-detail": "Projeler",
    service: "Hizmetler",
    services: "Hizmetler",
    about: "Hakkımızda",
    whyus: "Neden Biz?",
    contact: "İletişim",
    iletisim: "İletişim",
    kvkk: "KVKK",
  },
  en: {
    blog: "Blog",
    blogs: "Blog",
    journal: "News",
    journals: "News",
    news: "News",
    project: "Projects",
    projects: "Projects",
    "project-detail": "Projects",
    service: "Services",
    services: "Services",
    about: "About",
    whyus: "Why Us?",
    contact: "Contact",
    iletisim: "Contact",
    kvkk: "KVKK",
  },
};

const getTypeLabel = (item = {}, locale = "tr") => {
  const labels = typeLabelMap[locale] || typeLabelMap.tr;
  const type = String(item.type || "").toLowerCase();
  if (type && labels[type]) return labels[type];

  const path = stripLocalePrefix(String(item.path || item.pathname || ""));
  if (!path.startsWith("/")) return locale === "en" ? "Other" : "Diğer";

  const segment = path.split("/")[1] || "";
  return labels[segment] || (locale === "en" ? "Other" : "Diğer");
};

const getResultKey = (item = {}, index = 0) =>
  item._id || item.id || item.path || `${item.type || "result"}-${index}`;

const SearchInput = ({
  inputRef,
  value,
  onChange,
  onKeyDown,
  onFocus,
  onBlur,
  placeholder,
  inputClassName,
  iconClassName,
}) => (
  <div className="relative w-full">
    <input
      ref={inputRef}
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      onBlur={onBlur}
      className={inputClassName}
      aria-autocomplete="list"
      aria-expanded={value.trim().length >= 2}
      aria-controls="global-search-results"
      inputMode="search"
      enterKeyHint="search"
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
    />
    <FaSearch className={iconClassName} />
  </div>
);

SearchInput.propTypes = {
  inputRef: PropTypes.shape({ current: PropTypes.any }),
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onKeyDown: PropTypes.func.isRequired,
  onFocus: PropTypes.func,
  onBlur: PropTypes.func,
  placeholder: PropTypes.string.isRequired,
  inputClassName: PropTypes.string.isRequired,
  iconClassName: PropTypes.string.isRequired,
};

const SearchResultList = ({
  results,
  highlightIndex,
  onHover,
  onPick,
  mode = "dropdown",
  locale = "tr",
}) => {
  if (!results.length) return null;

  const isOverlay = mode === "overlay";

  return (
    <ul
      id="global-search-results"
      role="listbox"
      className={isOverlay ? "space-y-3" : "overflow-y-auto py-2"}
    >
      {results.map((item, index) => {
        const active = index === highlightIndex;
        const matchedFields = Array.isArray(item.matchedFields)
          ? item.matchedFields
          : [];

        return (
          <li
            key={getResultKey(item, index)}
            role="option"
            aria-selected={active}
            onMouseEnter={() => onHover(index)}
            onMouseDown={(event) => {
              event.preventDefault();
              onPick(item);
            }}
            className={
              isOverlay
                ? `cursor-pointer rounded-3xl border px-5 py-4 transition ${
                    active
                      ? "border-quaternaryColor/40 bg-white/95 shadow-[0_22px_40px_-28px_rgba(15,23,42,0.45)]"
                      : "border-white/70 bg-white/80 hover:border-white hover:bg-white/92"
                  }`
                : `cursor-pointer px-5 py-3 transition ${
                    active ? "bg-slate-100/95" : "hover:bg-slate-50"
                  }`
            }
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="line-clamp-1 text-sm font-semibold text-slate-900 sm:text-[15px]">
                    {item.title}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {getTypeLabel(item, locale)}
                  </span>
                </div>

                {item.excerpt ? (
                  <p
                    className={`text-slate-600 ${
                      isOverlay ? "line-clamp-2 text-sm leading-6" : "line-clamp-1 text-[11px]"
                    }`}
                  >
                    {item.excerpt}
                  </p>
                ) : null}

                {matchedFields.length ? (
                  <div className="flex flex-wrap gap-2">
                    {matchedFields.slice(0, isOverlay ? 4 : 2).map((field) => (
                      <span
                        key={`${getResultKey(item, index)}-${field}`}
                        className="rounded-full bg-slate-900/5 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500"
                      >
                        {field}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              <span className="shrink-0 text-xs font-medium text-slate-400">
                {isOverlay
                  ? locale === "en"
                    ? "Open"
                    : "İncele"
                  : getTypeLabel(item, locale)}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
};

SearchResultList.propTypes = {
  results: PropTypes.arrayOf(
    PropTypes.shape({
      _id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      path: PropTypes.string,
      type: PropTypes.string,
      title: PropTypes.string,
      excerpt: PropTypes.string,
      matchedFields: PropTypes.arrayOf(PropTypes.string),
    })
  ).isRequired,
  highlightIndex: PropTypes.number.isRequired,
  onHover: PropTypes.func.isRequired,
  onPick: PropTypes.func.isRequired,
  mode: PropTypes.oneOf(["dropdown", "overlay"]),
  locale: PropTypes.oneOf(["tr", "en"]),
};

const SearchBar = ({ onFocusChange }) => {
  const { locale } = useLocale();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [dropdownPos, setDropdownPos] = useState(null);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [overlayOrigin, setOverlayOrigin] = useState(null);
  const [isDesktopInputActive, setIsDesktopInputActive] = useState(false);
  const [viewport, setViewport] = useState(() => ({
    width: typeof window !== "undefined" ? window.innerWidth : 1440,
    height: typeof window !== "undefined" ? window.innerHeight : 900,
  }));

  const navigate = useNavigate();

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const overlayInputRef = useRef(null);
  const dropdownRef = useRef(null);
  const dropdownCloseTimerRef = useRef(null);
  const searchRequestSeqRef = useRef(0);
  const overlayOpenRef = useRef(false);
  const desktopInputActiveRef = useRef(false);

  const resultLimit = overlayOpen ? 24 : 7;
  const isMobileViewport = viewport.width < 768;
  const copy =
    locale === "en"
      ? {
          openSearch: "Open search",
          searchPlaceholder: "How can we help?",
          overlayPlaceholder:
            "Search titles, categories, service areas, or content",
          closeSearchLayer: "Close search layer",
          close: "Close",
          smartSearch: "Smart Search",
          smartSearchText:
            "Results are ranked by title, category, tag, sub-service, and content matches.",
          startSearching: "Start searching",
          resultsCount: (count) => `${count} results`,
          refineSearch: "Refine your search",
          refineSearchText:
            "Try a service name, project category, blog tag, news content, or a sub-service area.",
          noResults: "No results found",
          noResultsText:
            "Try a different keyword, category, or a shorter phrase.",
          searchError: "Search error:",
        }
      : {
          openSearch: "Aramayı aç",
          searchPlaceholder: "Nasıl yardımcı olabiliriz?",
          overlayPlaceholder:
            "Başlık, kategori, hizmet alanı veya içerik ara",
          closeSearchLayer: "Arama katmanını kapat",
          close: "Kapat",
          smartSearch: "Akıllı Arama",
          smartSearchText:
            "Başlık, kategori, etiket, alt hizmet ve içerik eşleşmelerine göre sıralanır.",
          startSearching: "Aramaya başla",
          resultsCount: (count) => `${count} sonuç`,
          refineSearch: "Aramayı derinleştir",
          refineSearchText:
            "Hizmet adı, proje kategorisi, blog etiketi, haber içeriği veya alt hizmet alanı gibi ifadeler yaz.",
          noResults: "Sonuç bulunamadı",
          noResultsText:
            "Farklı bir anahtar kelime, kategori veya daha kısa bir ifade dene.",
          searchError: "Arama hatası:",
        };

  const overlayFrame = useMemo(() => {
    const mobile = viewport.width < 768;
    const insetX = mobile ? 10 : 28;
    const insetY = mobile ? 12 : 26;
    const width = Math.min(viewport.width - insetX * 2, 1120);
    const height = Math.min(
      viewport.height - insetY * 2,
      mobile ? viewport.height - 24 : viewport.height * 0.88
    );

    return {
      left: Math.max(insetX, Math.round((viewport.width - width) / 2)),
      top: Math.max(insetY, Math.round((viewport.height - height) / 2)),
      width,
      height,
    };
  }, [viewport.height, viewport.width]);

  const updateDropdownPos = useCallback(() => {
    const anchor = containerRef.current;
    if (!anchor || overlayOpen) return;

    const rect = anchor.getBoundingClientRect();
    const width = Math.min(rect.width, viewport.width - 24);
    const left = Math.min(
      Math.max(12, rect.left),
      Math.max(12, viewport.width - width - 12)
    );
    const preferredTop = rect.bottom + 6;
    const spaceBelow = viewport.height - preferredTop - 12;
    const spaceAbove = rect.top - 12;
    const openAbove = spaceBelow < 220 && spaceAbove > spaceBelow;
    const maxHeight = Math.max(
      180,
      Math.min(openAbove ? spaceAbove - 6 : spaceBelow, viewport.height * 0.56)
    );

    setDropdownPos({
      left,
      top: openAbove ? Math.max(12, rect.top - maxHeight - 6) : preferredTop,
      width,
      maxHeight,
    });
  }, [overlayOpen, viewport.height, viewport.width]);

  const syncViewport = useCallback(() => {
    setViewport({
      width: window.innerWidth,
      height: window.innerHeight,
    });
  }, []);

  const closeSuggestions = useCallback(
    ({ clearResults = true } = {}) => {
      searchRequestSeqRef.current += 1;
      if (dropdownCloseTimerRef.current) {
        window.clearTimeout(dropdownCloseTimerRef.current);
        dropdownCloseTimerRef.current = null;
      }

      setDropdownVisible(false);
      setHighlightIndex(-1);

      if (!overlayOpen && clearResults) {
        dropdownCloseTimerRef.current = window.setTimeout(() => {
          setResults([]);
          setDropdownPos(null);
          dropdownCloseTimerRef.current = null;
        }, 180);
      }
    },
    [overlayOpen]
  );

  const openSuggestions = useCallback(() => {
    if (dropdownCloseTimerRef.current) {
      window.clearTimeout(dropdownCloseTimerRef.current);
      dropdownCloseTimerRef.current = null;
    }
    setDropdownVisible(true);
  }, []);

  const handleSearchFocus = useCallback(() => {
    setIsDesktopInputActive(true);
    onFocusChange?.(true);
  }, [onFocusChange]);

  const handleSearchBlur = useCallback(() => {
    window.setTimeout(() => {
      const active = document.activeElement;
      const stillInsideSearch =
        active instanceof Node &&
        (containerRef.current?.contains(active) || dropdownRef.current?.contains(active));

      if (!stillInsideSearch && !overlayOpen) {
        setIsDesktopInputActive(false);
        onFocusChange?.(false);
      }
    }, 40);
  }, [onFocusChange, overlayOpen]);

  useEffect(() => {
    return () => {
      if (dropdownCloseTimerRef.current) {
        window.clearTimeout(dropdownCloseTimerRef.current);
      }
    };
  }, []);

  const closeOverlay = useCallback(() => {
    searchRequestSeqRef.current += 1;
    setOverlayOpen(false);
    setOverlayOrigin(null);
    setDropdownVisible(false);
    onFocusChange?.(false);
  }, [onFocusChange]);

  const openOverlay = useCallback(() => {
    if (typeof window === "undefined") return;

    const rect = containerRef.current?.getBoundingClientRect();
    const fallbackWidth = Math.min(window.innerWidth - 24, 720);
    const fallbackLeft = Math.max(12, (window.innerWidth - fallbackWidth) / 2);

    setOverlayOrigin({
      left: rect?.left ?? fallbackLeft,
      top: rect?.top ?? 20,
      width: rect?.width ?? fallbackWidth,
      height: rect?.height ?? 56,
    });
    setOverlayOpen(true);
    setDropdownVisible(false);
    onFocusChange?.(true);
  }, [onFocusChange]);

  const handleMobileTrigger = useCallback(
    (event) => {
      if (!isMobileViewport) return;
      event.preventDefault();
      openOverlay();
    },
    [isMobileViewport, openOverlay]
  );

  useEffect(() => {
    overlayOpenRef.current = overlayOpen;
  }, [overlayOpen]);

  useEffect(() => {
    desktopInputActiveRef.current = isDesktopInputActive;
  }, [isDesktopInputActive]);

  const go = useCallback(
    (item) => {
      const id = item?._id || item?.id || item?.slug;
      const path = normalizeTypeToPath(item?.type, id, item?.path);
      if (!path) return;

      navigate(localizePath(path, locale));
      setQuery("");
      setResults([]);
      setHighlightIndex(-1);
      setDropdownVisible(false);
      setDropdownPos(null);
      closeOverlay();
    },
    [closeOverlay, locale, navigate]
  );

  useEffect(() => {
    const trimmed = query.trim();
    const shouldSearch =
      overlayOpen || (!isMobileViewport && isDesktopInputActive);

    if (trimmed.length < 2 || !shouldSearch) {
      searchRequestSeqRef.current += 1;
      if (dropdownCloseTimerRef.current) {
        window.clearTimeout(dropdownCloseTimerRef.current);
        dropdownCloseTimerRef.current = null;
      }
      setDropdownVisible(false);
      setResults([]);
      setHighlightIndex(-1);
      if (!overlayOpen) setDropdownPos(null);
      return;
    }

    const requestSeq = ++searchRequestSeqRef.current;
    let cancelled = false;

    const timer = setTimeout(() => {
      api
        .get(
          `/search?q=${encodeURIComponent(trimmed)}&limit=${resultLimit}&locale=${locale}`
        )
        .then((response) => {
          if (
            cancelled ||
            requestSeq !== searchRequestSeqRef.current ||
            (!overlayOpenRef.current && !desktopInputActiveRef.current)
          ) {
            return;
          }

          const items = Array.isArray(response.data) ? response.data : [];
          setResults(items);
          setHighlightIndex(items.length ? 0 : -1);
          if (!overlayOpenRef.current) {
            updateDropdownPos();
            if (desktopInputActiveRef.current && items.length) {
              openSuggestions();
            } else {
              setDropdownVisible(false);
            }
          }
        })
        .catch((error) => {
          if (cancelled || requestSeq !== searchRequestSeqRef.current) return;
          console.error(copy.searchError, error);
          setDropdownVisible(false);
          setResults([]);
          setHighlightIndex(-1);
        });
    }, overlayOpen ? 120 : 220);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    copy.searchError,
    isDesktopInputActive,
    isMobileViewport,
    locale,
    openSuggestions,
    overlayOpen,
    query,
    resultLimit,
    updateDropdownPos,
  ]);

  useEffect(() => {
    const handleResize = () => {
      syncViewport();
      if (results.length && !overlayOpen) updateDropdownPos();
    };

    const handleScroll = (event) => {
      if (overlayOpen || !results.length) return;
      const target = event.target;
      const insideDropdown =
        target instanceof Node && dropdownRef.current?.contains(target);
      const insideAnchor =
        target instanceof Node && containerRef.current?.contains(target);

      if (insideDropdown || insideAnchor) return;

      closeSuggestions();
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [closeSuggestions, overlayOpen, results.length, syncViewport, updateDropdownPos]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const insideAnchor = containerRef.current?.contains(event.target);
      const insideDropdown = dropdownRef.current?.contains(event.target);
      if (!insideAnchor && !insideDropdown && !overlayOpen) {
        closeSuggestions();
      }
    };

    document.addEventListener("pointerdown", handleClickOutside);
    return () => document.removeEventListener("pointerdown", handleClickOutside);
  }, [closeSuggestions, overlayOpen]);

  useEffect(() => {
    if (!overlayOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const timer = window.setTimeout(() => {
      overlayInputRef.current?.focus();
      overlayInputRef.current?.setSelectionRange(query.length, query.length);
    }, 160);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(timer);
    };
  }, [overlayOpen, query.length]);

  const handleKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      if (overlayOpen) {
        closeOverlay();
      } else {
        closeSuggestions();
      }
      return;
    }

    if (!results.length && event.key !== "Enter") return;

    if (event.key === "ArrowDown" && results.length) {
      event.preventDefault();
      setHighlightIndex((current) => (current + 1) % results.length);
      return;
    }

    if (event.key === "ArrowUp" && results.length) {
      event.preventDefault();
      setHighlightIndex((current) =>
        (current - 1 + results.length) % results.length
      );
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (!query.trim()) return;

      if (!overlayOpen) {
        openOverlay();
        return;
      }

      const selected = highlightIndex >= 0 ? results[highlightIndex] : results[0];
      if (selected) go(selected);
    }
  };

  return (
    <>
      <div ref={containerRef} className="relative w-full">
        <div className="flex w-full justify-center">
          <div className="relative w-full max-w-4xl">
            {isMobileViewport ? (
              <button
                type="button"
                onClick={handleMobileTrigger}
                className="flex w-full items-center justify-between rounded-full border border-gray-300 bg-white px-5 py-3 text-left text-[16px] text-brandDark shadow transition hover:shadow-lg"
                aria-label={copy.openSearch}
              >
                <span className={query ? "text-brandDark" : "text-gray-400"}>
                  {query || copy.searchPlaceholder}
                </span>
                <FaSearch className="shrink-0 text-gray-500" />
              </button>
            ) : (
              <SearchInput
                inputRef={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={handleSearchFocus}
                onBlur={handleSearchBlur}
                placeholder={copy.searchPlaceholder}
                inputClassName="w-full rounded-full border border-gray-300 bg-white px-10 py-3 text-[16px] text-brandDark shadow transition placeholder:text-gray-400 hover:shadow-lg focus:border-quaternaryColor focus:outline-none focus:ring-2 focus:ring-quaternaryColor sm:text-lg"
                iconClassName="absolute right-5 top-1/2 -translate-y-1/2 text-gray-500"
              />
            )}
          </div>
        </div>
      </div>

      {!overlayOpen &&
        dropdownPos &&
        createPortal(
          <AnimatePresence>
            {dropdownVisible && results.length > 0 && (
              <motion.div
                ref={dropdownRef}
                className="fixed z-[99999] overflow-y-auto overscroll-contain rounded-[26px] border border-slate-200/80 bg-white/95 shadow-[0_22px_50px_-30px_rgba(15,23,42,0.42)] backdrop-blur-xl"
                style={{
                  left: dropdownPos.left,
                  top: dropdownPos.top,
                  width: dropdownPos.width,
                  maxHeight: dropdownPos.maxHeight,
                  WebkitOverflowScrolling: "touch",
                }}
                initial={{ opacity: 0, y: 8, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.985 }}
                transition={{ duration: 0.18, ease: [0.22, 0.68, 0.4, 0.98] }}
              >
                <SearchResultList
                  results={results}
                  highlightIndex={highlightIndex}
                  onHover={setHighlightIndex}
                  onPick={go}
                  locale={locale}
                />
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {overlayOpen && overlayOrigin && (
              <>
                <motion.button
                  type="button"
                  aria-label={copy.closeSearchLayer}
                  className="fixed inset-0 z-[120000] cursor-default bg-white/24 backdrop-blur-md"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={closeOverlay}
                />

                <motion.div
                  className="fixed z-[120001] overflow-hidden border border-white/85 bg-white/72 shadow-[0_40px_100px_-45px_rgba(15,23,42,0.5)] backdrop-blur-2xl"
                  initial={{
                    left: overlayOrigin.left,
                    top: overlayOrigin.top,
                    width: overlayOrigin.width,
                    height: overlayOrigin.height,
                    borderRadius: 999,
                    opacity: 0.94,
                  }}
                  animate={{
                    left: overlayFrame.left,
                    top: overlayFrame.top,
                    width: overlayFrame.width,
                    height: overlayFrame.height,
                    borderRadius: 30,
                    opacity: 1,
                  }}
                  exit={{
                    left: overlayOrigin.left,
                    top: overlayOrigin.top,
                    width: overlayOrigin.width,
                    height: overlayOrigin.height,
                    borderRadius: 999,
                    opacity: 0.94,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 260,
                    damping: 28,
                    mass: 0.92,
                  }}
                >
                  <div className="flex h-full flex-col">
                    <div className="border-b border-white/80 px-4 py-4 sm:px-6 sm:py-5">
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <SearchInput
                            inputRef={overlayInputRef}
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            onKeyDown={handleKeyDown}
                            onFocus={handleSearchFocus}
                            onBlur={handleSearchBlur}
                            placeholder={copy.overlayPlaceholder}
                            inputClassName="w-full rounded-[24px] border border-slate-200/90 bg-white/92 px-12 py-3.5 text-[16px] text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-quaternaryColor focus:outline-none focus:ring-2 focus:ring-quaternaryColor/50 sm:text-base"
                            iconClassName="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={closeOverlay}
                          className="grid size-11 place-items-center rounded-2xl border border-white/80 bg-white/80 text-slate-700 transition hover:bg-white"
                          aria-label={copy.close}
                        >
                          <X size={20} />
                        </button>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                            {copy.smartSearch}
                          </p>
                          <p className="text-sm text-slate-600">
                            {copy.smartSearchText}
                          </p>
                        </div>
                        <div className="rounded-full border border-white/80 bg-white/75 px-3 py-1.5 text-xs font-medium text-slate-500">
                          {query.trim().length >= 2
                            ? copy.resultsCount(results.length)
                            : copy.startSearching}
                        </div>
                      </div>
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
                      {query.trim().length < 2 ? (
                        <div className="grid h-full place-items-center rounded-[28px] border border-dashed border-white/80 bg-white/45 p-8 text-center">
                          <div className="max-w-xl space-y-3">
                            <p className="text-base font-semibold text-slate-800">
                              {copy.refineSearch}
                            </p>
                            <p className="text-sm leading-6 text-slate-600">
                              {copy.refineSearchText}
                            </p>
                          </div>
                        </div>
                      ) : results.length ? (
                        <SearchResultList
                          results={results}
                          highlightIndex={highlightIndex}
                          onHover={setHighlightIndex}
                          onPick={go}
                          mode="overlay"
                          locale={locale}
                        />
                      ) : (
                        <div className="grid h-full place-items-center rounded-[28px] border border-dashed border-white/80 bg-white/45 p-8 text-center">
                          <div className="max-w-xl space-y-3">
                            <p className="text-base font-semibold text-slate-800">
                              {copy.noResults}
                            </p>
                            <p className="text-sm leading-6 text-slate-600">
                              {copy.noResultsText}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
};

SearchBar.propTypes = {
  onFocusChange: PropTypes.func,
};

export default SearchBar;
