import { Link } from "react-router-dom";
import PropTypes from "prop-types";
import "./Breadcrumb.css";

const Breadcrumb = ({ category, productName }) => {
  return (
    <div className="single-topbar">
      <nav className="breadcrumb">
        <ul>
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to={`/category/${category._id}`}>{category.name}</Link>
          </li>
          <li>{productName}</li>
        </ul>
      </nav>
    </div>
  );
};

Breadcrumb.propTypes = {
  category: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
  }).isRequired,
  productName: PropTypes.string.isRequired,
};

export default Breadcrumb;
