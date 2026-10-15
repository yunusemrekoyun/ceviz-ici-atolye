import { useState } from "react";
import PropTypes from "prop-types";
import { useNavigate, Link } from "react-router-dom";
import { FaTimes, FaChevronRight, FaChevronDown } from "react-icons/fa";
import "./MobileDrawer.css";

const MobileDrawer = ({ open, onClose, categories, blogs }) => {
  const [expandedId, setExpandedId] = useState(null);
  const navigate = useNavigate();

  const items =
    open === "shop"
      ? categories.map((cat) => ({
          id: cat._id,
          label: cat.name,
          to: `/shop?category=${cat._id}`,
          sub: cat.subcategories || [],
        }))
      : blogs.map((b) => ({
          id: b.blogId,
          label: b.title,
          to: `/blogs/${b.blogId}`,
          sub: [],
        }));

  const toggleSection = (id, to, hasSub) => {
    if (!hasSub) {
      onClose();
      navigate(to);
    } else {
      setExpandedId((prev) => (prev === id ? null : id));
    }
  };

  return (
    <>
      <div
        className={`drawer-overlay ${open ? "open" : ""}`}
        onClick={onClose}
      />
      <aside className={`drawer-panel ${open ? "open" : ""}`}>
        <header className="drawer-header">
          <button className="drawer-close" onClick={onClose}>
            <FaTimes size={20} />
          </button>
        </header>
        <nav className="drawer-nav">
          {items.map(({ id, label, to, sub }) => (
            <div
              key={id}
              className={`drawer-section ${
                expandedId === id ? "expanded" : ""
              }`}
            >
              <div
                className="drawer-item"
                onClick={() => toggleSection(id, to, sub.length > 0)}
              >
                <span className="drawer-label">{label}</span>
                {sub.length > 0 && (
                  <span
                    className={`drawer-icon ${
                      expandedId === id ? "expanded" : ""
                    }`}
                  >
                    {expandedId === id ? <FaChevronDown /> : <FaChevronRight />}
                  </span>
                )}
              </div>
              <div className="drawer-subcontainer">
                {expandedId === id && sub.length > 0 && (
                  <div className="drawer-subgrid">
                    {sub.map((subLabel) => (
                      <Link
                        key={subLabel}
                        to={`${to}&subcategory=${encodeURIComponent(subLabel)}`}
                        className="drawer-subitem"
                        onClick={onClose}
                      >
                        {subLabel}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
};

MobileDrawer.propTypes = {
  open: PropTypes.oneOf(["shop", "blog", null]),
  onClose: PropTypes.func.isRequired,
  categories: PropTypes.array.isRequired,
  blogs: PropTypes.array.isRequired,
};

export default MobileDrawer;
