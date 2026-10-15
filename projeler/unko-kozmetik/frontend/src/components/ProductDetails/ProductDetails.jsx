import Breadcrumb from "./Breadcrumb/Breadcrumb";
import Gallery from "./Gallery/Gallery";
import PropTypes from "prop-types";
import Info from "./Info/Info";
import Reviews from "../Reviews/Reviews";
import "./ProductDetails.css";

const ProductDetails = ({
  singleProduct,
  setSingleProduct,
  compact = false,
}) => {
  return (
    <section className={`single-product ${compact ? "is-compact" : ""}`}>
      <div className="container">
        {!compact && (
          <Breadcrumb
            category={singleProduct.category}
            productName={singleProduct.name}
          />
        )}

        <div className="single-content">
          <Gallery singleProduct={singleProduct} />
          <Info singleProduct={singleProduct} compact={compact} />
        </div>

        {!compact && (
          <Reviews
            singleProduct={singleProduct}
            setSingleProduct={setSingleProduct}
          />
        )}
      </div>
    </section>
  );
};

ProductDetails.propTypes = {
  singleProduct: PropTypes.object.isRequired,
  setSingleProduct: PropTypes.func,
  compact: PropTypes.bool,
};

export default ProductDetails;
