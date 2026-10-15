// src/components/blog/BlogComments.jsx
import React from "react";
import BlogCommentItem from "./BlogCommentItem";

export default function BlogComments({ comments, loading }) {
  if (loading) return <div>Yorumlar yükleniyor…</div>;

  return (
    <div className="mt-12">
      <h4 className="text-xl font-semibold mb-6 text-[#0b0b0d]">
        {comments.length} Yorumlar
      </h4>
      {comments.map((c) => (
        <BlogCommentItem key={c._id} comment={c} />
      ))}
    </div>
  );
}
