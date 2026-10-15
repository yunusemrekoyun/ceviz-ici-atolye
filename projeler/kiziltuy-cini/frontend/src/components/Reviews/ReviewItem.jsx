import PropTypes from "prop-types";

const ReviewItem = ({ reviewItem }) => {
  const { review, user } = reviewItem;
  const { text, createdAt, rating } = review;

  // Tarihi Türkçe biçimde
  const options = { year: "numeric", month: "long", day: "numeric" };
  const formattedDate = new Date(createdAt).toLocaleDateString(
    "tr-TR",
    options
  );

  // Dolu ve boş yıldızlar
  const filledStars = rating;
  const emptyStars = 5 - rating;

  // Avatar kaynağı
  const avatarSrc = user.avatar ? `data:image/png;base64,${user.avatar}` : null;

  return (
    <li className="comment-item">
      <div className="comment-avatar">
        {avatarSrc ? (
          <img src={avatarSrc} alt={user.username} width={60} />
        ) : (
          <div className="default-avatar">
            {user.username.charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <div className="comment-text">
        <ul className="comment-star">
          {Array.from({ length: filledStars }).map((_, i) => (
            <li key={`filled-${i}`}>
              <i className="bi bi-star-fill"></i>
            </li>
          ))}
          {Array.from({ length: emptyStars }).map((_, i) => (
            <li key={`empty-${i}`}>
              <i className="bi bi-star"></i>
            </li>
          ))}
        </ul>
        <div className="comment-meta">
          <strong>{user.username}</strong>
          <span> - </span>
          <time>{formattedDate}</time>
        </div>
        <div className="comment-description">
          <p>{text}</p>
        </div>
      </div>
    </li>
  );
};

ReviewItem.propTypes = {
  reviewItem: PropTypes.shape({
    review: PropTypes.shape({
      text: PropTypes.string.isRequired,
      createdAt: PropTypes.string.isRequired,
      rating: PropTypes.number.isRequired,
    }).isRequired,
    user: PropTypes.shape({
      username: PropTypes.string.isRequired,
      avatar: PropTypes.string,
    }).isRequired,
  }).isRequired,
};

export default ReviewItem;
