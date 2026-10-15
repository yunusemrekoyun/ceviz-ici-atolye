import PropTypes from "prop-types";
import { useState } from "react";
import "./HeroImage.css";
import { message } from "antd";
const HeroImage = ({ product, onFavoriteChange }) => {
  const apiUrl = import.meta.env.VITE_API_BASE_URL;
  const imageUrl = `${apiUrl}/api/products/${product._id}/image/mainImages/0`;

  const storedUser = JSON.parse(localStorage.getItem("user"));
  const userId = storedUser?._id || storedUser?.id;

  const [favoritedByCount, setFavoritedByCount] = useState(
    product.favoritedByCount || 0
  );

  const scrollToDetails = () => {
    const target = document.getElementById("description-blocks");
    if (target) target.scrollIntoView({ behavior: "smooth" });
  };

  const toggleFavorite = async () => {
    if (!userId) {
      message.warning("Favorilere eklemek için giriş yapmalısınız.");
      return;
    }

    try {
      const res = await fetch(
        `${apiUrl}/api/users/${userId}/favorites/${product._id}`,
        {
          method: "POST",
        }
      );
      const data = await res.json();
      console.log("Yeni favori listesi:", data.favorites);

      // Favori sayısını güncelle (eklenmişse +1, çıkarılmışsa -1)
      const isNowFavorited = data.favorites.includes(product._id);
      setFavoritedByCount((prev) =>
        isNowFavorited ? prev + 1 : Math.max(prev - 1, 0)
      );

      // localStorage güncelle
      const updatedUser = { ...storedUser, favorites: data.favorites };
      localStorage.setItem("user", JSON.stringify(updatedUser));

      // Ana sayfaya bildir (opsiyonel)
      if (onFavoriteChange) onFavoriteChange();
    } catch (err) {
      console.error("Favori hatası:", err);
    }
  };

  return (
    <section className="hero-section">
      <div className="hero-image" style={{ "--bg-url": `url(${imageUrl})` }}>
        <img src={imageUrl} alt={product.name} className="hero-img" />

        <div className="product-name-tag">
          <h2>{product.name}</h2>
        </div>

        <div className="hero-button-wrapper">
          <button className="scroll-btn" onClick={scrollToDetails}>
            Detayları Gör ↓
          </button>
        </div>

        <div className="favorite-info-box">
          <p>
            {favoritedByCount > 0
              ? `${favoritedByCount} kişi favorilere ekledi`
              : "Bu ürünü favorilerinize ekleyin"}
          </p>
          <i
            className={`bi ${
              favoritedByCount > 0 ? "bi-heart-fill" : "bi-heart"
            } heart-icon pulse`}
            onClick={toggleFavorite}
          />
        </div>
      </div>
    </section>
  );
};

HeroImage.propTypes = {
  product: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    name: PropTypes.string,
    favoritedByCount: PropTypes.number,
  }).isRequired,
  onFavoriteChange: PropTypes.func,
};

export default HeroImage;
