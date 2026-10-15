import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import CategoryItem from "../../Categories/CategoryItem";
import "./CategoryHeader.css";

// Mağaza sayfasında başlığın altındaki kategori çipleri
const CategoryHeader = ({ categories, allLink, allLabel, isAllActive }) => {
  if (categories.length === 0) return null;

  return (
    <nav className="category-header" aria-label="Kategoriler">
      <ul className="category-list">
        <li className="category-item">
          <Link
            to={allLink}
            className={`category-link ${isAllActive ? "active" : ""}`}
          >
            {allLabel}
          </Link>
        </li>
        {categories.map((cat) => (
          <CategoryItem key={cat._id} category={cat} />
        ))}
      </ul>
    </nav>
  );
};

CategoryHeader.propTypes = {
  categories: PropTypes.array.isRequired,
  allLink: PropTypes.string.isRequired,
  allLabel: PropTypes.string.isRequired,
  isAllActive: PropTypes.bool,
};

export default CategoryHeader;
