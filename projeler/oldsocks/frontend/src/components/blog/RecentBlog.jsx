import React, { useEffect, useState } from "react";
import api from "../../../api";
import RecentBlogItem from "./RecentBlogItem";

export default function RecentBlog() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/blogs")
      .then(({ data }) => {
        // Backend zaten createdAt DESC sıralı döndürüyor.
        // Burada sadece ilk 4 kaydı alıyoruz:
        setPosts(data.slice(0, 4));
      })
      .catch((err) => console.error("RecentBlog yüklenemedi:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Yükleniyor…</div>;
  if (!posts.length)
    return <div className="text-gray-500">Henüz bir gönderi yok.</div>;

  return (
    <div className="mb-8">
      <h4 className="text-lg font-semibold mb-3 text-[#0b0b0d]">Diğer Gönderiler</h4>
      {posts.map((p) => (
        <RecentBlogItem key={p._id} post={p} />
      ))}
    </div>
  );
}
