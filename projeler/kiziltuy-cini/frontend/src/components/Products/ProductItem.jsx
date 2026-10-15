import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import ShareModal from "../Modals/Share/ShareModal";
import "./ProductItem.css";
import { message } from "antd";
const ProductItem = ({ productItem }) => {
  const apiUrl = import.meta.env.VITE_API_BASE_URL;
  const storedUser = JSON.parse(localStorage.getItem("user"));
  const userId = storedUser?._id || storedUser?.id;

  const [showShare, setShowShare] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [animateHeart, setAnimateHeart] = useState(false);

  useEffect(() => {
    if (!userId || !storedUser?.favorites) return;
    setIsFavorite(storedUser.favorites.includes(productItem._id));
  }, [storedUser, productItem._id, userId]);

  const toggleFavorite = async () => {
    if (!userId) {
      message.warning("Favorilere eklemek için giriş yapmalısınız.");
      return;
    }

    try {
      const res = await fetch(
        `${apiUrl}/api/users/${userId}/favorites/${productItem._id}`,
        { method: "POST" }
      );
      const data = await res.json();
      setIsFavorite(data.favorites.includes(productItem._id));
      setAnimateHeart(true); // animasyonu tetikle
      setTimeout(() => setAnimateHeart(false), 300); // animasyon sınıfını kaldır

      // localStorage güncelle
      const updatedUser = { ...storedUser, favorites: data.favorites };
      localStorage.setItem("user", JSON.stringify(updatedUser));
    } catch (err) {
      console.error("Favori işlemi hatası:", err);
    }
  };

  return (
    <div className="product-item">
      <div className="product-image">
        <Link to={`/product/${productItem._id}`}>
          <img
            src={`${apiUrl}/api/products/${productItem._id}/image/mainImages/0`}
            alt={productItem.name}
            loading="lazy"
          />
        </Link>
      </div>

      <div className="product-item-info">
        <Link to={`/product/${productItem._id}`} className="product-title">
          {productItem.name}
        </Link>

        <div className="product-links">
          <button
            onClick={toggleFavorite}
            className={`heart-button ${animateHeart ? "animate" : ""}`}
          >
            <i
              className={`bi bi-heart-fill heart-icon`}
              style={{ color: isFavorite ? "#d8363a" : "#ccc" }}
            ></i>
          </button>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setShowShare(true);
            }}
          >
            <i className="bi bi-share-fill"></i>
          </a>
          <ShareModal
            isOpen={showShare}
            onClose={() => setShowShare(false)}
            shareUrl={`${window.location.origin}/product/${productItem._id}`}
          />
        </div>
      </div>
    </div>
  );
};
/*BU ALAN DAHA SONRA EKLENECEK E-COMMERCE ÜRÜN DETAYLARI İÇİN
// ProductItem.propTypes = {
//   productItem: PropTypes.shape({
//     _id: PropTypes.string.isRequired,
//     name: PropTypes.string.isRequired,
//     price: PropTypes.shape({
//       current: PropTypes.number.isRequired,
//       discount: PropTypes.number,
//     }).isRequired,
//   }).isRequired,
// };
*/

ProductItem.propTypes = {
  productItem: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    price: PropTypes.shape({
      current: PropTypes.number,
      discount: PropTypes.number,
    }),
  }).isRequired,
};
export default ProductItem;
