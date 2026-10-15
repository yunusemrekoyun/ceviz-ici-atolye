/********************************************************
 * frontend/src/components/Categories/CategoryItem.jsx
 ********************************************************/
import PropTypes from "prop-types";
import { NavLink } from "react-router-dom";
import { slugify } from "../../utils/slugify";
import "./CategoryItem.css";

const CategoryItem = ({ category }) => {
  return (
    <li className="category-item">
      <NavLink to={`/shop/${slugify(category.name)}`} className="category-link">
        {category.name}
      </NavLink>
    </li>
  );
};

CategoryItem.propTypes = {
  category: PropTypes.shape({
    name: PropTypes.string.isRequired,
  }).isRequired,
};

export default CategoryItem;
