import { useEffect, useState } from "react";
import api from "../../../api";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import { LegalBody } from "../../components/legal/LegalDocumentView";

const DOCUMENTS = [
  {
    key: "pre-information",
    label: "Ön Bilgilendirme Formu",
    defaultTitle: "Ön Bilgilendirme Formu",
    hint: "Ödeme adımında, siparişin ürün, tutar ve adres bilgilerinin altında gösterilir. Müşteri ödemeden önce onaylar.",
    page: null,
  },
  {
    key: "distance-sales",
    label: "Mesafeli Satış Sözleşmesi",
    defaultTitle: "Mesafeli Satış Sözleşmesi",
    hint: "“Sözleşme” sayfasında gösterilir; müşteri ödemeden önce onaylar.",
    page: "/agreement",
  },
  {
    key: "kvkk",
    label: "KVKK Aydınlatma Metni",
    defaultTitle: "KVKK Aydınlatma Metni",
    hint: "“KVKK Aydınlatma Metni” sayfasında gösterilir.",
    page: "/kvkk",
  },
  {
    key: "cookies",
    label: "Çerez Politikası",
    defaultTitle: "Çerez Politikası",
    hint: "“Çerez Politikası” sayfasında gösterilir.",
    page: "/cookies",
  },
];

const fmtDate = (value) =>
  value ? new Date(value).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" }) : "-";

export default function LegalDocumentsPage() {
  const [data, setData] = useState(null);
  const [active, setActive] = useState(DOCUMENTS[0].key);
  const [drafts, setDrafts] = useState({});
  const [preview, setPreview] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    api
      .get("/legal/admin")
      .then(({ data: res }) => {
        if (!alive) return;
        setData(res.documents || {});
        // Taslak yoksa yayındaki metinle doldur; kullanıcının yazdığı taslak korunur.
        setDrafts((prev) => {
          const next = { ...prev };
          for (const doc of DOCUMENTS) {
            if (next[doc.key]) continue;
            const current = res.documents?.[doc.key]?.current;
            next[doc.key] = { title: current?.title || doc.defaultTitle, body: current?.body || "" };
          }
          return next;
        });
      })
      .catch(() => alive && setNotice({ type: "error", text: "Yasal metinler yüklenemedi. Sayfayı yenileyin." }));
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  const meta = DOCUMENTS.find((d) => d.key === active);
  const info = data?.[active];
  const current = info?.current;
  const draft = drafts[active] || { title: meta.defaultTitle, body: "" };
  const changed = !current || draft.title.trim() !== current.title || draft.body.trim() !== current.body;
  const setDraft = (patch) => setDrafts((prev) => ({ ...prev, [active]: { ...draft, ...patch } }));

  const openVersion = async (version) => {
    try {
      const { data: doc } = await api.get(`/legal/admin/${active}/${version}`);
      setViewing(doc);
    } catch {
      setNotice({ type: "error", text: "Bu sürüm açılamadı." });
    }
  };

  const publish = async () => {
    setSaving(true);
    setNotice(null);
    try {
      const { data: res } = await api.post(`/legal/admin/${active}`, { title: draft.title, body: draft.body });
      setNotice({ type: "success", text: `${meta.label} sürüm ${res.version} olarak yayınlandı.` });
      setConfirmOpen(false);
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[active];
        return next;
      });
      setReloadKey((k) => k + 1);
    } catch (err) {
      setNotice({ type: "error", text: err?.response?.data?.message || "Metin yayınlanamadı." });
      setConfirmOpen(false);
    } finally {
      setSaving(false);
    }
  };

  if (!data && !notice) return <div className="p-6 text-sm text-gray-600">Yükleniyor…</div>;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-gray-900">Yasal Metinler</h1>
        <p className="mt-1 text-sm text-gray-600">
          Metinler burada yayınlandığında sitede hemen görünür. Her yayın yeni bir sürüm olarak saklanır;
          siparişlerde müşterinin hangi sürümü onayladığı kayıtlıdır. Henüz yayın yapılmamış metin için
          sitedeki ilk metin gösterilir.
        </p>
      </header>

      {notice && (
        <div
          role="status"
          className={`rounded-lg px-4 py-3 text-sm ${
            notice.type === "error" ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"
          }`}
        >
          {notice.text}
        </div>
      )}

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Yasal metinler">
        {DOCUMENTS.map((doc) => (
          <button
            key={doc.key}
            type="button"
            role="tab"
            aria-selected={active === doc.key}
            onClick={() => {
              setActive(doc.key);
              setPreview(false);
              setViewing(null);
            }}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              active === doc.key ? "bg-gray-900 text-white" : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {doc.label}
          </button>
        ))}
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
        <div className="text-sm text-gray-700">
          <p>{meta.hint}</p>
          <p className="mt-1">
            {current ? (
              <>
                Yayında: <b>sürüm {current.version}</b> · {fmtDate(current.publishedAt)}
              </>
            ) : (
              <b>Henüz yayın yok; sitede ilk metin gösteriliyor.</b>
            )}
            {meta.page && (
              <>
                {" "}
                ·{" "}
                <a href={meta.page} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
                  Sitede gör
                </a>
              </>
            )}
          </p>
        </div>

        <div>
          <label htmlFor="legal-title" className="mb-1 block text-sm font-medium text-gray-800">
            Başlık
          </label>
          <input
            id="legal-title"
            value={draft.title}
            maxLength={200}
            onChange={(e) => setDraft({ title: e.target.value })}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
          />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between gap-3">
            <label htmlFor="legal-body" className="block text-sm font-medium text-gray-800">
              Metin
            </label>
            <button
              type="button"
              onClick={() => setPreview((v) => !v)}
              className="text-sm font-medium text-gray-700 underline underline-offset-2"
            >
              {preview ? "Düzenlemeye dön" : "Önizleme"}
            </button>
          </div>
          {preview ? (
            <div className="max-h-[32rem] overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-5">
              <h2 className="mb-4 text-2xl font-bold text-gray-900">{draft.title}</h2>
              <LegalBody body={draft.body} />
            </div>
          ) : (
            <textarea
              id="legal-body"
              value={draft.body}
              onChange={(e) => setDraft({ body: e.target.value })}
              rows={22}
              maxLength={200000}
              placeholder="Metni buraya yapıştırın."
              className="w-full rounded-lg border border-gray-200 px-3 py-2 font-mono text-sm leading-6 focus:border-gray-900 focus:outline-none"
            />
          )}
          <p className="mt-1 text-xs text-gray-500">
            Word veya PDF’ten kopyalayıp yapıştırabilirsiniz. Boş satır yeni paragraf başlatır; “# ” ile başlayan
            satır başlık olur. {draft.body.length.toLocaleString("tr-TR")} karakter.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={!changed || saving || draft.body.trim().length < 50 || draft.title.trim().length < 3}
            onClick={() => setConfirmOpen(true)}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Yeni sürüm olarak yayınla
          </button>
          {current && changed && (
            <button
              type="button"
              onClick={() => setDraft({ title: current.title, body: current.body })}
              className="text-sm font-medium text-gray-700 underline underline-offset-2"
            >
              Değişiklikleri geri al
            </button>
          )}
          {!changed && current && <span className="text-sm text-gray-500">Yayındaki metinle aynı.</span>}
        </div>
      </section>

      {info?.history?.length > 0 && (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-gray-900">Sürüm geçmişi</h2>
          <ul className="mt-3 divide-y divide-gray-100 text-sm">
            {info.history.map((h) => (
              <li key={h.version} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>
                  <b>Sürüm {h.version}</b> · {fmtDate(h.publishedAt)}
                  {h.publishedBy ? ` · ${h.publishedBy}` : ""}
                </span>
                <button
                  type="button"
                  onClick={() => openVersion(h.version)}
                  className="text-sm font-medium text-gray-700 underline underline-offset-2"
                >
                  Görüntüle
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {viewing && (
        <section className="rounded-2xl border border-gray-300 bg-gray-50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-gray-900">
              Sürüm {viewing.version} · {fmtDate(viewing.publishedAt)}
            </h2>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setDraft({ title: viewing.title, body: viewing.body });
                  setViewing(null);
                  setPreview(false);
                }}
                className="text-sm font-medium text-gray-700 underline underline-offset-2"
              >
                Düzenleme alanına al
              </button>
              <button
                type="button"
                onClick={() => setViewing(null)}
                className="text-sm font-medium text-gray-700 underline underline-offset-2"
              >
                Kapat
              </button>
            </div>
          </div>
          <div className="mt-4 max-h-[28rem] overflow-y-auto rounded-lg bg-white p-5">
            <h3 className="mb-4 text-xl font-bold text-gray-900">{viewing.title}</h3>
            <LegalBody body={viewing.body} />
          </div>
        </section>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title={`${meta.label}: yeni sürüm`}
        message="Metin hemen sitede görünür. Bundan sonraki siparişlerde müşteriler bu sürümü onaylar; eski sürümler saklanır."
        confirmLabel="Yayınla"
        loading={saving}
        onConfirm={publish}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
