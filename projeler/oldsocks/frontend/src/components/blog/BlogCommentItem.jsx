/* Updated src/components/blog/BlogCommentItem.jsx */
import React, { useCallback, useState, useEffect } from "react";
import placeholderAvatar from "../../assets/blog/blog-owner/author.webp";
import CommentReplyForm from "./CommentReplyForm";
import CommentReplies from "./CommentReplies";
import api from "../../../api";
import ToastAlert from "../ui/ToastAlert";

export default function BlogCommentItem({ comment }) {
  const { author, createdAt, text, _id: commentId } = comment;
  const date = new Date(createdAt).toLocaleString("tr-TR", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const avatarUrl = author?.avatar || placeholderAvatar;

  const [showReplies, setShowReplies] = useState(false);
  const [replies, setReplies] = useState([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // toast’ı parent’ta tut
  const [toast, setToast] = useState(null);

  const fetchReplies = useCallback(async () => {
    setLoadingReplies(true);
    try {
      const { data } = await api.get(`/comments/${commentId}/replies`);
      setReplies(data);
    } catch (err) {
      console.error("Yanıtlar yüklenemedi:", err);
    } finally {
      setLoadingReplies(false);
    }
  }, [commentId]);

  useEffect(() => {
    if (showReplies) fetchReplies();
  }, [fetchReplies, showReplies]);

  // reply formundan gelen sonucu al
  const handleReplyPosted = (result) => {
    // result: { ok: boolean, msg: string }
    if (result?.ok) {
      setShowForm(false);
      setShowReplies(true);
      fetchReplies();
    }
    // toast’ı her iki durumda da göster (form kapanmış olsa bile görünür)
    if (result?.msg) {
      setToast({ msg: result.msg, type: result.ok ? "success" : "error" });
    }
  };

  return (
    <div className="mb-8">
      <div className="flex space-x-4">
        <img
          src={avatarUrl}
          alt={`${author?.firstName || "Oldscks"} ${author?.lastName || ""}`.trim()}
          className="w-12 h-12 rounded-full object-cover"
        />
        <div className="flex-1">
          <div className="flex justify-between items-center">
            <h5 className="font-medium text-[#0b0b0d]">
              {author?.firstName || "Oldscks"} {author?.lastName || ""}
            </h5>
            <span className="text-sm text-[#888]">{date}</span>
          </div>
          <p className="text-[#444] mt-2">{text}</p>

          {/* Actions */}
          <div className="mt-3 flex items-center gap-4 text-sm">
            <button
              onClick={() => setShowReplies((v) => !v)}
              className="text-blue-600 hover:underline"
            >
              {showReplies ? "Yanıtları Gizle" : "Yanıtları Göster"}
            </button>
            <button
              onClick={() => setShowForm((v) => !v)}
              className="text-green-600 hover:underline"
            >
              {showForm ? "İptal" : "Yanıtla"}
            </button>
          </div>

          {/* Replies List */}
          {showReplies && (
            <CommentReplies replies={replies} loading={loadingReplies} />
          )}

          {/* Reply Form */}
          {showForm && (
            <CommentReplyForm
              commentId={commentId}
              onReplyPosted={handleReplyPosted}
            />
          )}
        </div>
      </div>

      {/* Toast parent’ta — form kapansa bile görünür */}
      {toast && (
        <ToastAlert
          msg={toast.msg}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
