/* Updated src/components/blog/CommentReplyForm.jsx */
import React, { useState } from "react";
import api from "../../../api";
import { useAuth } from "../../context/AuthContext";

export default function CommentReplyForm({ commentId, onReplyPosted }) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { isLoggedIn } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isLoggedIn) {
      onReplyPosted?.({ ok: false, msg: "Yanıt yazmak için giriş yapmalısınız." });
      return;
    }
    if (!text.trim()) {
      onReplyPosted?.({ ok: false, msg: "Yanıt göndermek için önce mesajınızı yazın." });
      return;
    }
    setSubmitting(true);

    try {
      await api.post(`/comments/${commentId}/replies`, { text });
      setText("");
      // Toast’ı parent göstersin:
      onReplyPosted?.({
        ok: true,
        msg: "Yanıtınız alındı ve onaylandıktan sonra yayınlanacaktır.",
      });
    } catch (err) {
      console.error("Reply gönderilemedi:", err);
      onReplyPosted?.({
        ok: false,
        msg:
          err?.response?.status === 401
            ? "Yanıt yazmak için giriş yapmalısınız."
            : err?.response?.data?.message || "Yanıt gönderilirken hata oluştu.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-2 space-y-2">
      <textarea
        aria-label="Yanıtınız"
        rows={3}
        placeholder="Bir cevap yazın..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={1000}
        className="w-full border px-3 py-2 rounded resize-none"
        disabled={submitting}
      />
      <p className="text-right text-xs text-gray-500">{text.length}/1000</p>
      <button
        type="submit"
        disabled={submitting}
        className={`px-4 py-2 text-sm rounded ${
          submitting
            ? "bg-gray-300 text-gray-600"
            : "bg-green-600 text-white hover:bg-green-700"
        }`}
      >
        {submitting ? "Gönderiliyor..." : "Yanıtı Gönder"}
      </button>
    </form>
  );
}
