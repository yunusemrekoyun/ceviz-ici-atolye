// src/components/blog/BlogDetailsPagination.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import api from "../../../api";
import prevFallback from "../../assets/blog/blog-pagination/previous.png";
import nextFallback from "../../assets/blog/blog-pagination/next.png";

const slugify = (s = "") =>
  s
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, "-");

export default function BlogDetailsPagination({ posts: postsProp, currentId }) {
  const location = useLocation();
  const params = useParams();

  // URL’den mevcut anahtar: prop > param > path son segment
  const anyParamVal =
    currentId ||
    Object.values(params)[0] ||
    location.pathname.split("/").filter(Boolean).pop() ||
    "";

  const [loading, setLoading] = useState(!postsProp);
  const [posts, setPosts] = useState(postsProp || []);

  useEffect(() => {
    if (postsProp) return;
    let alive = true;
    setLoading(true);
    api
      .get("/blogs")
      .then(({ data }) => {
        if (!alive) return;
        const arr = Array.isArray(data)
          ? data
          : Array.isArray(data?.items)
          ? data.items
          : [];
        setPosts(arr);
      })
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
    return () => {
      alive = false;
    };
  }, [postsProp]);

  // Normalize + sırala (eski → yeni)
  const sorted = useMemo(() => {
    const norm = posts.map((p) => ({
      ...p,
      _slug: p.slug || slugify(p.title || ""),
      _ts: new Date(p.publishedAt || p.createdAt || 0).getTime(),
    }));
    return norm.sort((a, b) => a._ts - b._ts);
  }, [posts]);

  // Mevcut yazıyı bul
  const idx = useMemo(() => {
    const key = String(anyParamVal);
    if (!key) return -1;
    return sorted.findIndex(
      (p) =>
        String(p._id) === key ||
        String(p._slug) === slugify(key) ||
        String(p.slug) === key
    );
  }, [sorted, anyParamVal]);

  // Komşular
  const prevPost = idx > 0 ? sorted[idx - 1] : null;
  const nextPost = idx >= 0 && idx < sorted.length - 1 ? sorted[idx + 1] : null;

  const urlFor = (p) => `/blog/${p.slug || p._slug || p._id}`;
  const titleOf = (p) => p?.title || "—";
  const coverOf = (p) =>
    p?.coverImageUrl || p?.coverImage || p?.image || p?.thumbnail;

  if (loading) {
    return (
      <div className="flex justify-between items-center py-8 border-t border-gray-200">
        <div className="h-16 w-40 bg-gray-100 rounded animate-pulse" />
        <div className="h-16 w-40 bg-gray-100 rounded animate-pulse" />
      </div>
    );
  }

  // Mevcut yazı bulunamadıysa veya hiç komşu yoksa tamamen gizle
  if (idx === -1 || (!prevPost && !nextPost)) {
    return null;
  }

  return (
    <div className="flex justify-between items-center py-8 border-t border-gray-200">
      {/* Önceki (varsa göster) */}
      {prevPost ? (
        <Link
          to={urlFor(prevPost)}
          className="group flex items-center space-x-4 hover:text-[#03588C] transition"
        >
          <img
            src={coverOf(prevPost) || prevFallback}
            alt={titleOf(prevPost)}
            className="w-16 h-16 object-cover rounded"
          />
          <div>
            <p className="text-sm text-gray-500">Önceki Gönderi</p>
            <h4 className="font-medium line-clamp-1">{titleOf(prevPost)}</h4>
          </div>
        </Link>
      ) : (
        // Sadece “sonraki” varsa sağa itmek için boş alan
        <div />
      )}

      {/* Sonraki (varsa göster) */}
      {nextPost ? (
        <Link
          to={urlFor(nextPost)}
          className="group flex items-center space-x-4 hover:text-[#03588C] transition"
        >
          <div className="text-right">
            <p className="text-sm text-gray-500">Sonraki Gönderi</p>
            <h4 className="font-medium line-clamp-1">{titleOf(nextPost)}</h4>
          </div>
          <img
            src={coverOf(nextPost) || nextFallback}
            alt={titleOf(nextPost)}
            className="w-16 h-16 object-cover rounded"
          />
        </Link>
      ) : null}
    </div>
  );
}
