// src/admin/pages/project/EditProject.jsx
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PropTypes from "prop-types";
import AdminLoadingState from "../../components/AdminLoadingState";
import ProjectForm from "../../components/ProjectForm";
import LoadErrorState from "../../components/LoadErrorState";
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

const EditProject = ({ onRequestClose }) => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [initialData, setInitialData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState("");

  // toast state
  const [toast, setToast] = useState(null);
  const showToast = useCallback(
    (msg, type = "info", duration = 4000) =>
      setToast({ msg, type, duration }),
    []
  );

  const fetchProject = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const { data } = await api.get(`/projects/${id}`);
      setInitialData(data);
    } catch (err) {
      const status = err?.response?.status;
      const message =
        status === 404
          ? "Proje bulunamadı."
          : getAdminFeedbackMessage(err, "Proje yüklenemedi.");
      console.error("GET /projects/:id error:", err?.response?.data || err);
      setInitialData(null);
      setLoadError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  const handleSubmit = async (formData) => {
    const taskId = createProgressTask("Proje güncelleniyor");
    try {
      setSubmitting(true);
      if (typeof onRequestClose === "function") {
        try {
          onRequestClose();
        } catch (closeError) {
          console.warn("onRequestClose failed:", closeError);
        }
      }

      await api.put(`/projects/${id}`, formData, {
        onUploadProgress: (evt) => {
          if (evt.total) {
            updateProgressTask(
              taskId,
              clampProgress((evt.loaded / evt.total) * 100),
              "Medya yükleniyor…"
            );
          }
        },
      });
      completeProgressTask(taskId, "Proje güncellendi");
      showToast("Proje güncellendi", "success");
      setTimeout(
        () => navigate("/admin/projects"),
        ADMIN_SUCCESS_REDIRECT_DELAY_MS
      );
    } catch (err) {
      const message = getAdminFeedbackMessage(err, "Güncellenemedi.");
      console.error("PUT /projects/:id error:", err?.response?.data || err);
      failProgressTask(taskId, message);
      showToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <div className="mx-auto max-w-5xl">
          <AdminLoadingState
            title="Proje hazırlanıyor"
            message="Proje bilgileri ve medya alanları yükleniyor."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="mx-auto max-w-5xl">
        {loadError ? (
          <LoadErrorState
            title="Proje yüklenemedi"
            message={loadError}
            onRetry={fetchProject}
          />
        ) : null}

        {!loadError && !initialData ? (
          <LoadErrorState
            title="Proje bulunamadı"
            message="Kayıt yüklenemedi veya artık mevcut değil."
            onRetry={fetchProject}
          />
        ) : null}

        {loadError || !initialData ? null : (
        <div className="admin-section p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-500/12 via-transparent to-slate-400/10 dark:from-[#2c2f36]/60 dark:via-transparent dark:to-[#1f2227]/50" />
          <div className="relative flex items-start justify-between gap-3 mb-6">
            <div>
              <span className="badge-soft">Güncelle</span>
              <h2 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">
                Projeyi Düzenle
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                İçerikleri aynı tutup arayüzü yeniledik.
              </p>
            </div>
          </div>
          <div className="relative">
            <ProjectForm
              initialData={initialData}
              onSubmit={handleSubmit}
              submitting={submitting}
            />
          </div>
        </div>
        )}
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

export default EditProject;

EditProject.propTypes = {
  onRequestClose: PropTypes.func,
};
