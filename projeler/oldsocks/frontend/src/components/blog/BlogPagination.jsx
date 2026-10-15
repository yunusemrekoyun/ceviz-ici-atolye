// src/components/blog/BlogPagination.jsx
import React from "react";
import PropTypes from "prop-types";

export default function BlogPagination({
  totalPosts,
  postsPerPage = 3,
  currentPage,
  onPageChange,
}) {
  const totalPages = Math.ceil(totalPosts / postsPerPage);

  // Tek sayfa gerekiyorsa sadece "1" göster
  if (totalPages <= 1) {
    return (
      <div className="flex justify-center items-center mt-8">
        <button className="px-3 py-1 border border-dark1 text-dark1 rounded">
          1
        </button>
      </div>
    );
  }

  // Sayfa numaralarını oluştur
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div className="flex justify-center items-center mt-8 space-x-4">
      {/* Geri */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className={`px-3 py-1 border border-light2 rounded hover:bg-light1 ${
          currentPage <= 1 ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        &lt;
      </button>

      {/* Sayfa numaraları */}
      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          className={`px-3 py-1 border rounded ${
            p === currentPage
              ? "border-dark1 text-dark1"
              : "border-light2 hover:bg-light1"
          }`}
        >
          {p}
        </button>
      ))}

      {/* İleri */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className={`px-3 py-1 border border-light2 rounded hover:bg-light1 ${
          currentPage >= totalPages ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        &gt;
      </button>
    </div>
  );
}

BlogPagination.propTypes = {
  totalPosts: PropTypes.number.isRequired,
  postsPerPage: PropTypes.number,
  currentPage: PropTypes.number.isRequired,
  onPageChange: PropTypes.func.isRequired,
};
