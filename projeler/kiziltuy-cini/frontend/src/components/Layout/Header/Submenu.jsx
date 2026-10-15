// src/components/Layout/Header/Submenu.jsx
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import "./Submenu.css";

const Submenu = ({
  subcategories,
  position,
  parentCategoryId,
  onMouseEnter,
  onMouseLeave,
}) => {
  if (!subcategories || subcategories.length === 0) return null;

  const isTouchDevice =
    "ontouchstart" in window || navigator.maxTouchPoints > 0;

  const style = position
    ? {
        top: position.top,
        left: position.left,
        position: "fixed",
      }
    : undefined;

  return (
    <div
      className={`submenu-container ${isTouchDevice ? "submenu-mobile" : ""}`}
      style={style}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {subcategories.map((sub, i) => (
        <Link
          key={i}
          to={`/shop?category=${parentCategoryId}&subcategory=${sub}`}
          className="submenu-item"
        >
          {sub}
        </Link>
      ))}
    </div>
  );
};

Submenu.propTypes = {
  subcategories: PropTypes.arrayOf(PropTypes.string),
  position: PropTypes.shape({
    top: PropTypes.number,
    left: PropTypes.number,
  }),
  parentCategoryId: PropTypes.string.isRequired,
  onMouseEnter: PropTypes.func,
  onMouseLeave: PropTypes.func,
};

export default Submenu;
