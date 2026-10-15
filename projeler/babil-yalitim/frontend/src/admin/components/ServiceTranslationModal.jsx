import { createPortal } from "react-dom";
import PropTypes from "prop-types";
import { useEffect, useState } from "react";
import api from "../../api";
import { getAdminFeedbackMessage } from "../utils/mediaFeedback";

const inputCls =
  "w-full rounded-xl border border-slate-200/70 bg-white/70 px-3 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition focus:border-indigo-200 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950/55 dark:text-slate-100 dark:focus:border-indigo-500/50 dark:focus:ring-indigo-500/30";

const readonlyCls = `${inputCls} cursor-default bg-slate-50/90 text-slate-500 dark:bg-slate-900/70 dark:text-slate-300`;

const toAreaString = (value) =>
  Array.isArray(value) ? value.filter(Boolean).join(", ") : "";

export default function ServiceTranslationModal({
  open,
  serviceId,
  serviceTitle,
  onClose,
  onSaved,
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [source, setSource] = useState({
    title: "",
    type: "",
    category: "",
    usageAreas: [],
    description: "",
  });
  const [form, setForm] = useState({
    title: "",
    type: "",
    category: "",
    usageAreas: "",
    description: "",
  });
  const [subServices, setSubServices] = useState([]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key !== "Escape" || saving) return;
      onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, open, saving]);

  useEffect(() => {
    if (!open || !serviceId) return;
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError("");
        const { data } = await api.get(`/services/${serviceId}/translations`);
        if (cancelled) return;

        setSource({
          title: data?.source?.title || "",
          type: data?.source?.type || "",
          category: data?.source?.category || "",
          usageAreas: data?.source?.usageAreas || [],
          description: data?.source?.description || "",
        });
        setForm({
          title: data?.translations?.en?.title || "",
          type: data?.translations?.en?.type || "",
          category: data?.translations?.en?.category || "",
          usageAreas: toAreaString(data?.translations?.en?.usageAreas),
          description: data?.translations?.en?.description || "",
        });
        setSubServices(
          Array.isArray(data?.subServices)
            ? data.subServices.map((item) => ({
                id: item.id,
                source: {
                  title: item?.source?.title || "",
                  type: item?.source?.type || "",
                  category: item?.source?.category || "",
                  usageAreas: item?.source?.usageAreas || [],
                  description: item?.source?.description || "",
                },
                form: {
                  title: item?.translations?.en?.title || "",
                  type: item?.translations?.en?.type || "",
                  category: item?.translations?.en?.category || "",
                  usageAreas: toAreaString(item?.translations?.en?.usageAreas),
                  description: item?.translations?.en?.description || "",
                },
                hasEnglishTranslation: Boolean(item?.hasEnglishTranslation),
              }))
            : []
        );
      } catch (fetchError) {
        if (cancelled) return;
        setError(
          getAdminFeedbackMessage(
            fetchError,
            "Hizmet çevirisi bilgileri alınamadı."
          )
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, serviceId]);

  const updateSubServiceForm = (id, field, value) => {
    setSubServices((items) =>
      items.map((item) =>
        item.id === id
          ? {
              ...item,
              form: {
                ...item.form,
                [field]: value,
              },
            }
          : item
      )
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!serviceId || saving) return;

    try {
      setSaving(true);
      setError("");

      const { data } = await api.put(`/services/${serviceId}/translations`, {
        title: form.title.trim(),
        type: form.type.trim(),
        category: form.category.trim(),
        usageAreas: form.usageAreas.trim(),
        description: form.description.trim(),
        subServices: subServices.map((item) => ({
          id: item.id,
          title: item.form.title.trim(),
          type: item.form.type.trim(),
          category: item.form.category.trim(),
          usageAreas: item.form.usageAreas.trim(),
          description: item.form.description.trim(),
        })),
      });

      onSaved?.(data);
      onClose?.();
    } catch (saveError) {
      setError(
        getAdminFeedbackMessage(
          saveError,
          "Hizmet çevirisi kaydedilemedi."
        )
      );
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[1001] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-950/72 backdrop-blur-sm"
        onClick={saving ? undefined : onClose}
      />

      <div className="relative z-10 flex max-h-[92vh] w-full max-w-7xl flex-col overflow-hidden rounded-[32px] border border-white/20 bg-white shadow-2xl dark:bg-slate-950">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200/70 px-6 py-5 dark:border-slate-800">
          <div>
            <span className="badge-soft">İngilizce</span>
            <h3 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
              Hizmet Çevirisi
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {serviceTitle || "Seçili hizmet"} ve alt hizmetleri için İngilizce karşılıkları gir.
              Boş kalan alanlarda public tarafta Türkçe içerik görünmeye devam eder.
            </p>
          </div>
          <button
            type="button"
            onClick={saving ? undefined : onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200/70 text-lg text-slate-500 transition hover:border-slate-300 hover:text-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-white"
            aria-label="Kapat"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            {loading ? (
              <div className="grid gap-4 md:grid-cols-2">
                {Array.from({ length: 8 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-24 animate-pulse rounded-3xl bg-slate-100 dark:bg-slate-900"
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-8">
                {error ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
                    {error}
                  </div>
                ) : null}

                <section className="space-y-4 rounded-[28px] border border-slate-200/70 bg-slate-50/60 p-5 dark:border-slate-800 dark:bg-slate-900/45">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                      Ana Hizmet
                    </p>
                    <h4 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
                      Türkçe içerik ve İngilizce karşılığı
                    </h4>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-4 rounded-3xl border border-slate-200/70 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-900/60">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                        Türkçe
                      </p>
                      <input type="text" value={source.title} readOnly className={readonlyCls} />
                      <input type="text" value={source.type} readOnly className={readonlyCls} />
                      <input type="text" value={source.category} readOnly className={readonlyCls} />
                      <textarea value={toAreaString(source.usageAreas)} readOnly rows={3} className={`${readonlyCls} resize-none`} />
                      <textarea value={source.description} readOnly rows={8} className={`${readonlyCls} min-h-[180px] resize-y`} />
                    </div>

                    <div className="space-y-4 rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                        English
                      </p>
                      <input
                        type="text"
                        value={form.title}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, title: event.target.value }))
                        }
                        placeholder="English title"
                        className={inputCls}
                      />
                      <input
                        type="text"
                        value={form.type}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, type: event.target.value }))
                        }
                        placeholder="English type"
                        className={inputCls}
                      />
                      <input
                        type="text"
                        value={form.category}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, category: event.target.value }))
                        }
                        placeholder="English category"
                        className={inputCls}
                      />
                      <textarea
                        value={form.usageAreas}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, usageAreas: event.target.value }))
                        }
                        rows={3}
                        placeholder="terraces, roofs, foundations"
                        className={`${inputCls} resize-none`}
                      />
                      <textarea
                        value={form.description}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, description: event.target.value }))
                        }
                        rows={8}
                        placeholder="English description"
                        className={`${inputCls} min-h-[180px] resize-y`}
                      />
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                        Alt Hizmetler
                      </p>
                      <h4 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
                        Alt hizmet çevirileri
                      </h4>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-200">
                      {subServices.length} kayıt
                    </span>
                  </div>

                  {subServices.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-300">
                      Bu hizmet için alt hizmet bulunmuyor.
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {subServices.map((item, index) => (
                        <div
                          key={item.id || index}
                          className="rounded-[28px] border border-slate-200/70 bg-white/80 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/55"
                        >
                          <div className="mb-4 flex items-center justify-between gap-3">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                                Alt Hizmet {index + 1}
                              </p>
                              <h5 className="mt-1 text-base font-semibold text-slate-900 dark:text-white">
                                {item.source.title || `Alt hizmet ${index + 1}`}
                              </h5>
                            </div>
                            <span
                              className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                                item.hasEnglishTranslation
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200"
                              }`}
                            >
                              {item.hasEnglishTranslation ? "EN var" : "TR fallback"}
                            </span>
                          </div>

                          <div className="grid gap-4 xl:grid-cols-2">
                            <div className="space-y-4 rounded-3xl border border-slate-200/70 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-900/60">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                                Türkçe
                              </p>
                              <input type="text" value={item.source.title} readOnly className={readonlyCls} />
                              <input type="text" value={item.source.type} readOnly className={readonlyCls} />
                              <input type="text" value={item.source.category} readOnly className={readonlyCls} />
                              <textarea value={toAreaString(item.source.usageAreas)} readOnly rows={3} className={`${readonlyCls} resize-none`} />
                              <textarea value={item.source.description} readOnly rows={6} className={`${readonlyCls} min-h-[160px] resize-y`} />
                            </div>

                            <div className="space-y-4 rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                                English
                              </p>
                              <input
                                type="text"
                                value={item.form.title}
                                onChange={(event) =>
                                  updateSubServiceForm(item.id, "title", event.target.value)
                                }
                                placeholder="English title"
                                className={inputCls}
                              />
                              <input
                                type="text"
                                value={item.form.type}
                                onChange={(event) =>
                                  updateSubServiceForm(item.id, "type", event.target.value)
                                }
                                placeholder="English type"
                                className={inputCls}
                              />
                              <input
                                type="text"
                                value={item.form.category}
                                onChange={(event) =>
                                  updateSubServiceForm(item.id, "category", event.target.value)
                                }
                                placeholder="English category"
                                className={inputCls}
                              />
                              <textarea
                                value={item.form.usageAreas}
                                onChange={(event) =>
                                  updateSubServiceForm(item.id, "usageAreas", event.target.value)
                                }
                                rows={3}
                                placeholder="roofs, balconies, wet areas"
                                className={`${inputCls} resize-none`}
                              />
                              <textarea
                                value={item.form.description}
                                onChange={(event) =>
                                  updateSubServiceForm(item.id, "description", event.target.value)
                                }
                                rows={6}
                                placeholder="English description"
                                className={`${inputCls} min-h-[160px] resize-y`}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-200/70 px-6 py-4 dark:border-slate-800">
            <button
              type="button"
              onClick={saving ? undefined : onClose}
              className="btn-admin-ghost"
              disabled={saving}
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={loading || saving}
              className="btn-admin-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Kaydediliyor…" : "İngilizce çeviriyi kaydet"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

ServiceTranslationModal.propTypes = {
  open: PropTypes.bool.isRequired,
  serviceId: PropTypes.string,
  serviceTitle: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  onSaved: PropTypes.func,
};
