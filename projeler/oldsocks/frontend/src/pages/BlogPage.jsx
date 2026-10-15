// src/pages/BlogPage.jsx
import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../../api";
import BreadCrumb from "../components/breadCrumb/BreadCrumb";
import BlogItem from "../components/blog/BlogItem";
import BlogSearch from "../components/blog/BlogSearch";
import BlogCategory from "../components/blog/BlogCategory";
import RecentBlog from "../components/blog/RecentBlog";
import Tags from "../components/blog/Tags";
import SocialMedia from "../components/blog/SocialMedia";
import NewsLetter from "../components/blog/NewsLetter";
import { formatTurkishDate } from "../utils/date";
import BlogPagination from "../components/blog/BlogPagination";
import PageLoading from "../components/common/PageLoading";
import usePageMeta from "../hooks/usePageMeta";

export default function BlogPage() {
  usePageMeta({ title: "Blog" });
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();

  const categoryFilter = searchParams.get("category");
  const tagFilter = searchParams.get("tag");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const postsPerPage = 3;

  useEffect(() => {
    setLoading(true);
    api
      .get("/blogs", {
        params: tagFilter ? { tag: tagFilter } : undefined,
      })
      .then(({ data }) => {
        setPosts(data);
        setCurrentPage(1); // Yeni filtre geldiğinde sayfayı 1’e resetle
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [tagFilter]);

  // client-side kategori filtresi
  const filteredPosts = categoryFilter
    ? posts.filter((post) =>
        post.categories.some((c) => c.slug === categoryFilter)
      )
    : posts;

  // pagination için slice
  const startIndex = (currentPage - 1) * postsPerPage;
  const pagedPosts = filteredPosts.slice(startIndex, startIndex + postsPerPage);

  if (loading) return <PageLoading />;

  // Başlık mesajı
  let headerMsg = null;
  if (categoryFilter) {
    headerMsg = `"${categoryFilter}" kategorisine ait bloglar`;
  } else if (tagFilter) {
    headerMsg = `"${tagFilter}" etiketine ait bloglar`;
  }

  return (
    <>
      <BreadCrumb />

      <main className="container mx-auto px-4 py-8 sm:py-16 grid grid-cols-1 lg:grid-cols-3 gap-8 sm:gap-10">
        {/* Sol sütun */}
        <section className="lg:col-span-2 space-y-10">
          {headerMsg && <h2 className="text-2xl font-semibold">{headerMsg}</h2>}

          {filteredPosts.length > 0 ? (
            pagedPosts.map((post) => (
              <BlogItem
                key={post._id}
                to={`/blog/${post.slug}`}
                image={post.coverImageUrl}
                date={formatTurkishDate(post.publishedAt || post.createdAt)}
                title={post.title}
                excerpt={post.excerpt}
                author={
                  [post.author?.firstName, post.author?.lastName]
                    .filter(Boolean)
                    .join(" ") || "Oldscks"
                }
                category={(post.categories || [])
                  .map((c) => c?.name)
                  .filter(Boolean)
                  .join(", ")}
                comments={post.commentsCount}
              />
            ))
          ) : (
            <p className="text-center text-gray-500">
              {headerMsg
                ? headerMsg.includes("kategorisine")
                  ? "Bu kategoriye ait blog bulunamadı."
                  : "Bu etiketle ilgili blog bulunamadı."
                : "Henüz bir blog yok."}
            </p>
          )}

          <BlogPagination
            totalPosts={filteredPosts.length}
            postsPerPage={postsPerPage}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
          />
        </section>

        {/* Sağ sütun (sidebar) */}
        <aside className="lg:col-span-1 space-y-6">
          <BlogSearch />
          <BlogCategory />
          <RecentBlog />
          <Tags />
          <SocialMedia />
          <NewsLetter />
        </aside>
      </main>
    </>
  );
}
