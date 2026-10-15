import { useEffect, useState } from "react";
import { Modal, Spin } from "antd";
import PropTypes from "prop-types";
import ProductDetails from "./ProductDetails";
import "./ProductDetailsModal.css";

// Ürün kartındaki görsele tıklanınca açılan hızlı bakış penceresi
const ProductDetailsModal = ({ isVisible, onClose, productId }) => {
  const [fullProduct, setFullProduct] = useState(null);
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    if (!isVisible || !productId) return;
    const controller = new AbortController();

    fetch(`${apiUrl}/api/products/${productId}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("Ürün detayı alınamadı.");
        return res.json();
      })
      .then(setFullProduct)
      .catch((err) => {
        if (err.name !== "AbortError") console.error(err);
      });

    return () => controller.abort();
  }, [isVisible, productId, apiUrl]);

  if (!isVisible) return null;

  return (
    <Modal
      open={isVisible}
      onCancel={onClose}
      footer={null}
      title={null}
      closable
      maskClosable
      destroyOnHidden
      width={1040}
      centered
      className="quick-view-modal"
    >
      {fullProduct && fullProduct._id === productId ? (
        <ProductDetails
          singleProduct={fullProduct}
          setSingleProduct={setFullProduct}
          compact
        />
      ) : (
        <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
          <Spin size="large" />
        </div>
      )}
    </Modal>
  );
};

ProductDetailsModal.propTypes = {
  isVisible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  productId: PropTypes.string,
};

export default ProductDetailsModal;
