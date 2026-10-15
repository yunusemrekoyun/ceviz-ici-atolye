import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import dayjs from "dayjs";
import "./BlogItem.css";

// HTML etiketleri varsa temizler
const stripHtml = (html) => {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.textContent || "";
};

const BlogItem = ({ blogId, title, date, comments, likes }) => {
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  return (
    <li className="blog-item">
      <Link to={`/blogs/${blogId}`} className="blog-image-wrapper">
        <img
          src={`${apiUrl}/api/blogs/${blogId}/image/0`}
          alt={stripHtml(title)}
          className="blog-image"
          onError={(e) => (e.target.src = "/img/fallback.jpg")}
        />
      </Link>
      <div className="blog-info">
        <div className="blog-info-top">
          <span>{dayjs(date).format("DD MMM, YYYY")}</span> -{" "}
          <span>{comments} Yorum</span>
        </div>
        <div className="blog-info-center">
          <Link to={`/blogs/${blogId}`} className="blog-title-link">
            {stripHtml(title)}
          </Link>
        </div>
        <div className="blog-info-bottom">
          <Link to={`/blogs/${blogId}`}>Daha Fazla</Link>
        </div>
        <div className="blog-info-likes">{likes} Beğeni</div>
      </div>
    </li>
  );
};

BlogItem.propTypes = {
  blogId: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  date: PropTypes.string.isRequired,
  comments: PropTypes.number.isRequired,
  likes: PropTypes.number.isRequired,
};

export default BlogItem;
