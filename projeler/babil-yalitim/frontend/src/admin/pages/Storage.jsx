import { useCallback, useEffect, useState } from "react";
import PropTypes from "prop-types";
import {
  Archive,
  Cpu,
  FileWarning,
  HardDrive,
  MemoryStick,
  RefreshCw,
  Trash2,
} from "lucide-react";
import api from "../../api";
import AdminLoadingState from "../components/AdminLoadingState";
import LoadErrorState from "../components/LoadErrorState";
import ToastAlert from "../components/ToastAlert";
import ConfirmDialog from "../components/ConfirmDialog";

const fmt = (bytes) => {
  const value = Number(bytes || 0);
  if (value >= 1073741824) return `${(value / 1073741824).toFixed(2)} GB`;
  if (value >= 1048576) return `${(value / 1048576).toFixed(1)} MB`;
  return `${(value / 1024).toFixed(0)} KB`;
};

const pct = (part, total) =>
  total ? Math.min(100, Math.max(0, (Number(part) / Number(total)) * 100)) : 0;

const fmtUptime = (seconds) => {
  const days = Math.floor(Number(seconds || 0) / 86400);
  const hours = Math.floor((Number(seconds || 0) % 86400) / 3600);
  if (days > 0) return `${days} gün ${hours} saat`;
  return `${hours} saat`;
};

const KIND_LABEL = {
  blog: "Blog",
  journal: "Haber",
  project: "Proje",
  service: "Hizmet",
};

const toneFor = (usedPct) => {
  if (usedPct >= 90) return "bg-rose-500";
  if (usedPct >= 75) return "bg-amber-500";
  return "bg-emerald-500";
};

const Gauge = ({ icon: Icon, label, usedBytes, totalBytes, footer }) => {
  const usedPct = pct(usedBytes, totalBytes);
  return (
    <div className="admin-card p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <Icon size={16} className="shrink-0 text-slate-400" />
      </div>
      <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
        {fmt(usedBytes)}
        <span className="ml-1 text-sm font-normal text-slate-500 dark:text-slate-400">
          / {fmt(totalBytes)}
        </span>
      </p>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <span
          className={`block h-full rounded-full ${toneFor(usedPct)}`}
          style={{ width: `${usedPct}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
        %{usedPct.toFixed(0)} dolu · {footer}
      </p>
    </div>
  );
};

Gauge.propTypes = {
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  usedBytes: PropTypes.number.isRequired,
  totalBytes: PropTypes.number.isRequired,
  footer: PropTypes.string,
};

const Storage = () => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError("");
      const { data } = await api.get("/storage");
      setReport(data);
    } catch (error) {
      setLoadError(error?.friendlyMessage || "Depolama raporu getirilemedi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const runDelete = async (endpoint, successLabel) => {
    try {
      setBusy(true);
      const { data } = await api.delete(endpoint, { data: { all: true } });
      setToast({
        msg: `${successLabel}: ${data.deleted} dosya silindi, ${fmt(
          data.freedBytes
        )} yer açıldı.`,
        type: "success",
      });
      await load();
    } catch (error) {
      setToast({
        msg: error?.friendlyMessage || "İşlem başarısız.",
        type: "error",
      });
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  if (loading) {
    return (
      <AdminLoadingState
        title="Depolama taranıyor"
        message="Sunucu durumu ve medya klasörü kontrol ediliyor."
      />
    );
  }

  if (loadError) {
    return (
      <LoadErrorState
        title="Depolama raporu açılamadı"
        message={loadError}
        onRetry={load}
      />
    );
  }

  const { system = {}, totals = {} } = report;
  const usedByMedia = Number(totals.total || 0);
  const inUse = usedByMedia - Number(report.reclaimable || 0);

  return (
    <div className="space-y-6">
      {toast ? <ToastAlert {...toast} onClose={() => setToast(null)} /> : null}

      <ConfirmDialog
        open={Boolean(confirm)}
        type="danger"
        loading={busy}
        title={confirm?.title || ""}
        message={confirm?.message || ""}
        confirmText="Sil"
        cancelText="Vazgeç"
        onCancel={() => setConfirm(null)}
        onConfirm={() => runDelete(confirm.endpoint, confirm.successLabel)}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
            Depolama Yönetimi
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Sunucunun durumu ve güvenle temizlenebilecek dosyalar.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={busy}
          className="inline-flex items-center gap-2 self-start rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-200"
        >
          <RefreshCw size={16} />
          Yenile
        </button>
      </div>

      {/* ---------- Sunucu durumu ---------- */}
      <section>
        <h2 className="mb-3 px-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
          Sunucu
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {system.disk ? (
            <Gauge
              icon={HardDrive}
              label="Disk"
              usedBytes={system.disk.used}
              totalBytes={system.disk.total}
              footer={`${fmt(system.disk.free)} boş`}
            />
          ) : null}
          {system.memory ? (
            <Gauge
              icon={MemoryStick}
              label="Bellek (RAM)"
              usedBytes={system.memory.used}
              totalBytes={system.memory.total}
              footer={`${fmt(system.memory.available)} kullanılabilir`}
            />
          ) : null}
          <div className="admin-card p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                İşlemci
              </p>
              <Cpu size={16} className="shrink-0 text-slate-400" />
            </div>
            <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
              {(system.loadAverage?.[0] ?? 0).toFixed(2)}
              <span className="ml-1 text-sm font-normal text-slate-500 dark:text-slate-400">
                / {system.cpuCount} çekirdek
              </span>
            </p>
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              Yük (1/5/15 dk):{" "}
              {(system.loadAverage || [])
                .map((v) => Number(v).toFixed(2))
                .join(" · ")}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Çalışma süresi: {fmtUptime(system.uptimeSeconds)}
            </p>
          </div>
        </div>
      </section>

      {/* ---------- Medya özeti ---------- */}
      <section className="admin-card p-5 sm:p-6">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">
          Medya klasörü
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Toplam
            </p>
            <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">
              {fmt(usedByMedia)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {report.fileCount} dosya
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Sitede kullanılan
            </p>
            <p className="mt-1 text-xl font-semibold text-slate-700 dark:text-slate-200">
              {fmt(inUse)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Silinemez
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-emerald-600 dark:text-emerald-300">
              Temizlenebilir
            </p>
            <p className="mt-1 text-xl font-semibold text-emerald-600 dark:text-emerald-300">
              {fmt(report.reclaimable)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Siteyi etkilemez
            </p>
          </div>
        </div>
      </section>

      {/* ---------- Ham arşivler ---------- */}
      <section className="admin-card p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-3">
            <span className="hidden h-10 w-10 shrink-0 place-items-center rounded-2xl bg-amber-50 text-amber-600 sm:grid dark:bg-amber-500/10 dark:text-amber-300">
              <Archive size={18} />
            </span>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Ham arşivler
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
                Bir video veya görsel yüklendiğinde, sisteme uygun hale
                getirilmeden önceki ham hali bir kenarda saklanıyor. Bu dosyalar
                sitede <strong>hiçbir zaman kullanılmıyor</strong>. Silmek
                sitedeki görüntüyü değiştirmez.
              </p>
            </div>
          </div>
          {report.archives.length > 0 ? (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                setConfirm({
                  endpoint: "/storage/archives",
                  successLabel: "Ham arşivler",
                  title: "Ham arşivleri sil",
                  message: `${report.archives.length} ham dosya silinecek ve ${fmt(
                    totals.original
                  )} yer açılacak. Sitede görünen hiçbir şey değişmez. Bu işlem geri alınamaz.`,
                })
              }
              className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50"
            >
              <Trash2 size={16} />
              Tümünü temizle ({fmt(totals.original)})
            </button>
          ) : null}
        </div>

        {report.archives.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
            Arşivlenmiş ham dosya yok.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <th className="pb-2 pr-3 font-medium">İçerik</th>
                  <th className="pb-2 pr-3 font-medium">Medya</th>
                  <th className="pb-2 font-medium">Arşiv boyutu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {report.archives.map((a) => (
                  <tr key={a.storageKey}>
                    <td className="py-2.5 pr-3">
                      <span className="mr-2 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {KIND_LABEL[a.kind] || a.kind}
                      </span>
                      <span className="text-slate-800 dark:text-slate-100">
                        {a.contentTitle}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-slate-600 dark:text-slate-300">
                      {a.label}
                    </td>
                    <td className="py-2.5 font-medium text-amber-600 dark:text-amber-300">
                      {fmt(a.bytes)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ---------- Yetim dosyalar ---------- */}
      <section className="admin-card p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-3">
            <span className="hidden h-10 w-10 shrink-0 place-items-center rounded-2xl bg-rose-50 text-rose-600 sm:grid dark:bg-rose-500/10 dark:text-rose-300">
              <FileWarning size={18} />
            </span>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Yetim dosyalar
              </h2>
              <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
                Silinmiş veya değiştirilmiş içeriklerden artakalan dosyalar.
                Hiçbir blog, haber, proje veya hizmet bunlara bağlı değil.
              </p>
            </div>
          </div>
          {report.orphans.length > 0 ? (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                setConfirm({
                  endpoint: "/storage/orphans",
                  successLabel: "Yetim dosyalar",
                  title: "Yetim dosyaları sil",
                  message: `${report.orphans.length} dosya silinecek ve ${fmt(
                    totals.orphan
                  )} yer açılacak. Bu dosyalar hiçbir içerik tarafından kullanılmıyor. Bu işlem geri alınamaz.`,
                })
              }
              className="inline-flex shrink-0 items-center gap-2 rounded-2xl bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-600 disabled:opacity-50"
            >
              <Trash2 size={16} />
              Tümünü sil ({fmt(totals.orphan)})
            </button>
          ) : null}
        </div>

        {report.orphans.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
            Yetim dosya yok, klasör temiz.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100 text-sm dark:divide-slate-800">
            {report.orphans.map((o) => (
              <li
                key={o.key}
                className="flex items-center justify-between gap-4 py-2.5"
              >
                <span className="truncate font-mono text-xs text-slate-600 dark:text-slate-300">
                  {o.key}
                </span>
                <span className="shrink-0 font-medium text-rose-600 dark:text-rose-300">
                  {fmt(o.bytes)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="px-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
        Bu sayfadan yalnızca yukarıdaki iki grup silinebilir. Sitede kullanılan
        görsel ve videolara buradan erişilemez; onlar ancak ilgili içerik
        silindiğinde kaldırılır.
      </p>
    </div>
  );
};

export default Storage;
