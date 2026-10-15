/********************************************************
 * frontend/src/components/ProductDetails/Breadcrumb/Breadcrumb.jsx
 ********************************************************/
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { slugify } from "../../../utils/slugify";

const Breadcrumb = ({ category, productName }) => {
  // category populate edilmişse { _id, name } olarak gelir
  const categoryName = typeof category === "object" ? category?.name : null;

  return (
    <nav className="crumbs" aria-label="Sayfa konumu">
      <Link to="/">Ana sayfa</Link>
      <span aria-hidden="true">/</span>
      <Link to="/shop">Mağaza</Link>
      {categoryName && (
        <>
          <span aria-hidden="true">/</span>
          <Link to={`/shop/${slugify(categoryName)}`}>{categoryName}</Link>
        </>
      )}
      <span aria-hidden="true">/</span>
      <span className="crumbs-current" aria-current="page">
        {productName}
      </span>
    </nav>
  );
};

Breadcrumb.propTypes = {
  category: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.shape({
      _id: PropTypes.string,
      name: PropTypes.string,
    }),
  ]),
  productName: PropTypes.string.isRequired,
};

export default Breadcrumb;
