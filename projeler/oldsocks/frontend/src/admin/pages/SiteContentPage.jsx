import { useEffect, useRef, useState } from "react";
import api from "../../../api";
import { mediaErrorMessage, uploadMediaFile } from "../../services/mediaUpload";
import defaultLogo from "../../assets/logo/logo.webp";
import defaultVision from "../../assets/about/vision.webp";
import defaultMission from "../../assets/about/mission.webp";
import HeaderBrand from "../../components/layout/HeaderBrand";
import { BRAND_FONTS } from "../../utils/brandFonts";
import { getResponsiveImageProps } from "../../utils/media";

const BRAND_MODES = [
  ["both", "Logo ve yazı"],
  ["text", "Yalnız yazı"],
  ["logo", "Yalnız logo"],
];
const BRAND_STYLES = [
  ["chrome", "Krom (gümüş)"],
  ["dark", "Koyu"],
];

function Choice({ active, onClick, children, style }) {
  return <button type="button" onClick={onClick} aria-pressed={active} style={style} className={`rounded-lg border px-3 py-2 text-sm transition ${active ? "border-gray-900 bg-gray-900 text-white" : "border-gray-300 bg-white text-gray-800 hover:border-gray-500"}`}>{children}</button>;
}

function ImageEditor({ label, current, fallback, file, onFile, onReset, hint }) {
  const [preview, setPreview] = useState("");
  const fileInputRef = useRef(null);
  const clearFileInput = () => { if (fileInputRef.current) fileInputRef.current.value = ""; };
  useEffect(() => {
    if (!file) { setPreview(""); return undefined; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
    <p className="text-sm font-semibold text-gray-900">{label}</p>
    <p className="mt-1 text-xs leading-5 text-gray-600">{hint}</p>
    <div className="mt-3 flex flex-wrap items-center gap-4">
      <div className="flex h-28 w-36 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-white p-2">
        <img src={preview || current?.url || fallback} onError={(event) => { if (!event.currentTarget.src.endsWith(fallback)) event.currentTarget.src = fallback; }} alt={`${label} önizlemesi`} className="max-h-full max-w-full object-contain" />
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <label className="block text-sm font-medium text-gray-800">Yeni görsel seç
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" onChange={(event) => onFile(event.target.files?.[0] || null)} className="mt-2 block w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border file:border-gray-300 file:bg-white file:px-3 file:py-2 file:text-xs file:font-medium" />
        </label>
        {file && <p className="truncate text-xs text-gray-600">Seçilen: {file.name}</p>}
        {file && <button type="button" onClick={() => { clearFileInput(); onFile(null); }} className="mr-4 text-xs font-medium text-gray-700 underline underline-offset-2 hover:text-gray-900">Seçimi iptal et</button>}
        {current && <button type="button" onClick={() => { clearFileInput(); onReset(); }} className="text-xs font-medium text-gray-700 underline underline-offset-2 hover:text-gray-900">Varsayılan görsele dön</button>}
      </div>
    </div>
  </div>;
}

function HeaderBrandEditor({ draft, setDraft, logoFile }) {
  const header = draft.header || { mode: "both", text: "OLDSOCKS", font: "pirata", style: "chrome" };
  const set = (patch) => setDraft((current) => ({ ...current, header: { ...header, ...patch } }));
  const [filePreview, setFilePreview] = useState("");
  useEffect(() => {
    if (!logoFile) { setFilePreview(""); return undefined; }
    const url = URL.createObjectURL(logoFile);
    setFilePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [logoFile]);
  const logoProps = filePreview ? { src: filePreview } : getResponsiveImageProps(draft.logo || defaultLogo, { widths: [256], defaultWidth: 256, sizes: "56px" });
  return <section className="space-y-5 rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
    <div>
      <h2 className="text-lg font-semibold text-gray-900">Header markası</h2>
      <p className="mt-1 text-sm text-gray-600">Sitenin üst menüsünün ortasında görünür. Logo, yazı ya da ikisi birlikte gösterilebilir.</p>
    </div>
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-800">Gösterim</p>
      <div className="flex flex-wrap gap-2">{BRAND_MODES.map(([key, label]) => <Choice key={key} active={header.mode === key} onClick={() => set({ mode: key })}>{label}</Choice>)}</div>
    </div>
    {header.mode !== "logo" && <>
      <label className="block text-sm font-medium text-gray-800">Yazı
        <input value={header.text} maxLength={30} onChange={(event) => set({ text: event.target.value })} className="mt-2 w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2.5 text-base outline-none focus:border-gray-900" />
      </label>
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-800">Yazı tipi</p>
        <div className="flex flex-wrap gap-2">{Object.entries(BRAND_FONTS).map(([key, font]) => <Choice key={key} active={header.font === key} onClick={() => set({ font: key })} style={{ ...font.style, fontSize: 20 }}>{header.text.trim() || "OLDSOCKS"}</Choice>)}</div>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-800">Görünüm</p>
        <div className="flex flex-wrap gap-2">{BRAND_STYLES.map(([key, label]) => <Choice key={key} active={header.style === key} onClick={() => set({ style: key })}>{label}</Choice>)}</div>
      </div>
    </>}
    <div>
      <p className="text-sm font-medium text-gray-800">Önizleme</p>
      <div className="mt-2 flex h-20 items-center justify-center rounded-lg border border-gray-200 bg-[#F3F3F3]">
        <HeaderBrand header={{ ...header, text: header.text.trim() || "OLDSOCKS" }} logoProps={logoProps} />
      </div>
    </div>
  </section>;
}

export default function SiteContentPage() {
  const [draft, setDraft] = useState(null);
  const [files, setFiles] = useState({ logo: null, vision: null, mission: null });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState("");
  const [notice, setNotice] = useState(null);
  const [savedRevision, setSavedRevision] = useState(0);

  useEffect(() => {
    let active = true;
    api.get("/site-content/admin")
      .then(({ data }) => { if (active) setDraft(data); })
      .catch(() => { if (active) setNotice({ type: "error", text: "Site içeriği yüklenemedi. Sayfayı yenileyin." }); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const setBlock = (key, patch) => setDraft((current) => ({
    ...current,
    about: { ...current.about, [key]: { ...current.about[key], ...patch } },
  }));
  const resetImage = (key) => {
    setFiles((current) => ({ ...current, [key]: null }));
    if (key === "logo") setDraft((current) => ({ ...current, logoAssetId: null, logo: null }));
    else setBlock(key, { imageAssetId: null, image: null });
  };

  const save = async (event) => {
    event.preventDefault();
    for (const key of ["vision", "mission", "history"]) {
      if (!draft.about[key].heading.trim() || !draft.about[key].body.trim()) {
        setNotice({ type: "error", text: "Hakkımızda başlıkları ve metinleri boş bırakılamaz." });
        return;
      }
    }
    setSaving(true);
    setNotice(null);
    try {
      const payload = {
        logoAssetId: draft.logoAssetId,
        header: draft.header,
        footer: draft.footer,
        contact: draft.contact,
        about: {
          vision: { ...draft.about.vision },
          mission: { ...draft.about.mission },
          history: { ...draft.about.history },
        },
      };
      for (const [key, purpose] of [["logo", "site_logo"], ["vision", "about_image"], ["mission", "about_image"]]) {
        if (!files[key]) continue;
        setProgress(`${key === "logo" ? "Logo" : key === "vision" ? "Vizyon" : "Misyon"} görseli yükleniyor…`);
        const asset = await uploadMediaFile(files[key], purpose);
        if (key === "logo") payload.logoAssetId = asset.id;
        else payload.about[key].imageAssetId = asset.id;
      }
      setProgress("İçerik kaydediliyor…");
      const { data } = await api.put("/site-content/admin", payload);
      setDraft(data);
      setFiles({ logo: null, vision: null, mission: null });
      setSavedRevision((revision) => revision + 1);
      setNotice({ type: "success", text: "Site içeriği kaydedildi. Yeni ziyaretçiler güncel içeriği görecek." });
    } catch (error) {
      setNotice({ type: "error", text: mediaErrorMessage(error, error.response?.data?.message || "İçerik kaydedilemedi.") });
    } finally {
      setProgress("");
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 text-gray-600">Site içeriği yükleniyor…</div>;
  if (!draft) return <div className="p-6 text-red-700">{notice?.text || "Site içeriği açılamadı."}</div>;

  return <form onSubmit={save} className="mx-auto max-w-4xl space-y-7 p-4 pb-24 sm:p-6">
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Site İçeriği</h1>
      <p className="mt-2 text-sm leading-6 text-gray-600">Logo ve Hakkımızda sayfasını buradan düzenleyin. Görseller ve metinler kaydedilene kadar sitede değişmez.</p>
    </div>

    <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Marka logosu</h2>
        <p className="mt-1 text-sm text-gray-600">Üst menünün masaüstü ve mobil görünümünde kullanılır.</p>
      </div>
      <ImageEditor key={`logo-${savedRevision}`} label="Site logosu" current={draft.logo} fallback={defaultLogo} file={files.logo} onFile={(file) => setFiles((current) => ({ ...current, logo: file }))} onReset={() => resetImage("logo")} hint="Şeffaf arka planlı PNG veya WebP en iyi sonucu verir." />
    </section>

    <HeaderBrandEditor draft={draft} setDraft={setDraft} logoFile={files.logo} />

    <section className="space-y-6 rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Hakkımızda</h2>
        <p className="mt-1 text-sm text-gray-600">Başlık ve metinleri düzenleyin; görseller için mevcut fotoğrafı koruyabilir veya yenisini yükleyebilirsiniz.</p>
      </div>
      {[["vision", "Vizyon", defaultVision], ["mission", "Misyon", defaultMission], ["history", "Tarihçe", null]].map(([key, label, fallback]) => <div key={key} className="space-y-4 border-t border-gray-200 pt-6 first:border-t-0 first:pt-0">
        <h3 className="font-semibold text-gray-900">{label}</h3>
        <label className="block text-sm font-medium text-gray-800">Başlık
          <input value={draft.about[key].heading} maxLength={100} onChange={(event) => setBlock(key, { heading: event.target.value })} className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base outline-none focus:border-gray-900" />
        </label>
        <label className="block text-sm font-medium text-gray-800">Metin
          <textarea value={draft.about[key].body} maxLength={5000} rows={key === "history" ? 8 : 5} onChange={(event) => setBlock(key, { body: event.target.value })} className="mt-2 w-full resize-y rounded-lg border border-gray-300 px-3 py-2.5 text-base leading-6 outline-none focus:border-gray-900" />
        </label>
        {fallback && <ImageEditor key={`${key}-${savedRevision}`} label={`${label} görseli`} current={draft.about[key].image} fallback={fallback} file={files[key]} onFile={(file) => setFiles((current) => ({ ...current, [key]: file }))} onReset={() => resetImage(key)} hint="Hakkımızda sayfasındaki geniş fotoğraf; yatay görsel önerilir." />}
      </div>)}
    </section>

    <section className="space-y-5 rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Alt bölüm ve iletişim</h2>
        <p className="mt-1 text-sm text-gray-600">Telefon ve e-posta, alt bölümde ve iletişim sayfasında birlikte güncellenir. Harita adresi ayrı tutulur.</p>
      </div>
      <label className="block text-sm font-medium text-gray-800">Marka tanıtımı
        <textarea value={draft.footer.description} maxLength={1000} rows={3} onChange={(event) => setDraft((current) => ({ ...current, footer: { ...current.footer, description: event.target.value } }))} className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base outline-none focus:border-gray-900" />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        {[["phone", "Telefon", 50], ["email", "E-posta", 160], ["hours", "Çalışma saatleri", 160]].map(([field, label, maxLength]) => <label key={field} className="block text-sm font-medium text-gray-800">{label}
          <input type={field === "email" ? "email" : "text"} value={draft.contact[field]} maxLength={maxLength} onChange={(event) => setDraft((current) => ({ ...current, contact: { ...current.contact, [field]: event.target.value } }))} className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base outline-none focus:border-gray-900" />
        </label>)}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-gray-800">Alt bölüm adresi
          <input value={draft.footer.address} maxLength={300} onChange={(event) => setDraft((current) => ({ ...current, footer: { ...current.footer, address: event.target.value } }))} className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base outline-none focus:border-gray-900" />
        </label>
        <label className="block text-sm font-medium text-gray-800">İletişim ve harita adresi
          <input value={draft.contact.address} maxLength={300} onChange={(event) => setDraft((current) => ({ ...current, contact: { ...current.contact, address: event.target.value } }))} className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base outline-none focus:border-gray-900" />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {[["facebookUrl", "Facebook HTTPS adresi"], ["instagramUrl", "Instagram HTTPS adresi"]].map(([field, label]) => <label key={field} className="block text-sm font-medium text-gray-800">{label}
          <input type="url" value={draft.footer[field]} maxLength={300} onChange={(event) => setDraft((current) => ({ ...current, footer: { ...current.footer, [field]: event.target.value } }))} className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-base outline-none focus:border-gray-900" />
        </label>)}
      </div>
    </section>

    <div className="flex flex-wrap items-center justify-between gap-4">
      <div aria-live="polite" className="min-w-0 flex-1">
        {progress && <p className="text-sm text-gray-600">{progress}</p>}
        {notice && <p role={notice.type === "error" ? "alert" : "status"} className={`text-sm ${notice.type === "error" ? "text-red-700" : "text-emerald-700"}`}>{notice.text}</p>}
      </div>
      <button type="submit" disabled={saving} className="rounded-lg bg-gray-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:opacity-60">{saving ? "Kaydediliyor…" : "Değişiklikleri Kaydet"}</button>
    </div>
  </form>;
}
