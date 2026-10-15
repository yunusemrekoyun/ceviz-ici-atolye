// src/admin/pages/service/ServiceList.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../../api";
import AdminLoadingState from "../../components/AdminLoadingState";
import LoadErrorState from "../../components/LoadErrorState";
import ToastAlert from "../../components/ToastAlert";
import ConfirmDialog from "../../components/ConfirmDialog";
import OrderSelect from "../../components/OrderSelect";
import ServiceTranslationModal from "../../components/ServiceTranslationModal";
import { getAdminFeedbackMessage } from "../../utils/mediaFeedback";
import { getMediaUrl, getVideoPosterUrl } from "../../../utils/media";

const toArray = (data) => (Array.isArray(data) ? data : []);

const ServiceList = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orderingId, setOrderingId] = useState("");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [loadError, setLoadError] = useState("");
  const inputCls =
    "w-full sm:w-64 rounded-xl border border-slate-200/70 bg-white/70 px-3 py-2.5 text-sm shadow-sm outline-none focus:border-indigo-200 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-100 dark:focus:border-indigo-500/50 dark:focus:ring-indigo-500/30";

  const [toast, setToast] = useState(null);
  const showToast = (msg, type = "info", duration = 4000) =>
    setToast({ msg, type, duration });
  const [translationOpen, setTranslationOpen] = useState(false);
  const [translationTarget, setTranslationTarget] = useState(null);

  const [confirm, setConfirm] = useState({
    open: false,
    title: "",
    message: "",
    onConfirm: null,
    loading: false,
  });

  const fetchServices = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError("");
      const { data } = await api.get("/services");
      setServices(toArray(data));
    } catch (e) {
      console.error("GET /services error:", e?.response?.data || e);
      const message = getAdminFeedbackMessage(e, "Servisler getirilemedi.");
      setLoadError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const cats = useMemo(() => {
    const categories = new Set();
    services.forEach((service) => service.category && categories.add(service.category));
    return ["all", ...Array.from(categories)];
  }, [services]);

  const filtered = useMemo(() => {
    let items = [...services];
    const search = q.trim().toLowerCase();

    if (search) {
      items = items.filter(
        (service) =>
          service.title?.toLowerCase().includes(search) ||
          service.description?.toLowerCase().includes(search) ||
          service.type?.toLowerCase().includes(search)
      );
    }

    if (cat !== "all") {
      items = items.filter((service) => service.category === cat);
    }

    return items;
  }, [services, q, cat]);

  const askDelete = (id, title) => {
    setConfirm({
      open: true,
      title: "Hizmeti Sil",
      message: `"${title || "Bu hizmet"}" silinsin mi? Bu işlem geri alınamaz.`,
      loading: false,
      onConfirm: async () => {
        setConfirm((current) => ({ ...current, loading: true }));
        try {
          await api.delete(`/services/${id}`);
          await fetchServices();
          showToast("Hizmet silindi.", "success");
        } catch (e) {
          console.error("DELETE /services/:id error:", e?.response?.data || e);
          showToast(getAdminFeedbackMessage(e, "Hizmet silinemedi."), "error");
        } finally {
          setConfirm((current) => ({
            ...current,
            open: false,
            loading: false,
          }));
        }
      },
    });
  };

  const handleOrderChange = async (id, nextOrder) => {
    try {
      setOrderingId(id);
      await api.patch(`/services/${id}/order`, { displayOrder: nextOrder });
      await fetchServices();
      showToast("Hizmet sırası güncellendi.", "success", 2500);
    } catch (e) {
      console.error("PATCH /services/:id/order error:", e?.response?.data || e);
      showToast(
        getAdminFeedbackMessage(e, "Hizmet sırası güncellenemedi."),
        "error"
      );
    } finally {
      setOrderingId("");
    }
  };

  const openTranslationModal = (service) => {
    setTranslationTarget(service);
    setTranslationOpen(true);
  };

  const closeTranslationModal = () => {
    setTranslationOpen(false);
    setTranslationTarget(null);
  };

  const hasActiveFilters = Boolean(q.trim()) || cat !== "all";
  const emptyMessage = hasActiveFilters
    ? "Seçili filtrelerle eşleşen hizmet bulunamadı."
    : "Henüz hizmet kaydı yok.";

  if (loading && !services.length) {
    return (
      <div className="p-4 md:p-6 overflow-x-hidden">
        <AdminLoadingState
          title="Hizmetler yükleniyor"
          message="Hizmet listesi ve alt hizmet bilgileri hazırlanıyor."
        />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 overflow-x-hidden space-y-5">
      <div className="admin-section p-4 sm:p-5 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-500/12 via-transparent to-slate-400/10 dark:from-[#2c2f36]/60 dark:via-transparent dark:to-[#1f2227]/50" />
        <div className="relative flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <span className="badge-soft">Hizmetler</span>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">
              Hizmetler
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Liste ve butonlar koyu/açık temayla uyumlu hale getirildi.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ara (başlık/tür/açıklama)"
              className={inputCls}
            />
            <select
              value={cat}
              onChange={(e) => setCat(e.target.value)}
              className={`${inputCls} sm:w-40`}
            >
              {cats.map((category) => (
                <option key={category} value={category}>
                  {category === "all" ? "Tüm Kategoriler" : category}
                </option>
              ))}
            </select>
            <Link to="/admin/services/add" className="btn-admin-primary shrink-0">
              + Yeni Hizmet
            </Link>
          </div>
        </div>
      </div>

      {loadError ? (
        <LoadErrorState
          title="Hizmetler yüklenemedi"
          message={loadError}
          onRetry={fetchServices}
        />
      ) : null}

      {loadError && !services.length ? null : filtered.length === 0 ? (
        <div className="admin-card p-6 text-center text-slate-500 dark:text-slate-300">
          {emptyMessage}
        </div>
      ) : (
        <div className="-mx-4 overflow-x-auto sm:mx-0">
          <div className="admin-card overflow-hidden p-0">
            <table className="min-w-[860px] w-full border-collapse text-sm">
              <thead className="bg-slate-50/70 text-left text-slate-600 dark:bg-slate-900/50 dark:text-slate-300">
                <tr>
                  <th className="border border-slate-200/70 p-3 dark:border-slate-800/70">
                    Kapak
                  </th>
                  <th className="border border-slate-200/70 p-3 dark:border-slate-800/70">
                    Başlık
                  </th>
                  <th className="border border-slate-200/70 p-3 dark:border-slate-800/70">
                    Sıra
                  </th>
                  <th className="border border-slate-200/70 p-3 dark:border-slate-800/70">
                    Tür
                  </th>
                  <th className="border border-slate-200/70 p-3 dark:border-slate-800/70">
                    Kategori
                  </th>
                  <th className="border border-slate-200/70 p-3 dark:border-slate-800/70">
                    Alt Hizmetler
                  </th>
                  <th className="border border-slate-200/70 p-3 w-56 dark:border-slate-800/70">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((service) => (
                  <tr
                    key={service._id}
                    className="align-top transition hover:bg-indigo-50/60 dark:hover:bg-slate-800/40"
                  >
                    <td className="border border-slate-200/70 p-3 dark:border-slate-800/70">
                      {getMediaUrl(service.cover) ? (
                        <div className="relative">
                          {service.cover.resourceType === "video" ? (
                            <>
                              <video
                                src={getMediaUrl(service.cover)}
                                poster={
                                  getVideoPosterUrl(service.cover, {
                                    fallbackSrc: getMediaUrl(service.cover),
                                  }) || undefined
                                }
                                className="h-16 w-24 rounded-md object-cover"
                                muted
                                playsInline
                              />
                              <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
                                video
                              </span>
                            </>
                          ) : (
                            <img
                              src={getMediaUrl(service.cover)}
                              alt={service.title}
                              className="h-16 w-24 rounded-md object-cover"
                            />
                          )}
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="border border-slate-200/70 p-3 dark:border-slate-800/70">
                      <div className="font-medium text-slate-800 dark:text-slate-100">
                        {service.title}
                      </div>
                      {Array.isArray(service.usageAreas) &&
                      service.usageAreas.length > 0 ? (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {service.usageAreas.slice(0, 3).map((area) => (
                            <span
                              key={area}
                              className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                            >
                              {area}
                            </span>
                          ))}
                          {service.usageAreas.length > 3 ? (
                            <span className="text-[11px] text-slate-400">
                              +{service.usageAreas.length - 3}
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </td>
                    <td className="border border-slate-200/70 p-3 dark:border-slate-800/70">
                      <OrderSelect
                        value={service.displayOrder || 1}
                        max={services.length || 1}
                        onChange={(value) =>
                          handleOrderChange(service._id, value)
                        }
                        disabled={orderingId === service._id}
                      />
                    </td>
                    <td className="border border-slate-200/70 p-3 dark:border-slate-800/70">
                      {service.type || "-"}
                    </td>
                    <td className="border border-slate-200/70 p-3 dark:border-slate-800/70">
                      {service.category || "-"}
                    </td>
                    <td className="border border-slate-200/70 p-3 dark:border-slate-800/70">
                      {Array.isArray(service.subServices) &&
                      service.subServices.length > 0 ? (
                        <div className="space-y-2">
                          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                            {service.subServices.length} alt hizmet
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {service.subServices.slice(0, 3).map((subService) => (
                              <span
                                key={subService._id || subService.title}
                                className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-100"
                              >
                                #{subService.displayOrder || 1} {subService.title}
                              </span>
                            ))}
                            {service.subServices.length > 3 ? (
                              <span className="text-[11px] text-slate-400">
                                +{service.subServices.length - 3}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-500">
                          Yok
                        </span>
                      )}
                    </td>
                    <td className="border border-slate-200/70 p-3 dark:border-slate-800/70">
                      <div className="flex gap-2">
                        <Link
                          to={`/admin/services/edit/${service._id}`}
                          className="inline-flex items-center gap-1 rounded-xl bg-slate-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800"
                        >
                          Düzenle
                        </Link>
                        <button
                          type="button"
                          onClick={() => openTranslationModal(service)}
                          className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold text-white shadow-sm ${
                            service.hasEnglishTranslation
                              ? "bg-emerald-600 hover:bg-emerald-700"
                              : "bg-indigo-600 hover:bg-indigo-700"
                          }`}
                        >
                          {service.hasEnglishTranslation ? "EN Düzenle" : "EN Çeviri"}
                        </button>
                        <button
                          onClick={() => askDelete(service._id, service.title)}
                          className="inline-flex items-center gap-1 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-rose-700"
                        >
                          Sil
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {toast ? (
        <ToastAlert
          msg={toast.msg}
          type={toast.type}
          duration={toast.duration}
          onClose={() => setToast(null)}
        />
      ) : null}

      <ServiceTranslationModal
        open={translationOpen}
        serviceId={translationTarget?._id}
        serviceTitle={translationTarget?.title}
        onClose={closeTranslationModal}
        onSaved={async () => {
          await fetchServices();
          showToast("İngilizce hizmet çevirisi kaydedildi.", "success");
        }}
      />

      {confirm.open ? (
        <ConfirmDialog
          open={confirm.open}
          title={confirm.title}
          message={confirm.message}
          type="danger"
          onCancel={() => {
            if (confirm.loading) return;
            setConfirm((current) => ({ ...current, open: false }));
          }}
          onConfirm={confirm.onConfirm}
          loading={confirm.loading}
        />
      ) : null}
    </div>
  );
};

export default ServiceList;
