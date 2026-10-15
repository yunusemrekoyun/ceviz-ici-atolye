"use client";

import { useState, useCallback } from "react";
import { FileText, Star, Settings, Plus, Trash2, Eye, EyeOff, X, Save, Globe, Edit2, Images } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { ImageUploadInput } from "@/components/ui/ImageUploadInput";
import { formatDate } from "@/lib/utils";

// ---- Types ----
interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverUrl: string | null;
  authorName: string | null;
  tags: string[];
  isPublished: boolean;
  publishedAt: string | null;
  createdAt: string;
}

interface Testimonial {
  id: string;
  name: string;
  role: string | null;
  avatarUrl: string | null;
  content: string;
  rating: number;
  isVisible: boolean;
  order: number;
}

interface SiteSetting {
  key: string;
  value: string;
  type: string;
  group: string;
}

interface GalleryImage {
  id: string;
  url: string;
  caption: string | null;
  isVisible: boolean;
  order: number;
}

interface Props {
  initialPosts: BlogPost[];
  initialTestimonials: Testimonial[];
  initialSettings: SiteSetting[];
  initialGallery: GalleryImage[];
}

type Tab = "blog" | "testimonials" | "gallery" | "settings";

// ---- Site Settings definitions ----
const SETTING_GROUPS: { group: string; label: string; fields: { key: string; label: string; type?: string; placeholder?: string }[] }[] = [
  {
    group: "general",
    label: "Genel",
    fields: [
      { key: "general.siteName",   label: "Site Adı",  placeholder: "Baha Fitness" },
      { key: "general.tagline",    label: "Slogan",    placeholder: "Hayatını dönüştür" },
      { key: "general.logoUrl",    label: "Logo URL",  type: "url", placeholder: "https://..." },
    ],
  },
  {
    group: "seo",
    label: "SEO & Meta",
    fields: [
      { key: "seo.metaTitle",       label: "Meta Başlık",  placeholder: "Baha Fitness – Profesyonel Spor Merkezi" },
      { key: "seo.metaDescription", label: "Meta Açıklama", placeholder: "İstanbul'un en iyi spor merkezi..." },
      { key: "seo.ogImage",         label: "OG Görsel URL", type: "url" },
    ],
  },
  {
    group: "contact",
    label: "İletişim",
    fields: [
      { key: "contact.phone",   label: "Telefon",  placeholder: "+90 212 000 00 00" },
      { key: "contact.email",   label: "E-posta",  type: "email", placeholder: "info@bahafitness.com" },
      { key: "contact.address", label: "Adres",    placeholder: "Beşiktaş, İstanbul" },
      { key: "contact.mapUrl",  label: "Harita URL (Google Maps embed)", type: "url", placeholder: "https://www.google.com/maps/embed?..." },
      { key: "contact.hours",   label: "Çalışma Saatleri", placeholder: "Hafta içi 07:00–23:00, Hafta sonu 09:00–20:00" },
      { key: "contact.whatsapp", label: "WhatsApp Numarası", placeholder: "+905550000000" },
    ],
  },
  {
    group: "social",
    label: "Sosyal Medya",
    fields: [
      { key: "social.instagram", label: "Instagram", placeholder: "https://instagram.com/..." },
      { key: "social.facebook",  label: "Facebook",  placeholder: "https://facebook.com/..." },
      { key: "social.youtube",   label: "YouTube",   placeholder: "https://youtube.com/..." },
      { key: "social.twitter",   label: "X (Twitter)", placeholder: "https://x.com/..." },
    ],
  },
];

// ---- Blog empty form ----
const EMPTY_POST = { title: "", excerpt: "", content: "", coverUrl: "", authorName: "", tags: "", isPublished: false };
const EMPTY_TEST = { name: "", role: "", avatarUrl: "", content: "", rating: 5, isVisible: true };
const EMPTY_GALLERY = { url: "", caption: "", isVisible: true };

export function ContentClient({ initialPosts, initialTestimonials, initialSettings, initialGallery }: Props) {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("blog");

  // Blog state
  const [posts, setPosts] = useState<BlogPost[]>(initialPosts);
  const [postModal, setPostModal] = useState<"create" | "edit" | null>(null);
  const [editPost, setEditPost] = useState<BlogPost | null>(null);
  const [postForm, setPostForm] = useState(EMPTY_POST);
  const [savingPost, setSavingPost] = useState(false);

  // Testimonial state
  const [testimonials, setTestimonials] = useState<Testimonial[]>(initialTestimonials);
  const [testModal, setTestModal] = useState<"create" | "edit" | null>(null);
  const [editTest, setEditTest] = useState<Testimonial | null>(null);
  const [testForm, setTestForm] = useState(EMPTY_TEST);
  const [savingTest, setSavingTest] = useState(false);

  // Gallery state
  const [gallery, setGallery] = useState<GalleryImage[]>(initialGallery);
  const [galleryModal, setGalleryModal] = useState<"create" | "edit" | null>(null);
  const [editGallery, setEditGallery] = useState<GalleryImage | null>(null);
  const [galleryForm, setGalleryForm] = useState(EMPTY_GALLERY);
  const [savingGallery, setSavingGallery] = useState(false);

  // Settings state
  const settingMap = Object.fromEntries(initialSettings.map((s) => [s.key, s.value]));
  const [settingValues, setSettingValues] = useState<Record<string, string>>(settingMap);
  const [savingSettings, setSavingSettings] = useState(false);

  // ---- Blog handlers ----
  function openCreatePost() {
    setPostForm(EMPTY_POST);
    setEditPost(null);
    setPostModal("create");
  }
  function openEditPost(p: BlogPost) {
    setEditPost(p);
    setPostForm({ title: p.title, excerpt: p.excerpt ?? "", content: "", coverUrl: p.coverUrl ?? "", authorName: p.authorName ?? "", tags: p.tags.join(", "), isPublished: p.isPublished });
    setPostModal("edit");
  }

  async function handleSavePost(e: React.FormEvent) {
    e.preventDefault();
    setSavingPost(true);
    try {
      const payload = {
        title: postForm.title,
        excerpt: postForm.excerpt || null,
        content: postForm.content,
        coverUrl: postForm.coverUrl || null,
        authorName: postForm.authorName || null,
        tags: postForm.tags.split(",").map((t) => t.trim()).filter(Boolean),
        isPublished: postForm.isPublished,
      };

      if (postModal === "create") {
        const res = await fetch("/api/blog", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        setPosts((prev) => [json.post, ...prev]);
        toast({ type: "success", message: "Yazı oluşturuldu." });
      } else if (editPost) {
        const res = await fetch(`/api/blog/${editPost.slug}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        setPosts((prev) => prev.map((p) => p.id === editPost.id ? { ...p, ...json.post } : p));
        toast({ type: "success", message: "Yazı güncellendi." });
      }
      setPostModal(null);
    } catch (err: any) {
      toast({ type: "error", message: err.message || "Kaydedilemedi." });
    } finally {
      setSavingPost(false);
    }
  }

  async function togglePublish(post: BlogPost) {
    const res = await fetch(`/api/blog/${post.slug}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isPublished: !post.isPublished }) });
    const json = await res.json();
    if (res.ok) setPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, isPublished: json.post.isPublished } : p));
  }

  async function deletePost(post: BlogPost) {
    if (!confirm(`"${post.title}" silinsin mi?`)) return;
    await fetch(`/api/blog/${post.slug}`, { method: "DELETE" });
    setPosts((prev) => prev.filter((p) => p.id !== post.id));
    toast({ type: "success", message: "Yazı silindi." });
  }

  // ---- Testimonial handlers ----
  function openCreateTest() {
    setTestForm(EMPTY_TEST);
    setEditTest(null);
    setTestModal("create");
  }
  function openEditTest(t: Testimonial) {
    setEditTest(t);
    setTestForm({ name: t.name, role: t.role ?? "", avatarUrl: t.avatarUrl ?? "", content: t.content, rating: t.rating, isVisible: t.isVisible });
    setTestModal("edit");
  }

  async function handleSaveTest(e: React.FormEvent) {
    e.preventDefault();
    setSavingTest(true);
    try {
      const payload = { ...testForm, role: testForm.role || null, avatarUrl: testForm.avatarUrl || null };
      if (testModal === "create") {
        const res = await fetch("/api/testimonials", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        setTestimonials((prev) => [...prev, json.testimonial]);
        toast({ type: "success", message: "Yorum eklendi." });
      } else if (editTest) {
        const res = await fetch(`/api/testimonials/${editTest.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        setTestimonials((prev) => prev.map((t) => t.id === editTest.id ? { ...t, ...json.testimonial } : t));
        toast({ type: "success", message: "Yorum güncellendi." });
      }
      setTestModal(null);
    } catch (err: any) {
      toast({ type: "error", message: err.message || "Kaydedilemedi." });
    } finally {
      setSavingTest(false);
    }
  }

  async function toggleVisible(t: Testimonial) {
    const res = await fetch(`/api/testimonials/${t.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isVisible: !t.isVisible }) });
    if (res.ok) setTestimonials((prev) => prev.map((x) => x.id === t.id ? { ...x, isVisible: !x.isVisible } : x));
  }

  async function deleteTest(t: Testimonial) {
    if (!confirm(`"${t.name}" yorumu silinsin mi?`)) return;
    await fetch(`/api/testimonials/${t.id}`, { method: "DELETE" });
    setTestimonials((prev) => prev.filter((x) => x.id !== t.id));
    toast({ type: "success", message: "Yorum silindi." });
  }

  // ---- Gallery handlers ----
  function openCreateGallery() {
    setGalleryForm(EMPTY_GALLERY);
    setEditGallery(null);
    setGalleryModal("create");
  }
  function openEditGallery(g: GalleryImage) {
    setEditGallery(g);
    setGalleryForm({ url: g.url, caption: g.caption ?? "", isVisible: g.isVisible });
    setGalleryModal("edit");
  }

  async function handleSaveGallery(e: React.FormEvent) {
    e.preventDefault();
    setSavingGallery(true);
    try {
      const payload = { ...galleryForm, caption: galleryForm.caption || null };
      if (galleryModal === "create") {
        const res = await fetch("/api/gallery", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        setGallery((prev) => [...prev, json.image]);
        toast({ type: "success", message: "Görsel eklendi." });
      } else if (editGallery) {
        const res = await fetch(`/api/gallery/${editGallery.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        setGallery((prev) => prev.map((g) => g.id === editGallery.id ? { ...g, ...json.image } : g));
        toast({ type: "success", message: "Görsel güncellendi." });
      }
      setGalleryModal(null);
    } catch (err: any) {
      toast({ type: "error", message: err.message || "Kaydedilemedi." });
    } finally {
      setSavingGallery(false);
    }
  }

  async function toggleGalleryVisible(g: GalleryImage) {
    const res = await fetch(`/api/gallery/${g.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isVisible: !g.isVisible }) });
    if (res.ok) setGallery((prev) => prev.map((x) => x.id === g.id ? { ...x, isVisible: !x.isVisible } : x));
  }

  async function deleteGalleryImage(g: GalleryImage) {
    if (!confirm("Bu görsel silinsin mi?")) return;
    await fetch(`/api/gallery/${g.id}`, { method: "DELETE" });
    setGallery((prev) => prev.filter((x) => x.id !== g.id));
    toast({ type: "success", message: "Görsel silindi." });
  }

  // ---- Settings handlers ----
  const updateSetting = useCallback((key: string, val: string) => {
    setSettingValues((prev) => ({ ...prev, [key]: val }));
  }, []);

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const settings = Object.entries(settingValues).map(([key, value]) => {
        const group = key.split(".")[0] ?? "general";
        return { key, value, group, type: "text" };
      });
      const res = await fetch("/api/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ settings }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast({ type: "success", message: `${json.count} ayar kaydedildi.` });
    } catch (err: any) {
      toast({ type: "error", message: err.message || "Kaydedilemedi." });
    } finally {
      setSavingSettings(false);
    }
  }

  // ---- Render ----
  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "blog",         label: "Blog Yazıları",  icon: FileText },
    { key: "testimonials", label: "Yorumlar",        icon: Star },
    { key: "gallery",      label: "Galeri",          icon: Images },
    { key: "settings",     label: "Site Ayarları",   icon: Settings },
  ];

  return (
    <div className="space-y-5">
      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-subtle rounded-xl w-fit">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === key ? "bg-neon text-ink-950" : "text-body hover:text-white"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ---- BLOG TAB ---- */}
      {tab === "blog" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-body">{posts.length} yazı</div>
            <button onClick={openCreatePost} className="btn-primary btn-sm gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Yeni Yazı
            </button>
          </div>
          <div className="card-surface overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-subtle">
                <tr className="text-xs uppercase text-muted">
                  <th className="text-left px-4 py-3">Başlık</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Yazar</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Tarih</th>
                  <th className="text-center px-4 py-3">Durum</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {posts.length === 0 && (
                  <tr><td colSpan={5} className="py-12 text-center text-faint">Henüz yazı yok</td></tr>
                )}
                {posts.map((p) => (
                  <tr key={p.id} className="hover:bg-subtle">
                    <td className="px-4 py-3">
                      <div className="font-medium">{p.title}</div>
                      <div className="text-xs text-muted font-mono">/{p.slug}</div>
                    </td>
                    <td className="px-4 py-3 text-body hidden md:table-cell">{p.authorName || "—"}</td>
                    <td className="px-4 py-3 text-body hidden md:table-cell">{formatDate(p.createdAt)}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => togglePublish(p)} className={`badge ${p.isPublished ? "badge-success" : "badge-neutral"}`}>
                        {p.isPublished ? "Yayında" : "Taslak"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => openEditPost(p)} className="p-1.5 rounded-lg hover:bg-subtle text-muted hover:text-white"><Edit2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => deletePost(p)} className="p-1.5 rounded-lg hover:bg-rose-500/10 text-faint hover:text-rose-400"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---- TESTIMONIALS TAB ---- */}
      {tab === "testimonials" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-body">{testimonials.length} yorum</div>
            <button onClick={openCreateTest} className="btn-primary btn-sm gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Yorum Ekle
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {testimonials.length === 0 && (
              <div className="card-surface p-12 text-center text-faint col-span-2">Henüz yorum yok</div>
            )}
            {testimonials.map((t) => (
              <div key={t.id} className={`card-surface p-5 ${!t.isVisible ? "opacity-50" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {t.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={t.avatarUrl} alt={t.name} className="w-10 h-10 rounded-xl object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-neon/20 grid place-items-center text-neon font-bold text-sm">
                        {t.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-sm">{t.name}</div>
                      <div className="text-xs text-muted">{t.role || "Üye"}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => toggleVisible(t)} className="p-1.5 rounded-lg hover:bg-subtle text-faint hover:text-white">
                      {t.isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => openEditTest(t)} className="p-1.5 rounded-lg hover:bg-subtle text-muted hover:text-white"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => deleteTest(t)} className="p-1.5 rounded-lg hover:bg-rose-500/10 text-faint hover:text-rose-400"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                <div className="mt-3 flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`w-3.5 h-3.5 ${i < t.rating ? "text-neon fill-neon" : "text-white/20"}`} />
                  ))}
                </div>
                <p className="mt-2 text-sm text-dim line-clamp-3">{t.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---- GALLERY TAB ---- */}
      {tab === "gallery" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-body">{gallery.length} görsel</div>
            <button onClick={openCreateGallery} className="btn-primary btn-sm gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Görsel Ekle
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {gallery.length === 0 && (
              <div className="card-surface p-12 text-center text-faint col-span-full">Henüz görsel yok</div>
            )}
            {gallery.map((g) => (
              <div key={g.id} className={`card-surface overflow-hidden group relative ${!g.isVisible ? "opacity-50" : ""}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g.url} alt={g.caption ?? ""} className="w-full aspect-square object-cover" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button onClick={() => toggleGalleryVisible(g)} className="p-1.5 rounded-lg bg-white/15 text-white hover:bg-white/25">
                    {g.isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => openEditGallery(g)} className="p-1.5 rounded-lg bg-white/15 text-white hover:bg-white/25"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => deleteGalleryImage(g)} className="p-1.5 rounded-lg bg-rose-500/70 text-white hover:bg-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
                {g.caption && <div className="px-2.5 py-2 text-xs text-body truncate">{g.caption}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---- SETTINGS TAB ---- */}
      {tab === "settings" && (
        <form onSubmit={handleSaveSettings} className="space-y-4">
          {SETTING_GROUPS.map(({ group, label, fields }) => (
            <div key={group} className="card-surface p-6">
              <div className="flex items-center gap-2 mb-4">
                <Globe className="w-4 h-4 text-neon" />
                <div className="font-semibold">{label}</div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fields.map(({ key, label: fLabel, type = "text", placeholder }) => (
                  <div key={key}>
                    <label className="block text-xs text-body mb-1.5">{fLabel}</label>
                    {key === "contact.phone" ? (
                      <PhoneInput
                        className="input w-full"
                        value={settingValues[key] ?? ""}
                        onChange={(v) => updateSetting(key, v)}
                      />
                    ) : (
                      <input
                        type={type}
                        className="input w-full"
                        placeholder={placeholder}
                        value={settingValues[key] ?? ""}
                        onChange={(e) => updateSetting(key, e.target.value)}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="flex justify-end">
            <button type="submit" disabled={savingSettings} className="btn-primary btn-md gap-2">
              <Save className="w-4 h-4" />
              {savingSettings ? "Kaydediliyor…" : "Tümünü Kaydet"}
            </button>
          </div>
        </form>
      )}

      {/* ---- BLOG MODAL ---- */}
      {postModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setPostModal(null)} />
          <div className="relative w-full max-w-2xl card-surface rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold">{postModal === "create" ? "Yeni Yazı" : "Yazıyı Düzenle"}</h2>
              <button onClick={() => setPostModal(null)} className="p-1 rounded-lg hover:bg-subtle text-label"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSavePost} className="space-y-4">
              <div>
                <label className="block text-xs text-body mb-1.5">Başlık *</label>
                <input className="input w-full" value={postForm.title} onChange={(e) => setPostForm((f) => ({ ...f, title: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-xs text-body mb-1.5">Özet</label>
                <input className="input w-full" placeholder="Kısa açıklama..." value={postForm.excerpt} onChange={(e) => setPostForm((f) => ({ ...f, excerpt: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs text-body mb-1.5">İçerik *</label>
                <textarea rows={8} className="input w-full resize-none font-mono text-xs" value={postForm.content} onChange={(e) => setPostForm((f) => ({ ...f, content: e.target.value }))} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-body mb-1.5">Kapak Görseli</label>
                  <ImageUploadInput
                    value={postForm.coverUrl}
                    onChange={(url) => setPostForm((f) => ({ ...f, coverUrl: url }))}
                    folder="blog"
                    aspectClass="aspect-video"
                  />
                </div>
                <div>
                  <label className="block text-xs text-body mb-1.5">Yazar</label>
                  <input className="input w-full" value={postForm.authorName} onChange={(e) => setPostForm((f) => ({ ...f, authorName: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-xs text-body mb-1.5">Etiketler (virgülle ayır)</label>
                <input className="input w-full" placeholder="fitness, sağlık, beslenme" value={postForm.tags} onChange={(e) => setPostForm((f) => ({ ...f, tags: e.target.value }))} />
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" className="accent-neon" checked={postForm.isPublished} onChange={(e) => setPostForm((f) => ({ ...f, isPublished: e.target.checked }))} />
                Hemen yayınla
              </label>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setPostModal(null)} className="btn-secondary btn-md flex-1">İptal</button>
                <button type="submit" disabled={savingPost} className="btn-primary btn-md flex-1">{savingPost ? "Kaydediliyor…" : "Kaydet"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---- TESTIMONIAL MODAL ---- */}
      {testModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setTestModal(null)} />
          <div className="relative w-full max-w-lg card-surface rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold">{testModal === "create" ? "Yorum Ekle" : "Yorumu Düzenle"}</h2>
              <button onClick={() => setTestModal(null)} className="p-1 rounded-lg hover:bg-subtle text-label"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveTest} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-body mb-1.5">Ad Soyad *</label>
                  <input className="input w-full" value={testForm.name} onChange={(e) => setTestForm((f) => ({ ...f, name: e.target.value }))} required />
                </div>
                <div>
                  <label className="block text-xs text-body mb-1.5">Unvan/Rol</label>
                  <input className="input w-full" placeholder="Üye, Sporcu…" value={testForm.role} onChange={(e) => setTestForm((f) => ({ ...f, role: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-xs text-body mb-1.5">Avatar Fotoğrafı</label>
                <ImageUploadInput
                  value={testForm.avatarUrl}
                  onChange={(url) => setTestForm((f) => ({ ...f, avatarUrl: url }))}
                  folder="testimonials"
                  aspectClass="aspect-square"
                />
              </div>
              <div>
                <label className="block text-xs text-body mb-1.5">Yorum *</label>
                <textarea rows={4} className="input w-full resize-none" value={testForm.content} onChange={(e) => setTestForm((f) => ({ ...f, content: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-xs text-body mb-1.5">Puan</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button type="button" key={n} onClick={() => setTestForm((f) => ({ ...f, rating: n }))}>
                      <Star className={`w-6 h-6 transition-colors ${n <= testForm.rating ? "text-neon fill-neon" : "text-white/20 hover:text-muted"}`} />
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" className="accent-neon" checked={testForm.isVisible} onChange={(e) => setTestForm((f) => ({ ...f, isVisible: e.target.checked }))} />
                Landing sayfasında göster
              </label>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setTestModal(null)} className="btn-secondary btn-md flex-1">İptal</button>
                <button type="submit" disabled={savingTest} className="btn-primary btn-md flex-1">{savingTest ? "Kaydediliyor…" : "Kaydet"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---- GALLERY MODAL ---- */}
      {galleryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setGalleryModal(null)} />
          <div className="relative w-full max-w-lg card-surface rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold">{galleryModal === "create" ? "Görsel Ekle" : "Görseli Düzenle"}</h2>
              <button onClick={() => setGalleryModal(null)} className="p-1 rounded-lg hover:bg-subtle text-label"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveGallery} className="space-y-4">
              <div>
                <label className="block text-xs text-body mb-1.5">Görsel *</label>
                <ImageUploadInput
                  value={galleryForm.url}
                  onChange={(url) => setGalleryForm((f) => ({ ...f, url }))}
                  folder="gallery"
                  aspectClass="aspect-square"
                />
              </div>
              <div>
                <label className="block text-xs text-body mb-1.5">Açıklama</label>
                <input className="input w-full" placeholder="Örn. Kardiyo alanı" value={galleryForm.caption} onChange={(e) => setGalleryForm((f) => ({ ...f, caption: e.target.value }))} />
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" className="accent-neon" checked={galleryForm.isVisible} onChange={(e) => setGalleryForm((f) => ({ ...f, isVisible: e.target.checked }))} />
                Landing sayfasında göster
              </label>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setGalleryModal(null)} className="btn-secondary btn-md flex-1">İptal</button>
                <button type="submit" disabled={savingGallery || !galleryForm.url} className="btn-primary btn-md flex-1">{savingGallery ? "Kaydediliyor…" : "Kaydet"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
