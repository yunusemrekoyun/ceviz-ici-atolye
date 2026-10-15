// src/admin/pages/project/AddProject.jsx
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import ProjectForm from "../../components/ProjectForm";
import api from "../../../api";
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

const AddProject = ({ onRequestClose }) => {
  const navigate = useNavigate();

  // toast state
  const [toast, setToast] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const showToast = (msg, type = "info", duration = 4000) =>
    setToast({ msg, type, duration });

  const handleSubmit = async (formData) => {
    const taskId = createProgressTask("Proje yükleniyor");
    try {
      setSubmitting(true);
      if (typeof onRequestClose === "function") {
        try {
          onRequestClose();
        } catch (closeError) {
          console.warn("onRequestClose failed:", closeError);
        }
      }

      await api.post("/projects", formData, {
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
      completeProgressTask(taskId, "Proje eklendi");
      showToast("Proje eklendi", "success");
      setTimeout(
        () => navigate("/admin/projects"),
        ADMIN_SUCCESS_REDIRECT_DELAY_MS
      );
    } catch (err) {
      const message = getAdminFeedbackMessage(err, "Proje eklenemedi.");
      console.error("Create /projects error:", err?.response?.data || err);
      failProgressTask(taskId, message);
      showToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-6">
      <div className="mx-auto max-w-5xl">
        <div className="admin-section p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-500/12 via-transparent to-slate-400/10 dark:from-[#2c2f36]/60 dark:via-transparent dark:to-[#1f2227]/50" />
          <div className="relative flex items-start justify-between gap-3 mb-6">
            <div>
              <span className="badge-soft">Yeni kayıt</span>
              <h2 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">
                Yeni Proje
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Tasarım yenilendi, form alanları aynı kaldı.
              </p>
            </div>
          </div>
          <div className="relative">
            <ProjectForm onSubmit={handleSubmit} submitting={submitting} />
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

export default AddProject;

AddProject.propTypes = {
  onRequestClose: PropTypes.func,
};
