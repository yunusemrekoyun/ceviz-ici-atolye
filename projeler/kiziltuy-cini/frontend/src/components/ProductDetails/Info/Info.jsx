import PropTypes from "prop-types";
import "./Info.css";
import { useEffect, useState } from "react";
import { Modal, Input, Rate, message } from "antd";

const Info = ({ singleProduct, updateFlag }) => {
  const [avgRating, setAvgRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [shareVisible, setShareVisible] = useState(false);
  const shareUrl = window.location.href;
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    const fetchReviewStats = async () => {
      try {
        const res = await fetch(
          `${apiUrl}/api/product-reviews/${singleProduct._id}`
        );
        if (!res.ok) throw new Error();
        const data = await res.json();

        setReviewCount(data.total);

        const totalRating = data.reviews.reduce((sum, r) => sum + r.rating, 0);
        const avg =
          data.reviews.length > 0 ? totalRating / data.reviews.length : 0;
        setAvgRating(avg);
      } catch {
        message.error("Yorumlar alınamadı.");
      }
    };

    fetchReviewStats();
  }, [singleProduct._id, apiUrl, updateFlag]);

  const showShare = () => setShareVisible(true);
  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    message.success("Link kopyalandı!");
  };
  const handleCancel = () => setShareVisible(false);

  return (
    <div className="product-info">
      <h1 className="product-title">{singleProduct.name}</h1>

      <div className="product-review">
        <Rate allowHalf disabled value={avgRating} />
        <span>{reviewCount} yorum</span>
      </div>

      <div className="product-price">
        <s className="old-price">${singleProduct.price.current.toFixed(2)}</s>
        <strong className="new-price">
          $
          {(
            singleProduct.price.current -
            (singleProduct.price.current * singleProduct.price.discount) / 100
          ).toFixed(2)}
        </strong>
      </div>

      <div
        className="product-description"
        dangerouslySetInnerHTML={{ __html: singleProduct.description }}
      />

      <div className="product-extra-buttons">
        <button className="wishlist-btn" disabled>
          <i className="bi bi-heart"></i> Add to Wishlist
        </button>
        <button onClick={showShare}>
          <i className="bi bi-share"></i> Share this Product
        </button>
      </div>

      <Modal
        title="Share this Product"
        visible={shareVisible}
        onCancel={handleCancel}
        footer={null}
      >
        <Input
          value={shareUrl}
          addonAfter={
            <button className="btn" onClick={handleCopy}>
              Kopyala
            </button>
          }
          readOnly
        />
      </Modal>
    </div>
  );
};

Info.propTypes = {
  singleProduct: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    name: PropTypes.string,
    description: PropTypes.string,
    price: PropTypes.shape({
      current: PropTypes.number,
      discount: PropTypes.number,
    }),
  }).isRequired,
  updateFlag: PropTypes.number.isRequired,
};

export default Info;