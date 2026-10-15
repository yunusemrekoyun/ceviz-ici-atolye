// src/admin/pages/service/AddService.jsx
import { useNavigate } from "react-router-dom";
import api from "../../../api";
import ServiceForm from "../../components/ServiceForm";
import ToastAlert from "../../components/ToastAlert";
import { useState } from "react";
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

const AddService = () => {
  const navigate = useNavigate();
  const [toast, setToast] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const showToast = (msg, type = "info", duration = 4000) =>
    setToast({ msg, type, duration });

  const handleSubmit = async (formData) => {
    const taskId = createProgressTask("Hizmet yükleniyor");
    try {
      setSubmitting(true);
      await api.post("/services", formData, {
        onUploadProgress: (evt) => {
          if (evt.total) {
            const pct = clampProgress((evt.loaded / evt.total) * 100);
            updateProgressTask(taskId, pct, "Dosyalar gönderiliyor…");
          }
        },
      });
      completeProgressTask(taskId, "Hizmet eklendi");
      showToast("Hizmet eklendi", "success");
      setTimeout(
        () => navigate("/admin/services"),
        ADMIN_SUCCESS_REDIRECT_DELAY_MS
      );
    } catch (err) {
      const message = getAdminFeedbackMessage(err, "Hizmet eklenemedi.");
      console.error("POST /services error:", err?.response?.data || err);
      failProgressTask(taskId, message);
      showToast(message, "error");
    }
    finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 overflow-x-hidden">
      <div className="mx-auto w-full max-w-[1000px] px-2 sm:px-4">
        <div className="admin-section p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-500/12 via-transparent to-slate-400/10 dark:from-[#2c2f36]/60 dark:via-transparent dark:to-[#1f2227]/50" />
          <div className="relative flex items-start justify-between gap-3 mb-6">
            <div>
              <span className="badge-soft">Yeni kayıt</span>
              <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
                Hizmet Ekle
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Alanlar aynı; görünüm artık daha koyu ve modern.
              </p>
            </div>
          </div>
          <div className="relative">
          <ServiceForm onSubmit={handleSubmit} submitting={submitting} />
        </div>
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
  );
};

export default AddService;
