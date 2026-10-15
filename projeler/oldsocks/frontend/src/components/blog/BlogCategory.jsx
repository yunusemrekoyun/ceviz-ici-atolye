// src/components/blog/BlogCategory.jsx
import React, { useState, useEffect } from "react";
import BlogCategoryItem from "./BlogCategoryItem";
import api from "../../../api";
import { useNavigate } from "react-router-dom";

export default function BlogCategory() {
  const [categories, setCategories] = useState([]);
  const [blogs, setBlogs] = useState([]);
  const navigate = useNavigate();

  // Kategorileri ve blogları çek
  useEffect(() => {
    api
      .get("/blog-categories")
      .then(({ data }) => setCategories(data))
      .catch((err) => console.error("Kategori alınamadı:", err));

    api
      .get("/blogs")
      .then(({ data }) => setBlogs(data))
      .catch((err) => console.error("Bloglar alınamadı:", err));
  }, []);

  // Her kategori için sayıyı hesapla
  const list = categories.map((cat) => {
    const count = blogs.filter((b) =>
      b.categories.some((c) => c._id === cat._id)
    ).length;
    return { ...cat, count };
  });

  return (
    <div className="mb-8">
      <h4 className="text-lg font-semibold mb-3 text-[#0b0b0d]">Kategori</h4>
      <ul>
        {list.map(({ _id, name, slug, count }) => (
          <BlogCategoryItem
            key={_id}
            name={name}
            count={count}
            onClick={() => navigate(`/blog?category=${slug}`)}
          />
        ))}
      </ul>
    </div>
  );
}
