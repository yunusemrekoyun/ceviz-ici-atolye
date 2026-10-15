// src/components/BlogDetails/BlogDetails.jsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { message } from "antd";
import dayjs from "dayjs";
import BlogComments from "../BlogComments/BlogComments";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay } from "swiper/modules";
import useVisitTracker from "../../hooks/useVisitTracker";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "./BlogDetails.css";

const BlogDetails = () => {
  const { blogId } = useParams();
  const [blog, setBlog] = useState(null);
  const [likesCount, setLikesCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const apiUrl = import.meta.env.VITE_API_BASE_URL;
  const storedUser = JSON.parse(localStorage.getItem("user"));
  const userId =
    storedUser?._id || storedUser?.id || storedUser?._userId || null;

  // tracker için blogId kullanıyoruz
  useVisitTracker("blog", blogId);

  useEffect(() => {
    const fetchBlog = async () => {
      try {
        const url = userId
          ? `${apiUrl}/api/blogs/${blogId}?userId=${userId}`
          : `${apiUrl}/api/blogs/${blogId}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Sunucu hatası");
        const data = await res.json();
        setBlog(data);
        setLikesCount(data.likesCount);
        setLiked(!!data.likedByCurrentUser);
      } catch (err) {
        console.error(err);
        message.error("Blog yüklenemedi");
      }
    };
    fetchBlog();
  }, [apiUrl, blogId, userId]);

  const handleLike = async () => {
    if (!userId) {
      message.warning("Beğenmek için giriş yapın!");
      return;
    }
    try {
      const res = await fetch(
        `${apiUrl}/api/users/${userId}/likedBlogs/${blogId}`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error("Beğeni güncellenemedi");
      // toggle liked state and adjust count
      setLiked((prev) => !prev);
      setLikesCount((prev) => prev + (liked ? -1 : 1));
    } catch (err) {
      console.error(err);
      message.error("Beğeni güncellenemedi");
    }
  };

  if (!blog) return <div className="loading">Yükleniyor...</div>;

  return (
    <section className="single-blog">
      <div className="container">
        <article>
          {blog.imagesCount > 1 ? (
            <Swiper
              modules={[Navigation, Pagination, Autoplay]}
              spaceBetween={20}
              slidesPerView={1}
              navigation
              pagination={{ clickable: true }}
              autoplay={{ delay: 3500 }}
              className="blog-slider"
            >
              {Array.from({ length: blog.imagesCount }).map((_, idx) => (
                <SwiperSlide key={idx}>
                  <img
                    src={`${apiUrl}/api/blogs/${blogId}/image/${idx}`}
                    alt={blog.title}
                    className="blog-image"
                    onError={(e) => (e.target.src = "/img/fallback.jpg")}
                  />
                </SwiperSlide>
              ))}
            </Swiper>
          ) : blog.imagesCount === 1 ? (
            <img
              src={`${apiUrl}/api/blogs/${blogId}/image/0`}
              alt={blog.title}
              className="blog-image"
              onError={(e) => (e.target.src = "/img/fallback.jpg")}
            />
          ) : null}

          <div className="blog-wrapper">
            <div className="blog-meta">
              <span>{dayjs(blog.createdAt).format("DD MMM, YYYY")}</span>
              <span>#{blog.blogId}</span>
              <button
                className={`blog-like-button ${liked ? "liked" : ""}`}
                onClick={handleLike}
              >
                {liked ? "❤️" : "🤍"} {likesCount} beğeni
              </button>
            </div>

            <h1 className="blog-title">{blog.title}</h1>
            <div
              className="blog-content"
              dangerouslySetInnerHTML={{ __html: blog.content }}
            />

            <button
              className="toggle-details-button"
              onClick={() => setShowComments(!showComments)}
            >
              {showComments ? "Yorumları Gizle" : "Blog Yorumları"}
            </button>
          </div>
        </article>

        {showComments && (
          <div className="comment-section">
            <BlogComments blogId={blogId} user={storedUser} />
          </div>
        )}
      </div>
    </section>
  );
};

export default BlogDetails;
