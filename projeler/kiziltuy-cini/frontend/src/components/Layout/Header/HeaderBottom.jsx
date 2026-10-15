import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import {
  FaHome,
  FaThLarge,
  FaRegNewspaper,
  FaChevronDown,
} from "react-icons/fa";
import Submenu from "./Submenu";
import MobileDrawer from "./MobileDrawer";
import "./HeaderBottom.css";

const TRANSFORM_DURATION = 600;
const WIDTH_DURATION = 900;

const HeaderBottom = ({ className = "" }) => {
  const mobileNavRef = useRef(null);
  const navigate = useNavigate();
  const timeoutRef = useRef(null);

  const [categories, setCategories] = useState([]);
  const [blogs, setBlogs] = useState([]);
  const [submenuData, setSubmenuData] = useState(null);
  const [openSubmenuId, setOpenSubmenuId] = useState(null);
  const [submenuVisible, setSubmenuVisible] = useState(false);
  const [mode, setMode] = useState("default");
  const [isAnimating, setIsAnimating] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isTouch, setIsTouch] = useState(false);

  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    setIsTouch("ontouchstart" in window || navigator.maxTouchPoints > 0);
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    fetch(`${apiUrl}/api/categories`)
      .then((r) => r.json())
      .then(setCategories)
      .catch(console.error);
    fetch(`${apiUrl}/api/blogs`)
      .then((r) => r.json())
      .then(setBlogs)
      .catch(console.error);
  }, [apiUrl]);

  useEffect(() => {
    if (!isMobile) return;
    const update = () => {
      const h = mobileNavRef.current?.getBoundingClientRect().height || 0;
      document.documentElement.style.setProperty("--bottom-nav-h", `${h}px`);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [isMobile]);

  const hideSubmenu = () => {
    setSubmenuVisible(false);
    setOpenSubmenuId(null);
    setSubmenuData(null);
  };

  const showSubmenu = () => {
    clearTimeout(timeoutRef.current);
    setSubmenuVisible(true);
  };

  const handleMouseEnter = (e, cat) => {
    if (isMobile) return;
    showSubmenu();
    const rect = e.currentTarget.getBoundingClientRect();
    const left = Math.max(rect.left + rect.width / 2 - 110, 12);
    setSubmenuData({
      items: cat.subcategories,
      parentCategoryId: cat._id,
      position: { top: rect.bottom + 4, left },
    });
  };

  const handleToggleSubmenu = (e, cat) => {
    if (isMobile) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const left = Math.max(rect.left + rect.width / 2 - 110, 12);
    const top = rect.bottom + 12;
    const same = openSubmenuId === cat._id;
    setOpenSubmenuId(same ? null : cat._id);
    setSubmenuData(
      same
        ? null
        : {
            items: cat.subcategories,
            parentCategoryId: cat._id,
            position: { top, left },
          }
    );
    setSubmenuVisible(!same);
  };

  const handleModeChange = (newMode) => {
    if (newMode === "default") {
      navigate("/");
      if (isAnimating) return;
      setIsAnimating(true);
      setIsReady(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
      setTimeout(() => setMode("default"), TRANSFORM_DURATION);
      setTimeout(
        () => setIsAnimating(false),
        TRANSFORM_DURATION + WIDTH_DURATION
      );
      return;
    }
    if (mode === newMode || isAnimating) return;
    setMode(newMode);
    setIsAnimating(true);
    setTimeout(() => setIsReady(true), TRANSFORM_DURATION);
    setTimeout(
      () => setIsAnimating(false),
      TRANSFORM_DURATION + WIDTH_DURATION
    );
  };

  const handleMobileIcon = (type) =>
    setDrawerOpen((prev) => (prev === type ? null : type));

  if (isMobile) {
    return (
      <>
        <div
          className="mobile-bottom-nav liquid-glass-panel"
          ref={mobileNavRef}
        >
          <button
            onClick={() => {
              setDrawerOpen(null);
              navigate("/");
            }}
          >
            <FaHome size={20} />
            <span>Ana Sayfa</span>
          </button>
          <button onClick={() => handleMobileIcon("shop")}>
            <FaThLarge size={20} />
            <span>Ürünler</span>
          </button>
          <button onClick={() => handleMobileIcon("blog")}>
            <FaRegNewspaper size={20} />
            <span>Blog</span>
          </button>
        </div>
        <MobileDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(null)}
          categories={categories}
          blogs={blogs}
        />
      </>
    );
  }

  return (
    <div
      className={`header-bottom ${className}`}
      onMouseEnter={showSubmenu}
      onMouseLeave={() => {
        timeoutRef.current = setTimeout(hideSubmenu, 150);
      }}
    >
      <div
        className={[
          "liquid-glass-panel",
          isAnimating && "animating",
          mode !== "default" && "expanded",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="icon-container">
          <button
            onClick={() => handleModeChange("default")}
            className={mode === "default" ? "active" : ""}
          >
            <FaHome size={18} />
            <span>Ana Sayfa</span>
          </button>
          <button
            onClick={() => handleModeChange("shop")}
            className={mode === "shop" ? "active" : ""}
          >
            <FaThLarge size={18} />
            <span>Ürünler</span>
          </button>
          <button
            onClick={() => handleModeChange("blog")}
            className={mode === "blog" ? "active" : ""}
          >
            <FaRegNewspaper size={18} />
            <span>Blog</span>
          </button>
        </div>

        {mode !== "default" && isReady && (
          <div className="liquid-content-area active">
            {mode === "shop" &&
              categories.map((cat) => (
                <div
                  key={cat._id}
                  className="menu-item"
                  onMouseEnter={(e) => handleMouseEnter(e, cat)}
                  onClick={(e) => isTouch && handleToggleSubmenu(e, cat)}
                >
                  <div className="menu-link-wrapper">
                    <Link
                      to={`/shop?category=${cat._id}`}
                      className="menu-link"
                    >
                      {cat.name.toUpperCase()}
                    </Link>
                    {isTouch && (
                      <FaChevronDown
                        className={openSubmenuId === cat._id ? "rotated" : ""}
                        size={12}
                        onClick={(e) => handleToggleSubmenu(e, cat)}
                      />
                    )}
                  </div>
                </div>
              ))}

            {mode === "blog" &&
              blogs.map((b) => (
                <div key={b.blogId} className="blog-link">
                  <Link to={`/blogs/${b.blogId}`} className="menu-link">
                    {b.title}
                  </Link>
                </div>
              ))}
          </div>
        )}
      </div>

      {submenuData && submenuVisible && (
        <div className="submenu-wrapper">
          <Submenu
            subcategories={submenuData.items}
            position={submenuData.position}
            parentCategoryId={submenuData.parentCategoryId}
          />
        </div>
      )}
    </div>
  );
};
HeaderBottom.propTypes = {
  className: PropTypes.string,
};
export default HeaderBottom;
