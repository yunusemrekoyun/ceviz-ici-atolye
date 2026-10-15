import { useEffect, useMemo, useState } from "react";
import { DecisionAPI } from "../../lib/api";
import { compressImageSmart } from "../../utils/compressImageSmart"; // <— YENİ

// basit slugify
function slugify(s) {
  return s
    .toString()
    .toLowerCase()
    .trim()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function AdminDecisionForm({ initial, onClose, onSaved }) {
  const isEdit = !!initial;

  const [title, setTitle] = useState(initial?.title || "");
  const [slug, setSlug] = useState(initial?.slug || "");
  const [caseNo, setCaseNo] = useState(initial?.caseNo || "");
  const [decisionNo, setDecisionNo] = useState(initial?.decisionNo || "");
  const [date, setDate] = useState(
    initial?.date ? new Date(initial.date).toISOString().slice(0, 10) : ""
  );
  const [chamber, setChamber] = useState(initial?.chamber || "");
  const [summary, setSummary] = useState(initial?.summary || "");
  const [content, setContent] = useState(initial?.content || "");
  const [imageFile, setImageFile] = useState(null);
  const [imageAlt, setImageAlt] = useState(initial?.imageAlt || "");
  const [keywords, setKeywords] = useState(
    (initial?.keywords || []).join(", ")
  );
  const [tags, setTags] = useState((initial?.tags || []).join(", "));
  const [status, setStatus] = useState(initial?.status || "published");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const existingImageUrl = initial?.image?.url || "";

  useEffect(() => {
    if (!isEdit) setSlug(slugify(title));
  }, [title, isEdit]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const [previewUrl, setPreviewUrl] = useState(existingImageUrl);
  useEffect(() => {
    if (!imageFile) {
      setPreviewUrl(existingImageUrl);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile, existingImageUrl]);

  const preview = useMemo(
    () => ({
      title: title || "Başlık",
      summary: summary || "Kısa özet metni burada görünecek.",
      imageUrl: previewUrl,
      imageAlt,
      tags: tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      date: date || new Date().toISOString().slice(0, 10),
    }),
    [title, summary, previewUrl, imageAlt, tags, date]
  );

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const data = {
        title,
        slug,
        caseNo,
        decisionNo,
        date: date ? new Date(date).toISOString() : "",
        chamber,
        summary,
        content,
        imageAlt,
        keywords, // csv → backend parçalayacak
        tags, // csv → backend parçalayacak
        status,
      };

      let fileToSend = imageFile || undefined;
      if (imageFile) {
        // 5MB altını garantiye almak için 3 denemelik akıllı sıkıştırma
        fileToSend = await compressImageSmart(imageFile, {
          maxW: 1600,
          maxH: 1600,
          initialQuality: 0.82,
          maxAttempts: 3,
          maxBytes: 4.8 * 1024 * 1024,
        });
      }

      if (isEdit) {
        await DecisionAPI.update(initial.slug, data, fileToSend);
      } else {
        await DecisionAPI.create(data, fileToSend);
      }

      onSaved?.();
    } catch (e) {
      setErr(e.message || "Kaydetme başarısız");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60]">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      <div
        className="
          absolute inset-x-0 top-[5vh] mx-auto
          w-[min(1100px,92vw)]
          rounded-[var(--radius-2xl)] border border-border/60
          bg-surface shadow-[var(--shadow-soft)]
          max-h-[90vh] overflow-hidden
        "
      >
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
          <div className="text-[15px] font-semibold">
            {isEdit ? "Kararı Düzenle" : "Yeni Karar"}
          </div>
          <button
            onClick={onClose}
            className="rounded-md border border-border/60 bg-surface-2 px-2.5 py-1 text-[12px] hover:bg-white/5"
          >
            Kapat
          </button>
        </div>

        <div className="grid max-h-[calc(90vh-46px)] grid-cols-1 overflow-y-auto md:grid-cols-2">
          {/* Form */}
          <form onSubmit={onSubmit} className="space-y-4 p-5">
            {err && (
              <div className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {err}
              </div>
            )}

            <Field label="Başlık">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="inp w-full"
              />
            </Field>

            <Field label="Slug">
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                required
                className="inp w-full"
              />
              {!isEdit && (
                <div className="mt-1 text-[12px] text-muted">
                  Başlıktan otomatik üretildi, dilersen düzenleyebilirsin.
                </div>
              )}
            </Field>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Esas No">
                <input
                  value={caseNo}
                  onChange={(e) => setCaseNo(e.target.value)}
                  className="inp w-full"
                />
              </Field>
              <Field label="Karar No">
                <input
                  value={decisionNo}
                  onChange={(e) => setDecisionNo(e.target.value)}
                  className="inp w-full"
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Tarih">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="inp w-full"
                />
              </Field>
              <Field label="Daire">
                <input
                  value={chamber}
                  onChange={(e) => setChamber(e.target.value)}
                  className="inp w-full"
                  placeholder="9. Hukuk Dairesi"
                />
              </Field>
            </div>

            <Field label="Özet">
              <textarea
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={3}
                className="inp w-full resize-y"
              />
            </Field>

            <Field label="İçerik (HTML/Markdown)">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={8}
                className="inp w-full resize-y"
              />
            </Field>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Görsel">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif" // <— HEIC/AVIF dışı
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  className="block w-full text-[13px] file:mr-3 file:rounded-md file:border file:border-border/60 file:bg-surface file:px-3 file:py-1.5 file:text-[13px] file:text-foreground hover:file:bg-surface-2"
                />
                {existingImageUrl && !imageFile && (
                  <div className="mt-1 text-[12px] text-muted">
                    Mevcut görsel korunacak. Yeni dosya seçerseniz
                    güncellenecek.
                  </div>
                )}
              </Field>

              <Field label="Görsel Alt Metni">
                <input
                  value={imageAlt}
                  onChange={(e) => setImageAlt(e.target.value)}
                  className="inp w-full"
                />
              </Field>
            </div>

            <Field label="Anahtar Kelimeler (virgülle)">
              <input
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                className="inp w-full"
                placeholder="iş akdi feshi, kıdem tazminatı"
              />
            </Field>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Etiketler (virgülle)">
                <input
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="inp w-full"
                  placeholder="Ceza Hukuku, İş Hukuku"
                />
              </Field>

              <Field label="Durum">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="inp w-full"
                >
                  <option value="published">published</option>
                  <option value="draft">draft</option>
                </select>
              </Field>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={busy}
                className="rounded-[var(--radius-lg)] px-4 py-2 text-[14px] font-semibold text-black shadow-[var(--shadow-soft)] ring-1 transition-opacity hover:opacity-95 disabled:opacity-60"
                style={{ backgroundImage: "var(--gradient-accent)" }}
              >
                {busy ? "Kaydediliyor…" : isEdit ? "Güncelle" : "Oluştur"}
              </button>
            </div>
          </form>

          {/* Önizleme */}
          <div className="border-t border-border/60 p-5 md:border-l md:border-t-0">
            <div className="text-[13px] text-muted">Önizleme</div>
            <div className="mt-3 overflow-hidden rounded-[var(--radius-2xl)] border border-border/60 bg-surface/80 shadow-[var(--shadow-soft)]">
              <div className="relative h-40 w-full overflow-hidden">
                {preview.imageUrl ? (
                  <img
                    src={preview.imageUrl}
                    alt={preview.imageAlt || preview.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="grid h-full place-items-center text-muted">
                    Görsel yok
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="line-clamp-2 text-[17px] font-semibold leading-[1.25]">
                  {preview.title}
                </h3>
                <p className="mt-1 line-clamp-2 text-[14px] text-[color:var(--color-muted)]">
                  {preview.summary}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-muted">
                  {preview.tags.slice(0, 4).map((t) => (
                    <span
                      key={t}
                      className="rounded border border-border/60 px-2 py-0.5"
                    >
                      {t}
                    </span>
                  ))}
                  <span className="ml-auto">{preview.date}</span>
                </div>
              </div>
            </div>
            <div className="mt-3 text-[12px] text-muted">
              Kaydedildikten sonra genel sitedeki görünüm değişebilir.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-[13px] text-foreground/80">{label}</div>
      {children}
    </label>
  );
}
