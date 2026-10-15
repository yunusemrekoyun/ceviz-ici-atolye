import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { message } from "antd";
import BlogItem from "./BlogItem";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "./Blogs.css";

const Blogs = () => {
  const [blogs, setBlogs] = useState([]);
  const apiUrl = import.meta.env.VITE_API_BASE_URL;
  const navigate = useNavigate();

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/blogs`);
        if (!res.ok) throw new Error("Fetch error");
        const data = await res.json();
        setBlogs(data);
      } catch (err) {
        console.error(err);
        message.error("Bloglar yüklenemedi");
      }
    };
    fetchBlogs();
  }, [apiUrl]);

  return (
    <section className="blogs">
      <div className="container">
        <div className="blogs-header">
          <h2>Bloğumuza Göz Atın</h2>
          <button className="view-all-btn" onClick={() => navigate("/blog")}>
            Tümünü Gör
          </button>
        </div>

        {blogs.length > 3 ? (
          <div className="blog-swiper-wrapper">
            <Swiper
              spaceBetween={20}
              slidesPerView={3}
              autoplay={{ delay: 3500, disableOnInteraction: false }}
              navigation={{
                nextEl: ".custom-swiper-next",
                prevEl: ".custom-swiper-prev",
              }}
              pagination={{ clickable: true }}
              modules={[Autoplay, Navigation, Pagination]}
              className="blog-swiper"
            >
              {blogs.map((blog) => (
                <SwiperSlide key={blog.blogId}>
                  <BlogItem
                    blogId={blog.blogId}
                    title={blog.title}
                    date={blog.createdAt}
                    comments={blog.commentsCount}
                    likes={blog.likesCount}
                  />
                </SwiperSlide>
              ))}
            </Swiper>
            <button className="custom-swiper-prev">❮</button>
            <button className="custom-swiper-next">❯</button>
          </div>
        ) : (
          <ul className="blog-list">
            {blogs.map((blog) => (
              <BlogItem
                key={blog.blogId}
                blogId={blog.blogId}
                title={blog.title}
                date={blog.createdAt}
                comments={blog.commentsCount}
                likes={blog.likesCount}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};

export default Blogs;
