import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PropTypes from "prop-types";
import AdminLoadingState from "../../components/AdminLoadingState";
import BlogForm from "../../components/BlogForm";
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

function EditBlog({ onRequestClose }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [initialData, setInitialData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [loadError, setLoadError] = useState("");

  const showToast = useCallback(
    (msg, type = "info", duration = 4000) =>
      setToast({ msg, type, duration }),
    []
  );

  const fetchBlog = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const { data } = await api.get(`/blogs/${id}`);
      setInitialData(data);
    } catch (e) {
      const status = e?.response?.status;
      const message =
        status === 404
          ? "Blog bulunamadı."
          : getAdminFeedbackMessage(e, "Blog detayları alınamadı.");
      console.error("GET /blogs/:id error:", e?.response?.data || e);
      setInitialData(null);
      setLoadError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => {
    fetchBlog();
  }, [fetchBlog]);

  const handleSubmit = async (fd) => {
    const taskId = createProgressTask("Blog güncelleniyor");
    try {
      setSubmitting(true);
      if (typeof onRequestClose === "function") {
        try {
          onRequestClose();
        } catch (closeError) {
          console.warn("onRequestClose failed:", closeError);
        }
      }

      await api.put(`/blogs/${id}`, fd, {
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
      completeProgressTask(taskId, "Blog güncellendi");
      showToast("Blog güncellendi.", "success");
      setTimeout(
        () => navigate("/admin/blogs"),
        ADMIN_SUCCESS_REDIRECT_DELAY_MS
      );
    } catch (e) {
      const message = getAdminFeedbackMessage(e, "Güncelleme başarısız.");
      console.error("PUT /blogs/:id error:", e?.response?.data || e);
      failProgressTask(taskId, message);
      showToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 overflow-x-hidden">
        <div className="mx-auto max-w-5xl px-3 sm:px-4 md:px-6">
          <AdminLoadingState
            title="Blog hazırlanıyor"
            message="Blog detayları ve medya alanları yükleniyor."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 overflow-x-hidden">
      <div className="mx-auto max-w-5xl px-3 sm:px-4 md:px-6">
        {loadError ? (
          <LoadErrorState
            title="Blog yüklenemedi"
            message={loadError}
            onRetry={fetchBlog}
          />
        ) : null}

        {!loadError && !initialData ? (
          <LoadErrorState
            title="Blog bulunamadı"
            message="Kayıt yüklenemedi veya artık mevcut değil."
            onRetry={fetchBlog}
          />
        ) : null}

        {loadError || !initialData ? null : (
        <div className="admin-section p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-500/12 via-transparent to-slate-400/10 dark:from-[#2c2f36]/60 dark:via-transparent dark:to-[#1f2227]/50" />
          <div className="relative flex items-start justify-between gap-3 mb-6">
            <div>
              <span className="badge-soft">Güncelle</span>
              <h2 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">
                Blogu Düzenle
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                İçerikleri koruyarak paneli baştan tasarladık.
              </p>
            </div>
          </div>

          <div className="relative">
            <BlogForm
              initialData={initialData}
              onSubmit={handleSubmit}
              submitting={submitting}
            />
          </div>
        </div>
        )}

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

export default EditBlog;

EditBlog.propTypes = {
  onRequestClose: PropTypes.func,
};
