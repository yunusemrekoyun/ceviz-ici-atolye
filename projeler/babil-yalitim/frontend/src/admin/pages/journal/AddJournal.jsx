// src/admin/pages/journal/AddJournal.jsx
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import JournalForm from "../../components/JournalForm.jsx";
import ToastAlert from "../../components/ToastAlert";
import api from "../../../api.js";

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

const AddJournal = () => {
  const navigate = useNavigate();

  const [toast, setToast] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const showToast = (msg, type = "info", duration = 4000) =>
    setToast({ msg, type, duration });

  const handleSubmit = async (fd) => {
    const taskId = createProgressTask("Haber yükleniyor");
    try {
      setSubmitting(true);
      await api.post("/journals", fd, {
        onUploadProgress: (evt) => {
          if (evt.total) {
            updateProgressTask(
              taskId,
              clampProgress((evt.loaded / evt.total) * 100),
              "Yükleniyor…"
            );
          }
        },
      });
      completeProgressTask(taskId, "Haber eklendi");
      showToast("Haber eklendi", "success");
      setTimeout(
        () => navigate("/admin/journals"),
        ADMIN_SUCCESS_REDIRECT_DELAY_MS
      );
    } catch (err) {
      const message = getAdminFeedbackMessage(err, "Haber eklenemedi.");
      console.error("POST /journals error:", err?.response?.data || err);
      failProgressTask(taskId, message);
      showToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    // dışta genel padding, taşmaları kes
    <div className="p-4 md:p-6 overflow-x-hidden">
      <div className="mx-auto w-full max-w-[1000px] px-2 sm:px-4">
        <div className="admin-section p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-500/12 via-transparent to-slate-400/10 dark:from-[#2c2f36]/60 dark:via-transparent dark:to-[#1f2227]/50" />
          <div className="relative flex items-start justify-between gap-3 mb-6">
            <div>
              <span className="badge-soft">Yeni kayıt</span>
              <h2 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">
                Yeni Haber
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Dikey kapak, zengin içerik; tasarım tamamen yenilendi.
              </p>
            </div>
          </div>

          <div className="relative">
          <JournalForm onSubmit={handleSubmit} submitting={submitting} />
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
};

export default AddJournal;
