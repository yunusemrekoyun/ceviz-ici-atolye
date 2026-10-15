// src/admin/pages/service/EditService.jsx
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../../api";
import AdminLoadingState from "../../components/AdminLoadingState";
import ServiceForm from "../../components/ServiceForm";
import LoadErrorState from "../../components/LoadErrorState";
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

const EditService = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [serviceData, setServiceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [toast, setToast] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const showToast = useCallback(
    (msg, type = "info", duration = 4000) =>
      setToast({ msg, type, duration }),
    []
  );

  const fetchService = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const { data } = await api.get(`/services/${id}`);
      setServiceData(data);
    } catch (err) {
      const status = err?.response?.status;
      const message =
        status === 404
          ? "Hizmet bulunamadı."
          : getAdminFeedbackMessage(err, "Hizmet yüklenemedi.");
      console.error("GET /services/:id error:", err?.response?.data || err);
      setServiceData(null);
      setLoadError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => {
    fetchService();
  }, [fetchService]);

  const handleSubmit = async (formData) => {
    const taskId = createProgressTask("Hizmet güncelleniyor");
    try {
      setSubmitting(true);
      await api.put(`/services/${id}`, formData, {
        onUploadProgress: (evt) => {
          if (evt.total) {
            updateProgressTask(
              taskId,
              clampProgress((evt.loaded / evt.total) * 100),
              "Dosyalar yükleniyor…"
            );
          }
        },
      });
      completeProgressTask(taskId, "Hizmet güncellendi");
      showToast("Hizmet güncellendi", "success");
      setTimeout(
        () => navigate("/admin/services"),
        ADMIN_SUCCESS_REDIRECT_DELAY_MS
      );
    } catch (err) {
      const message = getAdminFeedbackMessage(err, "Güncelleme başarısız.");
      console.error("PUT /services/:id error:", err?.response?.data || err);
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
            title="Hizmet hazırlanıyor"
            message="Hizmet detayları ve alt hizmet verileri yükleniyor."
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
            title="Hizmet yüklenemedi"
            message={loadError}
            onRetry={fetchService}
          />
        ) : null}

        {!loadError && !serviceData ? (
          <LoadErrorState
            title="Hizmet bulunamadı"
            message="Kayıt yüklenemedi veya artık mevcut değil."
            onRetry={fetchService}
          />
        ) : null}

        {loadError || !serviceData ? null : (
        <div className="admin-section p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-500/12 via-transparent to-slate-400/10 dark:from-[#2c2f36]/60 dark:via-transparent dark:to-[#1f2227]/50" />
          <div className="relative flex items-start justify-between gap-3 mb-6">
            <div>
              <span className="badge-soft">Güncelle</span>
              <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
                Hizmeti Düzenle
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Aynı alanlar, çok daha koyu ve modern bir panel.
              </p>
            </div>
          </div>
          <div className="relative">
          <ServiceForm initialData={serviceData} onSubmit={handleSubmit} submitting={submitting} />
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

export default EditService;
