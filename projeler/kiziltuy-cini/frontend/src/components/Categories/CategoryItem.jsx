// src/components/Categories/CategoryItem.jsx

import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import "./CategoryItem.css";

const CategoryItem = ({ category }) => {
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  return (
    <li className="category-item">
      <Link to={`/shop?category=${category._id}`} className="category-link">
        <img
          src={`${apiUrl}/api/categories/${category._id}/image`}
          alt={category.name}
          className="category-image"
          loading="lazy"
        />
        <span className="category-title">{category.name}</span>
      </Link>
    </li>
  );
};

CategoryItem.propTypes = {
  category: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
  }).isRequired,
};

export default CategoryItem;
