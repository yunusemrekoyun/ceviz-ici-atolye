/* src/components/blog/CommentReplies.jsx */
import React from "react";
import CommentReplyItem from "./CommentReplyItem";

export default function CommentReplies({ replies, loading }) {
  if (loading) return <div className="ml-12 text-sm">Yanıtlar Bekleniyor...</div>;
  if (!replies.length)
    return <div className="ml-12 text-sm text-gray-500">Henüz yanıt yok.</div>;

  return (
    <div className="mt-2">
      {replies.map((r) => (
        <CommentReplyItem key={r._id} reply={r} />
      ))}
    </div>
  );
}
