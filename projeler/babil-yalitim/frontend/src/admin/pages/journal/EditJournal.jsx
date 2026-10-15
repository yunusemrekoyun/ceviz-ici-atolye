// src/admin/pages/journal/EditJournal.jsx
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AdminLoadingState from "../../components/AdminLoadingState.jsx";
import JournalForm from "../../components/JournalForm.jsx";
import LoadErrorState from "../../components/LoadErrorState.jsx";
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

const EditJournal = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [initialData, setInitialData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [toast, setToast] = useState(null);
  const showToast = useCallback(
    (msg, type = "info", duration = 4000) =>
      setToast({ msg, type, duration }),
    []
  );

  const fetchOne = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const { data } = await api.get(`/journals/${id}`);
      setInitialData(data);
    } catch (err) {
      const status = err?.response?.status;
      const message =
        status === 404
          ? "Haber bulunamadı."
          : getAdminFeedbackMessage(err, "Haber getirilemedi.");
      console.error("GET /journals/:id error:", err?.response?.data || err);
      setInitialData(null);
      setLoadError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => {
    fetchOne();
  }, [fetchOne]);

  const handleSubmit = async (fd) => {
    const taskId = createProgressTask("Haber güncelleniyor");
    try {
      setSubmitting(true);
      await api.put(`/journals/${id}`, fd, {
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
      completeProgressTask(taskId, "Haber güncellendi");
      showToast("Haber güncellendi", "success");
      setTimeout(
        () => navigate("/admin/journals"),
        ADMIN_SUCCESS_REDIRECT_DELAY_MS
      );
    } catch (err) {
      const message = getAdminFeedbackMessage(err, "Güncellenemedi.");
      console.error("PUT /journals/:id error:", err?.response?.data || err);
      failProgressTask(taskId, message);
      showToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 overflow-x-hidden">
        <div className="mx-auto w-full max-w-[1000px] px-2 sm:px-4">
          <AdminLoadingState
            title="Haber hazırlanıyor"
            message="Haber içeriği ve mevcut medya alanları yükleniyor."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 overflow-x-hidden">
      <div className="mx-auto w-full max-w-[1000px] px-2 sm:px-4">
        {loadError ? (
          <LoadErrorState
            title="Haber yüklenemedi"
            message={loadError}
            onRetry={fetchOne}
          />
        ) : null}

        {!loadError && !initialData ? (
          <LoadErrorState
            title="Haber bulunamadı"
            message="Kayıt yüklenemedi veya artık mevcut değil."
            onRetry={fetchOne}
          />
        ) : null}

        {loadError || !initialData ? null : (
        <div className="admin-section p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-500/12 via-transparent to-slate-400/10 dark:from-[#2c2f36]/60 dark:via-transparent dark:to-[#1f2227]/50" />
          <div className="relative flex items-start justify-between gap-3 mb-6">
            <div>
              <span className="badge-soft">Güncelle</span>
              <h2 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">
                Haberi Düzenle
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Medyalar korundu, panel görüntüsü tamamen değişti.
              </p>
            </div>
          </div>

          <div className="relative">
            <JournalForm
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
};

export default EditJournal;
