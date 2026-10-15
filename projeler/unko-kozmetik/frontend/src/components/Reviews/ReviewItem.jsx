/********************************************************
 * frontend/src/components/Reviews/ReviewItem.jsx
 ********************************************************/
import PropTypes from "prop-types";

const ReviewItem = ({ reviewItem }) => {
  const { text, rating, user, createdAt } = reviewItem;
  const name = user?.username || "Kullanıcı";
  const formattedDate = new Date(createdAt).toLocaleDateString("tr-TR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <li className="comment-item">
      <div className="comment-head">
        <span className="comment-avatar" aria-hidden="true">
          {name.charAt(0).toLocaleUpperCase("tr")}
        </span>
        <div>
          <strong>{name}</strong>
          <time dateTime={createdAt}>{formattedDate}</time>
        </div>
        <span className="stars" aria-label={`5 üzerinden ${rating} puan`}>
          {[1, 2, 3, 4, 5].map((n) => (
            <i
              key={n}
              className={`bi ${rating >= n ? "bi-star-fill" : "bi-star"}`}
            />
          ))}
        </span>
      </div>
      <p className="comment-description">{text}</p>
    </li>
  );
};

ReviewItem.propTypes = {
  reviewItem: PropTypes.shape({
    _id: PropTypes.string,
    text: PropTypes.string,
    rating: PropTypes.number,
    user: PropTypes.shape({
      username: PropTypes.string,
    }),
    createdAt: PropTypes.string,
  }).isRequired,
};

export default ReviewItem;
