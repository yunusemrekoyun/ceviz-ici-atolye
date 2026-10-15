import { createPortal } from "react-dom";
import PropTypes from "prop-types";
import { useEffect, useMemo, useState } from "react";
import api from "../../api";
import RichContentField from "./RichContentField";
import RichContentRenderer from "../../components/RichContent/RichContentRenderer";
import { toEditableRichContent } from "../../utils/richContent";
import { getAdminFeedbackMessage } from "../utils/mediaFeedback";

const inputCls =
  "w-full rounded-xl border border-slate-200/70 bg-white/70 px-3 py-2.5 text-sm text-slate-800 shadow-sm outline-none transition focus:border-indigo-200 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-950/55 dark:text-slate-100 dark:focus:border-indigo-500/50 dark:focus:ring-indigo-500/30";

const readonlyCls = `${inputCls} cursor-default bg-slate-50/90 text-slate-500 dark:bg-slate-900/70 dark:text-slate-300`;

const toTagString = (value) =>
  Array.isArray(value) ? value.filter(Boolean).join(", ") : "";

export default function BlogTranslationModal({
  open,
  blogId,
  blogTitle,
  onClose,
  onSaved,
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState("");
  const [source, setSource] = useState({ title: "", content: "", tags: [] });
  const [form, setForm] = useState({ title: "", content: "", tags: "" });

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
    if (!open || !blogId) return;

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError("");
        const { data } = await api.get(`/blogs/${blogId}/translations`);
        if (cancelled) return;

        setSource({
          title: data?.source?.title || "",
          content: toEditableRichContent(data?.source?.content || ""),
          tags: data?.source?.tags || [],
        });
        setForm({
          title: data?.translations?.en?.title || "",
          content: toEditableRichContent(data?.translations?.en?.content || ""),
          tags: toTagString(data?.translations?.en?.tags),
        });
      } catch (fetchError) {
        if (cancelled) return;
        setError(
          getAdminFeedbackMessage(
            fetchError,
            "Blog çevirisi bilgileri alınamadı."
          )
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [blogId, open]);

  const previewContent = useMemo(
    () => form.content || source.content || "",
    [form.content, source.content]
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!blogId || saving) return;

    try {
      setSaving(true);
      setError("");

      const { data } = await api.put(`/blogs/${blogId}/translations`, {
        title: form.title.trim(),
        content: form.content,
        tags: form.tags.trim(),
      });

      onSaved?.(data);
      onClose?.();
    } catch (saveError) {
      setError(
        getAdminFeedbackMessage(
          saveError,
          "Blog çevirisi kaydedilemedi."
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

      <div className="relative z-10 flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[32px] border border-white/20 bg-white shadow-2xl dark:bg-slate-950">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200/70 px-6 py-5 dark:border-slate-800">
          <div>
            <span className="badge-soft">İngilizce</span>
            <h3 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
              Blog Çevirisi
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {blogTitle || "Seçili blog"} için İngilizce karşılıkları gir.
              Boş bıraktığın alanlarda public tarafta Türkçe içerik gösterilmeye devam eder.
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
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-28 animate-pulse rounded-3xl bg-slate-100 dark:bg-slate-900"
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {error ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
                    {error}
                  </div>
                ) : null}

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-3xl border border-slate-200/70 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-900/60">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                      Türkçe Başlık
                    </p>
                    <input
                      type="text"
                      value={source.title}
                      readOnly
                      className={`${readonlyCls} mt-3`}
                    />
                  </div>

                  <div className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                      English Title
                    </p>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, title: event.target.value }))
                      }
                      placeholder="Enter the English title"
                      className={`${inputCls} mt-3`}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-3xl border border-slate-200/70 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-900/60">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                      Türkçe Etiketler
                    </p>
                    <textarea
                      value={toTagString(source.tags)}
                      readOnly
                      rows={3}
                      className={`${readonlyCls} mt-3 resize-none`}
                    />
                  </div>

                  <div className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                      English Tags
                    </p>
                    <textarea
                      value={form.tags}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, tags: event.target.value }))
                      }
                      rows={3}
                      placeholder="waterproofing, roof, insulation"
                      className={`${inputCls} mt-3 resize-none`}
                    />
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                      Virgülle ayır. Boş bırakırsan sistem içerikten İngilizce etiket üretmeyi dener.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  <div className="rounded-3xl border border-slate-200/70 bg-slate-50/80 p-5 dark:border-slate-800 dark:bg-slate-900/60">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                      Türkçe İçerik
                    </p>
                    <textarea
                      value={source.content}
                      readOnly
                      rows={18}
                      className={`${readonlyCls} mt-3 min-h-[360px] resize-y`}
                    />
                  </div>

                  <div className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
                    <RichContentField
                      label="English Content"
                      value={form.content}
                      onChange={(nextValue) =>
                        setForm((prev) => ({ ...prev, content: nextValue }))
                      }
                      placeholder="Write the English content..."
                      inputClassName={`${inputCls} min-h-[360px]`}
                      rows={18}
                      onTogglePreview={() => setShowPreview((prev) => !prev)}
                      showPreview={showPreview}
                    />

                    {showPreview ? (
                      <div className="mt-4 rounded-3xl border border-slate-200/70 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-900/60">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                          Önizleme
                        </p>
                        <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-950/80">
                          <RichContentRenderer
                            content={previewContent}
                            className="prose prose-sm max-w-none prose-slate dark:prose-invert"
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
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

BlogTranslationModal.propTypes = {
  open: PropTypes.bool.isRequired,
  blogId: PropTypes.string,
  blogTitle: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  onSaved: PropTypes.func,
};
