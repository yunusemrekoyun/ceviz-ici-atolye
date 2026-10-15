// src/components/blog/BlogCommentInput.jsx
import React, { useState } from "react";
import TextareaAutosize from "react-textarea-autosize";
import api from "../../../api";
import { useAuth } from "../../context/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";

export default function BlogCommentInput({ blogId, onCommentPosted }) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null); // ✅ yeni feedback alanı
  const { isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isLoggedIn) {
      setFeedback({
        type: "error",
        requiresLogin: true,
        msg: "Yorum yazmak için giriş yapmalısınız.",
      });
      return;
    }
    if (!text.trim()) {
      setFeedback({
        type: "error",
        msg: "Yorum göndermek için önce mesajınızı yazın.",
      });
      return;
    }
    setSubmitting(true);
    setFeedback(null);

    try {
      await api.post(`/comments/blogs/${blogId}/comments`, { text });
      setText("");
      setFeedback({
        type: "success",
        msg: "Yorumunuz alındı ve onaylandıktan sonra yayınlanacaktır.",
      });
      onCommentPosted?.();
    } catch (err) {
      console.error("Yorum gönderilemedi:", err);
      setFeedback({
        type: "error",
        requiresLogin: err?.response?.status === 401,
        msg:
          err?.response?.status === 401
            ? "Yorum yazmak için giriş yapmalısınız."
            : err?.response?.data?.message ||
              "Yorum gönderilirken bir hata oluştu. Lütfen tekrar deneyin.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-12">
      <h4 className="text-lg font-semibold text-[#0b0b0d] mb-6">
        Yanıt Bırakın
      </h4>
      <form onSubmit={handleSubmit} className="space-y-6">
        <TextareaAutosize
          aria-label="Yorumunuz"
          minRows={4}
          placeholder="Yorumunuzu buraya yazın..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={1000}
          className="w-full border px-3 py-2 rounded resize-none"
        />

        {/* ✅ Feedback mesajı */}
        {feedback && (
          <div>
            <p
              role={feedback.type === "success" ? "status" : "alert"}
              className={`text-sm ${
                feedback.type === "success" ? "text-green-600" : "text-red-600"
              }`}
            >
              {feedback.msg}
            </p>
            {feedback.requiresLogin && (
              <button
                type="button"
                onClick={() =>
                  navigate("/auth", { state: { from: location.pathname } })
                }
                className="mt-2 text-sm font-semibold underline"
              >
                Giriş ekranına git
              </button>
            )}
          </div>
        )}

        <p className="text-right text-xs text-gray-500">{text.length}/1000</p>

        <button
          type="submit"
          disabled={submitting}
          className={`px-8 py-3 border rounded ${
            submitting
              ? "bg-gray-300 border-gray-300 text-gray-600"
              : "border-[#03588C] text-[#03588C] hover:bg-[#03588C] hover:text-white"
          } transition-colors duration-200`}
        >
          {submitting ? "Gönderiliyor..." : "Yorumu Gönder"}
        </button>
      </form>
    </div>
  );
}
