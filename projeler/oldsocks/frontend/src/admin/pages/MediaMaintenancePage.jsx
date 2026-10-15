import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowPathIcon,
  ArrowUturnLeftIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  PhotoIcon,
  TrashIcon,
  VideoCameraIcon,
} from "@heroicons/react/24/outline";
import api from "../../../api";
import ToastAlert from "../../components/ui/ToastAlert";

const STATUS_LABELS = {
  reserved: "Ayrıldı",
  uploading: "Yükleniyor",
  uploaded: "Yüklendi",
  queued: "Sırada",
  processing: "İşleniyor",
  ready: "Hazır",
  failed: "Hatalı",
  quarantined: "Karantinada",
  missing: "Dosya eksik",
  deleting: "Siliniyor",
  trashed: "Çöp kutusunda",
  deleted: "Kalıcı silindi",
};

const STATUS_STYLES = {
  ready: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  processing: "bg-blue-50 text-blue-700 ring-blue-200",
  queued: "bg-blue-50 text-blue-700 ring-blue-200",
  uploading: "bg-blue-50 text-blue-700 ring-blue-200",
  failed: "bg-red-50 text-red-700 ring-red-200",
  quarantined: "bg-amber-50 text-amber-800 ring-amber-200",
  missing: "bg-red-50 text-red-700 ring-red-200",
  trashed: "bg-gray-100 text-gray-700 ring-gray-200",
  deleted: "bg-gray-100 text-gray-500 ring-gray-200",
};

function formatBytes(value) {
  const bytes = Number(value || 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const unit = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const amount = bytes / 1024 ** unit;
  return `${amount.toLocaleString("tr-TR", {
    maximumFractionDigits: unit > 1 ? 1 : 0,
  })} ${units[unit]}`;
}

function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function maintenanceError(error, fallback) {
  const payload = error?.response?.data;
  const message = payload?.message || fallback;
  return payload?.requestId ? `${message} (Destek kodu: ${payload.requestId})` : message;
}

function previewFor(asset) {
  const variants = asset?.variants || [];
  if (asset?.kind === "video") {
    return variants.find((variant) => variant.kind === "image")?.url || "";
  }
  return (
    variants.find((variant) => variant.name === "w320")?.url ||
    variants.find((variant) => variant.kind === "image")?.url ||
    ""
  );
}

function SummaryCard({ label, value, detail, tone = "plain" }) {
  const tones = {
    plain: "border-gray-200 bg-white",
    good: "border-emerald-200 bg-emerald-50/60",
    warning: "border-amber-200 bg-amber-50/70",
    danger: "border-red-200 bg-red-50/70",
  };
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${tones[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-gray-900">{value}</p>
      {detail && <p className="mt-1 text-xs text-gray-600">{detail}</p>}
    </div>
  );
}

function ConfirmDialog({ action, busy, onCancel, onConfirm }) {
  if (!action) return null;
  const permanent = action.type === "purge";
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex gap-3">
          <span className={`mt-0.5 rounded-full p-2 ${permanent ? "bg-red-50" : "bg-amber-50"}`}>
            <ExclamationTriangleIcon
              className={`h-6 w-6 ${permanent ? "text-red-600" : "text-amber-700"}`}
            />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {permanent ? "Kalıcı olarak silinsin mi?" : "Çöp kutusuna taşınsın mı?"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              {permanent
                ? "Bu işlem geri alınamaz. Dosyalar diskten kaldırılacak ve medya kaydı kapatılacak."
                : "İçerikte kullanılmayan medya çöp kutusuna taşınacak. Kalıcı silinene kadar geri alabilirsiniz."}
            </p>
            <p className="mt-3 break-all rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">
              {action.asset.original?.fileName || action.asset.id}
            </p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Vazgeç
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${
              permanent ? "bg-red-600 hover:bg-red-700" : "bg-amber-600 hover:bg-amber-700"
            }`}
          >
            {busy ? "İşleniyor…" : permanent ? "Kalıcı sil" : "Çöpe taşı"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MediaMaintenancePage() {
  const [summary, setSummary] = useState(null);
  const [assets, setAssets] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filters, setFilters] = useState({ kind: "", status: "", usage: "", search: "" });
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [action, setAction] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [reconciliation, setReconciliation] = useState(null);
  const [reconciling, setReconciling] = useState(false);
  const [toast, setToast] = useState(null);

  const loadSummary = useCallback(async () => {
    const response = await api.get("/media/maintenance/summary");
    setSummary(response.data);
  }, []);

  const loadAssets = useCallback(async (page = 1, nextFilters = filters) => {
    const params = { page, limit: 24 };
    if (nextFilters.kind) params.kind = nextFilters.kind;
    if (nextFilters.status) params.status = nextFilters.status;
    if (nextFilters.usage) params.usage = nextFilters.usage;
    if (nextFilters.search) params.search = nextFilters.search;
    const response = await api.get("/media/maintenance/assets", { params });
    setAssets(response.data.items || []);
    setPagination({
      page: response.data.page || 1,
      pages: response.data.pages || 1,
      total: response.data.total || 0,
    });
  }, [filters]);

  const loadAll = useCallback(async ({ quiet = false } = {}) => {
    quiet ? setRefreshing(true) : setLoading(true);
    try {
      await Promise.all([loadSummary(), loadAssets(1)]);
    } catch (error) {
      setToast({
        msg: maintenanceError(error, "Medya bakım bilgileri alınamadı."),
        type: "error",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadAssets, loadSummary]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const totals = useMemo(() => {
    return (summary?.assets || []).reduce(
      (result, row) => {
        if (row.status !== "deleted") {
          result[row.kind] = (result[row.kind] || 0) + Number(row.count || 0);
          result.bytes += Number(row.optimizedBytes || 0);
        }
        return result;
      },
      { image: 0, video: 0, bytes: 0 }
    );
  }, [summary]);

  const diskPercent = summary?.disk?.totalBytes
    ? Math.min(100, Math.round((summary.disk.usedBytes / summary.disk.totalBytes) * 100))
    : 0;
  const health = summary?.health?.level || "healthy";
  const healthLabel = {
    healthy: "Sağlıklı",
    warning: "Dikkat gerekli",
    blocked: "Yüklemeler durduruldu",
  }[health];

  const capabilityWarnings = useMemo(() => {
    if (!summary?.capabilities) return [];
    const checks = [
      ["ffmpeg", "FFmpeg bulunamadı; videolar işlenemez."],
      ["ffprobe", "FFprobe bulunamadı; video doğrulaması yapılamaz."],
      ["heic", "HEIC çözücü bulunamadı; iPhone fotoğrafları işlenemez."],
      ["hevcDecode", "HEVC çözücü bulunamadı; bazı iPhone videoları işlenemez."],
      ["h264Encode", "H.264 kodlayıcı bulunamadı; web video varyantları üretilemez."],
      ["aacEncode", "AAC kodlayıcı bulunamadı; video sesi dönüştürülemez."],
    ];
    return checks.filter(([key]) => !summary.capabilities[key]).map(([, message]) => message);
  }, [summary]);

  const applyFilters = async (event) => {
    event?.preventDefault();
    const next = { ...filters, search: searchInput.trim() };
    setFilters(next);
    setLoading(true);
    try {
      await loadAssets(1, next);
    } catch (error) {
      setToast({ msg: maintenanceError(error, "Medya listesi alınamadı."), type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const changeFilter = async (name, value) => {
    const next = { ...filters, [name]: value };
    setFilters(next);
    setLoading(true);
    try {
      await loadAssets(1, next);
    } catch (error) {
      setToast({ msg: maintenanceError(error, "Medya listesi alınamadı."), type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const changePage = async (page) => {
    setLoading(true);
    try {
      await loadAssets(page);
    } catch (error) {
      setToast({ msg: maintenanceError(error, "Medya listesi alınamadı."), type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const runConfirmedAction = async () => {
    if (!action) return;
    setActionBusy(true);
    try {
      if (action.type === "purge") {
        await api.delete(`/media/maintenance/assets/${action.asset.id}/purge`, {
          data: { confirmAssetId: action.asset.id },
        });
      } else {
        await api.delete(`/media/maintenance/assets/${action.asset.id}`);
      }
      setToast({
        msg:
          action.type === "purge"
            ? "Medya diskten kalıcı olarak silindi."
            : "Medya çöp kutusuna taşındı; gerekirse geri alabilirsiniz.",
        type: "success",
      });
      setAction(null);
      await Promise.all([loadSummary(), loadAssets(pagination.page)]);
    } catch (error) {
      setToast({ msg: maintenanceError(error, "Medya temizlenemedi."), type: "error" });
    } finally {
      setActionBusy(false);
    }
  };

  const restore = async (asset) => {
    setActionBusy(true);
    try {
      await api.post(`/media/maintenance/assets/${asset.id}/restore`);
      setToast({ msg: "Medya çöp kutusundan geri alındı.", type: "success" });
      await Promise.all([loadSummary(), loadAssets(pagination.page)]);
    } catch (error) {
      setToast({ msg: maintenanceError(error, "Medya geri alınamadı."), type: "error" });
    } finally {
      setActionBusy(false);
    }
  };

  const reconcile = async (repair = false) => {
    setReconciling(true);
    try {
      const response = repair
        ? await api.post("/media/maintenance/reconciliation", { repair: true })
        : await api.get("/media/maintenance/reconciliation");
      setReconciliation(response.data.report);
      setToast({
        msg: response.data.report.healthy
          ? "Dosyalar ile veritabanı birbiriyle uyumlu."
          : repair
            ? "Güvenli düzeltmeler uygulandı. Sahipsiz nihai dosyalar silinmeden bırakıldı."
            : `${response.data.report.issueCount} tutarsızlık bulundu. Ayrıntıları kontrol edin.`,
        type: response.data.report.healthy || repair ? "success" : "warning",
      });
      await Promise.all([loadSummary(), loadAssets(pagination.page)]);
    } catch (error) {
      setToast({
        msg: maintenanceError(error, "Dosya ve veritabanı kontrolü tamamlanamadı."),
        type: "error",
      });
    } finally {
      setReconciling(false);
    }
  };

  if (loading && !summary) {
    return <div className="py-20 text-center text-gray-500">Medya durumu okunuyor…</div>;
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Medya Bakımı</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-600">
            VPS diskini, işleme altyapısını ve görsel/video kayıtlarını tek yerden izleyin.
            Kullanılan medya yanlışlıkla silinmeye karşı korunur; temizlik önce çöp kutusuna yapılır.
          </p>
        </div>
        <button
          type="button"
          disabled={refreshing}
          onClick={() => loadAll({ quiet: true })}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
        >
          <ArrowPathIcon className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          Yenile
        </button>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-gray-600">Disk güvenliği</p>
            <div className="mt-1 flex items-center gap-2">
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
                  health === "healthy"
                    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                    : health === "warning"
                      ? "bg-amber-50 text-amber-800 ring-amber-200"
                      : "bg-red-50 text-red-700 ring-red-200"
                }`}
              >
                {healthLabel}
              </span>
              <span className="text-xs text-gray-500">Son kontrol: {formatDate(summary?.generatedAt)}</span>
            </div>
          </div>
          <span className="text-sm font-semibold text-gray-700">%{diskPercent} dolu</span>
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-gray-100">
          <div
            className={`h-full rounded-full transition-all ${
              health === "healthy" ? "bg-emerald-500" : health === "warning" ? "bg-amber-500" : "bg-red-600"
            }`}
            style={{ width: `${diskPercent}%` }}
          />
        </div>
        <div className="mt-3 grid gap-2 text-xs text-gray-600 sm:grid-cols-2 lg:grid-cols-4">
          <span>Kullanılan: <strong>{formatBytes(summary?.disk?.usedBytes)}</strong></span>
          <span>Boş: <strong>{formatBytes(summary?.disk?.availableBytes)}</strong></span>
          <span>Dokunulmaz rezerv: <strong>{formatBytes(summary?.disk?.baseReserveBytes)}</strong></span>
          <span>Yeni yüklemeye açık: <strong>{formatBytes(summary?.disk?.uploadableBytes)}</strong></span>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Görseller" value={totals.image.toLocaleString("tr-TR")} detail="Tüm durumlar" />
        <SummaryCard label="Videolar" value={totals.video.toLocaleString("tr-TR")} detail="Tüm durumlar" />
        <SummaryCard label="Optimize medya" value={formatBytes(totals.bytes)} detail="Üretilen varyantların toplamı" />
        <SummaryCard
          label="Devam eden yükleme"
          value={Number(summary?.inFlight?.sessions || 0).toLocaleString("tr-TR")}
          detail={`${formatBytes(summary?.inFlight?.reservationBytes)} alan ayrıldı`}
          tone={summary?.inFlight?.sessions ? "warning" : "good"}
        />
      </section>

      {capabilityWarnings.length > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex gap-3">
            <ExclamationTriangleIcon className="h-6 w-6 shrink-0 text-amber-700" />
            <div>
              <h2 className="font-semibold text-amber-900">Sunucu medya araçlarında eksik var</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-900">
                {capabilityWarnings.map((warning) => <li key={warning}>{warning}</li>)}
              </ul>
            </div>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <h2 className="font-semibold text-gray-900">Dosya–veritabanı tutarlılığı</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-600">
              Hazır medya dosyalarının diskte bulunduğunu, kullanım sayaçlarını, yarım
              yüklemeleri ve sahipsiz klasörleri karşılaştırır. Nihai medya klasörleri bu
              işlem tarafından otomatik silinmez.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              disabled={reconciling}
              onClick={() => reconcile(false)}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <ArrowPathIcon className={`h-4 w-4 ${reconciling ? "animate-spin" : ""}`} />
              Kontrol et
            </button>
            {reconciliation && !reconciliation.healthy && (
              <button
                type="button"
                disabled={reconciling}
                onClick={() => reconcile(true)}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Güvenli düzeltmeleri uygula
              </button>
            )}
          </div>
        </div>
        {reconciliation && (
          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {[
              ["Eksik hazır dosya", reconciliation.missingAssets?.count],
              ["Kullanım sayacı farkı", reconciliation.referenceCountDrift?.count],
              ["Geçersiz kullanım kaydı", reconciliation.danglingReferences?.count],
              ["Sahipsiz nihai klasör", reconciliation.orphanAssetDirectories?.count],
              ["Süresi dolmuş yükleme", reconciliation.expiredUploadSessions?.count],
              ["Sahipsiz yarım dosya", reconciliation.orphanStagingDirectories?.count],
            ].map(([label, count]) => (
              <div key={label} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
                <span className="text-gray-600">{label}</span>
                <strong className={Number(count) > 0 ? "text-amber-700" : "text-emerald-700"}>
                  {Number(count || 0).toLocaleString("tr-TR")}
                </strong>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-4 sm:p-5">
          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
            <div>
              <h2 className="font-semibold text-gray-900">Medya dosyaları</h2>
              <p className="mt-1 text-xs text-gray-500">{pagination.total.toLocaleString("tr-TR")} kayıt</p>
            </div>
            <form onSubmit={applyFilters} className="flex flex-col gap-2 sm:flex-row">
              <select
                value={filters.kind}
                onChange={(event) => changeFilter("kind", event.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
              >
                <option value="">Tüm türler</option>
                <option value="image">Görsel</option>
                <option value="video">Video</option>
              </select>
              <select
                value={filters.status}
                onChange={(event) => changeFilter("status", event.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
              >
                <option value="">Tüm durumlar</option>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <select
                value={filters.usage}
                onChange={(event) => changeFilter("usage", event.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700"
              >
                <option value="">Tüm kullanımlar</option>
                <option value="unreferenced">Kullanılmayanlar</option>
                <option value="referenced">İçerikte kullanılanlar</option>
              </select>
              <div className="flex min-w-0 sm:w-72">
                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Dosya adına göre ara"
                  className="min-w-0 flex-1 rounded-l-lg border border-r-0 border-gray-300 px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  aria-label="Ara"
                  className="rounded-r-lg border border-gray-300 bg-gray-50 px-3 text-gray-600 hover:bg-gray-100"
                >
                  <MagnifyingGlassIcon className="h-5 w-5" />
                </button>
              </div>
            </form>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-gray-500">Liste güncelleniyor…</div>
        ) : assets.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-500">Bu filtrelere uyan medya bulunamadı.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {assets.map((asset) => {
              const preview = previewFor(asset);
              const canTrash = !["trashed", "deleted", "processing", "uploading", "deleting"].includes(asset.status);
              return (
                <article key={asset.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-100">
                    {preview ? (
                      <img src={preview} alt="" loading="lazy" className="h-full w-full object-cover" />
                    ) : asset.kind === "video" ? (
                      <VideoCameraIcon className="h-8 w-8 text-gray-400" />
                    ) : (
                      <PhotoIcon className="h-8 w-8 text-gray-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="max-w-full truncate text-sm font-semibold text-gray-900">
                        {asset.original?.fileName || asset.id}
                      </p>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${STATUS_STYLES[asset.status] || "bg-gray-50 text-gray-700 ring-gray-200"}`}>
                        {STATUS_LABELS[asset.status] || asset.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {asset.kind === "image" ? "Görsel" : "Video"} · {formatBytes(asset.optimizedBytes)} optimize · {formatBytes(asset.original?.bytes)} kaynak
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {asset.referenceCount > 0
                        ? `${asset.referenceCount} içerikte kullanılıyor — silmeye karşı korumalı`
                        : "Herhangi bir içerikte kullanılmıyor"}
                      {` · ${formatDate(asset.createdAt)}`}
                    </p>
                    {asset.processing?.errorMessage && (
                      <p className="mt-2 text-xs font-medium text-red-700">{asset.processing.errorMessage}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {asset.status === "trashed" ? (
                      <>
                        <button
                          type="button"
                          disabled={actionBusy}
                          onClick={() => restore(asset)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                          <ArrowUturnLeftIcon className="h-4 w-4" /> Geri al
                        </button>
                        <button
                          type="button"
                          disabled={actionBusy}
                          onClick={() => setAction({ type: "purge", asset })}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                        >
                          <TrashIcon className="h-4 w-4" /> Kalıcı sil
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        disabled={!canTrash || asset.referenceCount > 0 || actionBusy}
                        title={asset.referenceCount > 0 ? "Bu medya bir içerikte kullanılıyor." : "Çöp kutusuna taşı"}
                        onClick={() => setAction({ type: "trash", asset })}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <TrashIcon className="h-4 w-4" /> Çöpe taşı
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {pagination.pages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-4 text-sm">
            <button
              type="button"
              disabled={pagination.page <= 1 || loading}
              onClick={() => changePage(pagination.page - 1)}
              className="rounded-lg border border-gray-300 px-3 py-2 font-medium text-gray-700 disabled:opacity-40"
            >
              Önceki
            </button>
            <span className="text-gray-500">Sayfa {pagination.page} / {pagination.pages}</span>
            <button
              type="button"
              disabled={pagination.page >= pagination.pages || loading}
              onClick={() => changePage(pagination.page + 1)}
              className="rounded-lg border border-gray-300 px-3 py-2 font-medium text-gray-700 disabled:opacity-40"
            >
              Sonraki
            </button>
          </div>
        )}
      </section>

      <ConfirmDialog
        action={action}
        busy={actionBusy}
        onCancel={() => !actionBusy && setAction(null)}
        onConfirm={runConfirmedAction}
      />
      {toast && (
        <ToastAlert msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}
