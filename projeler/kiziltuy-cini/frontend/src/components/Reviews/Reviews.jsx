import { useEffect, useState, useCallback } from "react";
import PropTypes from "prop-types";
import { message } from "antd";
import ReviewForm from "./ReviewForm";
import ReviewItem from "./ReviewItem";
import "./Reviews.css";

const Reviews = ({
  active,
  singleProduct,

  onReviewUpdate,
}) => {
  const [reviews, setReviews] = useState([]);
  const [reviewCount, setReviewCount] = useState(0);
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  const fetchReviews = useCallback(async () => {
    try {
      const res = await fetch(
        `${apiUrl}/api/product-reviews/${singleProduct._id}`
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      setReviews(data.reviews);
      setReviewCount(data.total);
    } catch {
      message.error("Yorumlar yüklenemedi.");
    }
  }, [apiUrl, singleProduct._id]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  return (
    <div className={`tab-panel-reviews ${active}`}>
      {reviewCount > 0 ? (
        <>
          <h3>{reviewCount} yorum</h3>
          <div className="comments">
            <ol className="comment-list">
              {reviews.map((item, idx) => (
                <ReviewItem
                  key={idx}
                  reviewItem={{ review: item, user: item.user }}
                />
              ))}
            </ol>
          </div>
        </>
      ) : (
        <h3>Hiç yorum yok...</h3>
      )}
      <div className="review-form-wrapper">
        <h2>Yorum Yaz</h2>
        <ReviewForm
          productId={singleProduct._id}
          onReviewAdded={fetchReviews}
          onReviewUpdate={onReviewUpdate}
        />
      </div>
    </div>
  );
};

Reviews.propTypes = {
  active: PropTypes.string.isRequired,
  singleProduct: PropTypes.object.isRequired,
  setSingleProduct: PropTypes.func.isRequired,
  onReviewUpdate: PropTypes.func.isRequired,
};

export default Reviews;
