import PropTypes from "prop-types";
import "./ProductMainDescriptions.css";

const ProductMainDescriptions = ({ product }) => {
  return (
    <section className="description-section">
      <h2 className="description-title">Üretim Hakkında</h2>
      <div className="description-text">
        {product.mainDescription?.trim() || "Açıklama bulunamadı."}
      </div>
    </section>
  );
};

ProductMainDescriptions.propTypes = {
  product: PropTypes.shape({
    mainDescription: PropTypes.string,
  }).isRequired,
};

export default ProductMainDescriptions;
