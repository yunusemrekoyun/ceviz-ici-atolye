/********************************************************
 * frontend/src/components/Reviews/Reviews.jsx
 ********************************************************/
import PropTypes from "prop-types";
import ReviewItem from "./ReviewItem";
import ReviewForm from "./ReviewForm";
import "./Reviews.css";

const Reviews = ({ singleProduct }) => {
  const reviews = singleProduct.reviews || [];
  const average = singleProduct.averageRating ?? 0;

  return (
    <section className="reviews" id="reviews" aria-labelledby="reviews-title">
      <div className="reviews-summary">
        <h2 id="reviews-title">Değerlendirmeler</h2>
        {reviews.length > 0 ? (
          <div className="reviews-score">
            <strong>{average.toFixed(1)}</strong>
            <div>
              <span className="stars" aria-hidden="true">
                {[1, 2, 3, 4, 5].map((n) => (
                  <i
                    key={n}
                    className={`bi ${
                      average >= n
                        ? "bi-star-fill"
                        : average >= n - 0.5
                        ? "bi-star-half"
                        : "bi-star"
                    }`}
                  />
                ))}
              </span>
              <p>{reviews.length} değerlendirme</p>
            </div>
          </div>
        ) : (
          <p className="no-comments">
            Bu ürün henüz değerlendirilmedi. İlk yorumu siz yazın.
          </p>
        )}
        <ReviewForm singleProduct={singleProduct} />
      </div>

      {reviews.length > 0 && (
        <ul className="comment-list">
          {reviews.map((r) => (
            <ReviewItem reviewItem={r} key={r._id} />
          ))}
        </ul>
      )}
    </section>
  );
};

Reviews.propTypes = {
  singleProduct: PropTypes.shape({
    reviews: PropTypes.arrayOf(PropTypes.object),
    averageRating: PropTypes.number,
  }).isRequired,
};

export default Reviews;
