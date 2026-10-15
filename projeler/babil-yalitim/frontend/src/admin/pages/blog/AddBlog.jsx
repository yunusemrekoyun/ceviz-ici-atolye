import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import BlogForm from "../../components/BlogForm";
import api from "../../../api";
import ToastAlert from "../../components/ToastAlert";

import {
  createProgressTask,
  updateProgressTask,
  completeProgressTask,
  failProgressTask,
  clampProgress,
} from "../../utils/progressBus";
import {
  ADMIN_SUCCESS_REDIRECT_DELAY_MS,
  getAdminFeedbackMessage,
} from "../../utils/mediaFeedback";

function AddBlog({ onRequestClose }) {
  const navigate = useNavigate();
  const [toast, setToast] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const showToast = (msg, type = "info", duration = 4000) =>
    setToast({ msg, type, duration });

  const handleSubmit = async (fd) => {
    const taskId = createProgressTask("Blog yükleniyor");
    try {
      setSubmitting(true);
      if (typeof onRequestClose === "function") {
        try {
          onRequestClose();
        } catch (closeError) {
          console.warn("onRequestClose failed:", closeError);
        }
      }

      await api.post("/blogs", fd, {
        onUploadProgress: (evt) => {
          if (evt.total) {
            updateProgressTask(
              taskId,
              clampProgress((evt.loaded / evt.total) * 100),
              "İçerik yükleniyor…"
            );
          }
        },
      });
      completeProgressTask(taskId, "Blog eklendi");
      showToast("Blog eklendi.", "success");
      setTimeout(
        () => navigate("/admin/blogs"),
        ADMIN_SUCCESS_REDIRECT_DELAY_MS
      );
    } catch (e) {
      const message = getAdminFeedbackMessage(e, "Blog eklenemedi.");
      console.error("POST /blogs error:", e?.response?.data || e);
      failProgressTask(taskId, message);
      showToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    // overflow-x-hidden: olası taşmaları kes
    <div className="p-4 md:p-6 overflow-x-hidden">
      <div className="mx-auto max-w-5xl px-3 sm:px-4 md:px-6">
        <div className="admin-section p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-500/12 via-transparent to-slate-400/10 dark:from-[#2c2f36]/60 dark:via-transparent dark:to-[#1f2227]/50" />
          <div className="relative flex items-start justify-between gap-3 mb-6">
            <div>
              <span className="badge-soft">Yeni kayıt</span>
              <h2 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">
                Yeni Blog
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Alanları koruyarak tamamen yenilenmiş panel görünümü.
              </p>
            </div>
          </div>

          <div className="relative">
            <BlogForm onSubmit={handleSubmit} submitting={submitting} />
          </div>
        </div>

        {toast && (
          <ToastAlert
            msg={toast.msg}
            type={toast.type}
            duration={toast.duration}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    </div>
  );
}

export default AddBlog;

AddBlog.propTypes = {
  onRequestClose: PropTypes.func,
};
