import React, { useEffect, useState } from "react";
import SocialMediaItem from "./SocialMediaItem";
import ExternalContentGate from "../privacy/ExternalContentGate";
import api from "../../../api";

// Slider
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

export default function SocialMedia() {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    api
      .get("/instagram-posts")
      .then(({ data }) => setPosts(Array.isArray(data) ? data : []))
      .catch(console.error);
  }, []);

  return (
    <section className="bg-[#f4f4f4] p-6 rounded-lg shadow-sm w-full">
      <h4 className="text-xl font-semibold text-[#0b0b0d] mb-4 border-b border-[#d9d9d9] pb-2">
        Instagram İçerikleri
      </h4>

      {posts.length === 0 ? (
        <p className="text-center text-gray-500">Henüz gönderi yok.</p>
      ) : (
        <ExternalContentGate service="Instagram" what="Gönderiler">
        <div className="w-full">
          {/* 1 slayt görünür; drag / swipe ile ileri-geri */}
          <Swiper
            modules={[Navigation, Pagination]}
            slidesPerView={1}
            navigation
            pagination={{ clickable: true }}
            loop={posts.length >= 3}
            rewind={posts.length < 3}
            className="w-full"
          >
            {posts.map((post) => (
              <SwiperSlide key={post._id}>
                {/* Post tek başına, tam genişlik. Max genişliği çok büyürse ortala. */}
                <div className="w-full max-w-4xl mx-auto">
                  <SocialMediaItem
                    embedLink={post.embedLink}
                    caption={post.caption}
                  />
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
        </ExternalContentGate>
      )}
    </section>
  );
}
