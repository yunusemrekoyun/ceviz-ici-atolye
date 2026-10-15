import { useCallback, useEffect, useState } from "react";
import {
  ArrowDownTrayIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  CloudArrowUpIcon,
  ExclamationTriangleIcon,
  KeyIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import api from "../../../api";

const formatDate = (value) => value
  ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" }).format(new Date(value))
  : "—";

function errorText(error) {
  return error?.response?.data?.message || "İşlem tamamlanamadı. Biraz sonra yeniden deneyin.";
}

function StatusPill({ good, children }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${good ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>{children}</span>;
}

function Panel({ title, description, children }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      {description && <p className="mt-1 text-sm leading-6 text-gray-600">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default function BackupsPage() {
  const [status, setStatus] = useState(null);
  const [runs, setRuns] = useState([]);
  const [snapshots, setSnapshots] = useState([]);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [kitFile, setKitFile] = useState(null);
  const [kitPassphrase, setKitPassphrase] = useState("");
  const [dailyTime, setDailyTime] = useState("02:00");
  const [enabled, setEnabled] = useState(false);
  const [scheduleDirty, setScheduleDirty] = useState(false);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeJobId, setActiveJobId] = useState("");
  const [preview, setPreview] = useState(null);
  const [restorePassword, setRestorePassword] = useState("");
  const [confirmation, setConfirmation] = useState("");

  const refresh = useCallback(async () => {
    const [statusResponse, runsResponse] = await Promise.all([
      api.get("/backups/status"), api.get("/backups/runs"),
    ]);
    setStatus(statusResponse.data);
    setRuns(runsResponse.data || []);
    const latest = statusResponse.data.latestJob;
    if (latest && ["preview", "restore"].includes(latest.kind) && ["queued", "running"].includes(latest.status)) {
      setActiveJobId((current) => current || latest._id);
    }
    if (!scheduleDirty) {
      setDailyTime(statusResponse.data.dailyTime || "02:00");
      setEnabled(Boolean(statusResponse.data.enabled));
    }
  }, [scheduleDirty]);

  const loadSnapshots = useCallback(async () => {
    const { data } = await api.get("/backups/snapshots", { timeout: 120000 });
    setSnapshots(data || []);
  }, []);

  useEffect(() => {
    refresh().catch((requestError) => setError(errorText(requestError))).finally(() => setLoading(false));
    const timer = window.setInterval(() => refresh().catch(() => {}), 15000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("google");
    if (value === "connected") setMessage("Google Drive bağlantısı kuruldu. Kurtarma kitini indirip saklayın.");
    if (value === "cancelled") setError("Google Drive bağlantısı tamamlanmadı.");
    if (value === "error") setError("Google Drive bağlantısı kurulamadı. OAuth ayarlarını kontrol edin.");
    if (value) window.history.replaceState({}, "", window.location.pathname);
  }, []);

  useEffect(() => {
    if (status?.connected && status?.binaries?.restic && status?.binaries?.rclone) loadSnapshots().catch(() => {});
  }, [status?.connected, status?.binaries?.restic, status?.binaries?.rclone, status?.lastSuccessAt, loadSnapshots]);

  useEffect(() => {
    if (!activeJobId) return undefined;
    let stopped = false;
    async function check() {
      try {
        const { data } = await api.get(`/backups/jobs/${activeJobId}`);
        if (stopped) return;
        if (data.status === "completed") {
          if (data.kind === "preview") {
            setPreview({ id: data._id, snapshotId: data.snapshotId, ...data.detail?.report });
            setMessage("Etki raporu hazır. Değişiklikleri inceleyin.");
          } else if (data.kind === "restore") {
            setPreview(null);
            setMessage("Katalog ve medya geri yüklendi. Siparişler ve mevcut stoklar korundu.");
          }
          setActiveJobId("");
          await refresh();
          await loadSnapshots().catch(() => {});
        } else if (data.status === "failed") {
          setError(data.errorCode === "CATALOG_CHANGED" ? "Katalog bu sırada değişti. Yeniden etki raporu hazırlayın." :
            data.kind === "restore" && data.detail?.safetySnapshotId ? `Geri yükleme tamamlanamadı. Öncesinde alınan güvenlik sürümü: ${data.detail.safetySnapshotId.slice(0, 16)}. İşlem kaydını kontrol edin.` :
              "İşlem başarısız oldu. Yönetici işlem kaydını kontrol edin.");
          setActiveJobId("");
          await loadSnapshots().catch(() => {});
        }
      } catch (requestError) {
        if (!stopped) setError(errorText(requestError));
      }
    }
    check();
    const timer = window.setInterval(check, 5000);
    return () => { stopped = true; window.clearInterval(timer); };
  }, [activeJobId, loadSnapshots, refresh]);

  async function perform(name, action, success) {
    setBusy(name); setError(""); setMessage("");
    try {
      await action();
      if (success) setMessage(success);
      await refresh();
      return true;
    } catch (requestError) {
      setError(errorText(requestError));
      return false;
    } finally { setBusy(""); }
  }

  async function saveClient(event) {
    event.preventDefault();
    const saved = await perform("client", () => api.post("/backups/google/client", { clientId, clientSecret }), "OAuth istemcisi kaydedildi.");
    if (saved) setClientSecret("");
  }

  async function connect() {
    setBusy("connect"); setError("");
    try {
      const { data } = await api.post("/backups/google/connect");
      window.location.assign(data.url);
    } catch (requestError) {
      setError(errorText(requestError)); setBusy("");
    }
  }

  async function downloadKit(event) {
    event.preventDefault();
    setBusy("kit"); setError(""); setMessage("");
    try {
      const response = await api.post("/backups/recovery-kit", { adminPassword, passphrase }, { responseType: "blob", timeout: 180000 });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = "oldsocks-kurtarma-kiti.json";
      document.body.appendChild(link);
      link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30000);
      setAdminPassword(""); setPassphrase("");
      setMessage("Kit oluşturuldu. İndirdiğiniz dosyayı aşağıdan seçip parolasıyla doğrulayın; ardından yedeklemeyi açabilirsiniz.");
      await refresh();
    } catch (requestError) {
      if (requestError?.response?.data instanceof Blob) {
        try { setError(JSON.parse(await requestError.response.data.text()).message); }
        catch { setError(errorText(requestError)); }
      } else setError(errorText(requestError));
    } finally { setBusy(""); }
  }

  async function verifyKit(event) {
    event.preventDefault();
    if (!kitFile) return;
    setBusy("verify"); setError(""); setMessage("");
    try {
      if (kitFile.size > 64 * 1024) throw new Error("Seçilen kit dosyası beklenenden büyük.");
      let kit;
      try { kit = JSON.parse(await kitFile.text()); }
      catch { throw new Error("Seçilen dosya geçerli bir JSON kurtarma kiti değil."); }
      await api.post("/backups/recovery-kit/verify", { kit, passphrase: kitPassphrase });
      setKitPassphrase(""); setKitFile(null);
      setMessage("Kurtarma kiti doğrulandı. Dosyayı ve parolasını sunucudan ayrı, güvenli yerlerde saklayın.");
      await refresh();
    } catch (requestError) {
      setError(requestError?.response ? errorText(requestError) : requestError?.message || errorText(requestError));
    } finally { setBusy(""); }
  }

  async function saveSchedule(event) {
    event.preventDefault();
    const saved = await perform("schedule", () => api.patch("/backups/settings", { dailyTime, enabled }), "Yedekleme takvimi kaydedildi.");
    if (saved) setScheduleDirty(false);
  }

  async function createPreview(snapshotId) {
    setBusy("preview"); setError(""); setMessage(""); setPreview(null);
    try {
      const { data } = await api.post("/backups/previews", { snapshotId });
      setActiveJobId(data.id);
      setMessage("Yedek indiriliyor ve etki raporu hazırlanıyor. Bu işlem birkaç dakika sürebilir.");
    } catch (requestError) { setError(errorText(requestError)); }
    finally { setBusy(""); }
  }

  async function startRestore(event) {
    event.preventDefault();
    if (!preview) return;
    setBusy("restore"); setError(""); setMessage("");
    try {
      const { data } = await api.post("/backups/restores", {
        previewId: preview.id, adminPassword: restorePassword, confirmation,
      });
      setRestorePassword(""); setConfirmation("");
      setActiveJobId(data.id);
      setMessage("Önce güncel durumun güvenlik yedeği alınıyor, sonra katalog geri yüklenecek.");
    } catch (requestError) { setError(errorText(requestError)); }
    finally { setBusy(""); }
  }

  if (loading) return <div className="p-6 text-sm text-gray-600">Yedekler yükleniyor…</div>;

  const toolsReady = status?.binaries?.rclone && status?.binaries?.restic;
  const canRun = status?.connected && status?.recoveryKitVerifiedAt && toolsReady;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 pb-12 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-blue-700"><CloudArrowUpIcon className="h-5 w-5" /> Sistem</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900">Yedekler</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">Veritabanı ve medya Google Drive’a şifreli olarak kaydedilir. Geri yükleme öncesinde etkilenecek katalog kayıtları gösterilir.</p>
        </div>
        <button type="button" onClick={() => refresh().catch((requestError) => setError(errorText(requestError)))} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"><ArrowPathIcon className="h-4 w-4" /> Yenile</button>
      </header>

      {message && <div role="status" className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircleIcon className="h-5 w-5 shrink-0" />{message}</div>}
      {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><ExclamationTriangleIcon className="h-5 w-5 shrink-0" />{error}</div>}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Google Drive</p><div className="mt-3"><StatusPill good={status?.connected}>{status?.connected ? "Bağlı" : "Bağlı değil"}</StatusPill></div><p className="mt-3 text-xs text-gray-500">Bağlantı: {formatDate(status?.connectedAt)}</p></div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Son başarılı yedek</p><p className="mt-3 text-base font-semibold text-gray-900">{formatDate(status?.lastSuccessAt)}</p><p className="mt-3 text-xs text-gray-500">{status?.lastSnapshotId ? `Kimlik: ${status.lastSnapshotId.slice(0, 12)}` : "Henüz Drive yedeği yok"}</p></div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Otomatik takvim</p><div className="mt-3"><StatusPill good={status?.enabled}>{status?.enabled ? "Açık" : "Kapalı"}</StatusPill></div><p className="mt-3 text-xs text-gray-500">Her gün {status?.dailyTime || "02:00"} · İstanbul saati</p></div>
      </div>

      {status?.lastError && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Son yedek hatası: {status.lastError} ({formatDate(status.lastErrorAt)})</div>}

      <Panel title="1. Google bağlantısı" description="Müşterinin Google Cloud projesindeki Web application OAuth bilgilerini girin. Kimlik bilgileri sunucuda şifreli saklanır.">
        {!status?.clientConfigured ? (
          <form onSubmit={saveClient} className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-gray-700">Client ID<input required autoComplete="off" value={clientId} onChange={(event) => setClientId(event.target.value)} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" /></label>
            <label className="text-sm font-medium text-gray-700">Client secret<input required type="password" autoComplete="off" value={clientSecret} onChange={(event) => setClientSecret(event.target.value)} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" /></label>
            <div className="sm:col-span-2"><button disabled={Boolean(busy)} className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy === "client" ? "Kaydediliyor…" : "Kimlik bilgilerini kaydet"}</button></div>
          </form>
        ) : status?.connected ? (
          <div className="space-y-3">
            <p className="text-sm text-emerald-700">Google hesabı bağlı. Erişim yalnızca bu uygulamanın oluşturduğu Drive dosyalarıyla sınırlı.</p>
            <button type="button" disabled={Boolean(busy) || Boolean(activeJobId)} onClick={connect} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">Google hesabını yeniden bağla</button>
            <p className="text-xs leading-5 text-gray-500">Erişim süresi dolduysa yeniden bağlayın. Ardından yeni kurtarma kitini indirip doğrulayın ve günlük yedeklemeyi tekrar açın.</p>
          </div>
        ) : (
          <button type="button" disabled={Boolean(busy)} onClick={connect} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50">Google hesabını bağla</button>
        )}
        <p className="mt-4 break-all rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-600">OAuth yönlendirme adresi: {status?.callbackUri}</p>
        <p className="mt-2 text-xs leading-5 text-gray-500">Google Cloud OAuth uygulaması kalıcı yedekleme için In production durumunda olmalı.</p>
      </Panel>

      {status?.connected && <Panel title="2. Kurtarma kiti" description="Sunucu tamamen kaybolursa Drive’daki şifreli yedekleri açmak için bu kit ve belirleyeceğiniz parola gerekir. Kiti sunucudan ayrı saklayın.">
        <div className="mb-4 flex items-center gap-2 text-sm"><KeyIcon className="h-5 w-5 text-gray-500" /><StatusPill good={Boolean(status.recoveryKitVerifiedAt)}>{status.recoveryKitVerifiedAt ? `Dosya doğrulandı · ${formatDate(status.recoveryKitVerifiedAt)}` : "Dosya doğrulanmadı"}</StatusPill></div>
        <form onSubmit={downloadKit} className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-gray-700">Yönetici parolanız<input required type="password" autoComplete="current-password" value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" /></label>
          <label className="text-sm font-medium text-gray-700">Kit için yeni parola (en az 16 karakter)<input required minLength={16} type="password" autoComplete="new-password" value={passphrase} onChange={(event) => setPassphrase(event.target.value)} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" /></label>
          <div className="sm:col-span-2"><button disabled={Boolean(busy)} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-50"><ArrowDownTrayIcon className="h-4 w-4" />{busy === "kit" ? "Hazırlanıyor…" : "Şifreli kiti indir"}</button></div>
        </form>
        <form onSubmit={verifyKit} className="mt-5 grid gap-4 border-t border-gray-100 pt-5 sm:grid-cols-2">
          <label className="text-sm font-medium text-gray-700">İndirdiğiniz kit dosyası<input required type="file" accept=".json,application/json" onChange={(event) => setKitFile(event.target.files?.[0] || null)} className="mt-1 block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:font-medium file:text-gray-800" /></label>
          <label className="text-sm font-medium text-gray-700">Kit parolası<input required type="password" autoComplete="off" value={kitPassphrase} onChange={(event) => setKitPassphrase(event.target.value)} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" /></label>
          <div className="sm:col-span-2"><button disabled={Boolean(busy) || !kitFile} className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy === "verify" ? "Doğrulanıyor…" : "Dosyayı doğrula"}</button></div>
        </form>
      </Panel>}

      <Panel title="3. Otomatik yedekleme" description="Her gün seçilen saatte veritabanı ve medya tek bir şifreli sürüme alınır. İlk yedeği elle başlatıp doğrulayın.">
        {!toolsReady && <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">Sunucuda {[!status?.binaries?.restic && "restic", !status?.binaries?.rclone && "rclone"].filter(Boolean).join(" ve ")} aracı kurulmalı.</p>}
        <form onSubmit={saveSchedule} className="flex flex-wrap items-end gap-4">
          <label className="text-sm font-medium text-gray-700">Günlük saat<input required type="time" value={dailyTime} onChange={(event) => { setDailyTime(event.target.value); setScheduleDirty(true); }} className="mt-1 block rounded-lg border border-gray-300 px-3 py-2 text-sm" /></label>
          <label className="flex items-center gap-2 pb-2 text-sm font-medium text-gray-700"><input type="checkbox" checked={enabled} onChange={(event) => { setEnabled(event.target.checked); setScheduleDirty(true); }} className="h-4 w-4 rounded border-gray-300" /> Otomatik yedeklemeyi aç</label>
          <button disabled={Boolean(busy) || (enabled && !canRun)} className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy === "schedule" ? "Kaydediliyor…" : "Takvimi kaydet"}</button>
        </form>
        <div className="mt-5 border-t border-gray-100 pt-5"><button type="button" disabled={Boolean(busy) || !canRun} onClick={() => perform("run", () => api.post("/backups/runs"), "Yedekleme sıraya alındı. Tamamlanınca burada görünecek.")} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"><CloudArrowUpIcon className="h-4 w-4" />{busy === "run" ? "Başlatılıyor…" : "Şimdi yedek al"}</button></div>
      </Panel>

      <Panel title="İşlem geçmişi" description="Yedekleme, etki raporu ve geri yükleme kayıtları. Tarihli sürümler Drive üzerinde şifreli tutulur.">
        {!runs.length ? <p className="text-sm text-gray-500">Henüz işlem çalışmadı.</p> : <div className="divide-y divide-gray-100">{runs.map((run) => <div key={run._id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"><div><p className="font-medium text-gray-900">{({ backup: "Yedek", preview: "Etki raporu", restore: "Geri yükleme" })[run.kind] || run.kind} · {formatDate(run.createdAt)}</p><p className="mt-1 text-xs text-gray-500">{run.snapshotId ? `Sürüm: ${run.snapshotId.slice(0, 12)}` : run.errorCode || ""}</p></div><StatusPill good={run.status === "completed"}>{({ queued: "Sırada", running: "Çalışıyor", completed: "Tamamlandı", failed: "Hata" })[run.status] || run.status}</StatusPill></div>)}</div>}
        {snapshots.length > 0 && <p className="mt-4 text-xs text-gray-500">Drive üzerinde {snapshots.length} şifreli sürüm bulundu.</p>}
      </Panel>

      <Panel title="Katalogu tarihe döndür" description="Bir sürüm seçin. Sistem önce değişecek ürünleri, kategorileri ve medyayı gösterir. Siparişler ile mevcut ürün stokları korunur.">
        {!snapshots.length ? <p className="text-sm text-gray-500">Önce başarılı bir Drive yedeği oluşturun.</p> : (
          <div className="divide-y divide-gray-100">
            {snapshots.map((snapshot) => <div key={snapshot.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div><p className="text-sm font-medium text-gray-900">{formatDate(snapshot.time)} {snapshot.tags?.includes("oldsocks-pre-restore") && <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">Geri yükleme öncesi</span>}</p><p className="mt-1 font-mono text-xs text-gray-500">{snapshot.id.slice(0, 16)}</p></div>
              <button type="button" disabled={Boolean(busy) || Boolean(activeJobId)} onClick={() => createPreview(snapshot.id)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50">Etki raporu hazırla</button>
            </div>)}
          </div>
        )}
        {activeJobId && <p role="status" className="mt-4 inline-flex items-center gap-2 text-sm text-blue-700"><ClockIcon className="h-4 w-4" /> İşlem sürüyor. Sayfayı açık tutmanız gerekmez.</p>}
        {preview && <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
          <h3 className="text-base font-semibold text-gray-900">Etki raporu · {formatDate(preview.snapshotAt)}</h3>
          <p className="mt-2 text-sm leading-6 text-gray-700">Daha sonra eklenen {preview.products.newerHidden.length} ürün ve {preview.categories.newerHidden.length} kategori mağazada gizlenecek. Silinmeyecekler. {preview.products.changed.length} ürün ve {preview.categories.changed.length} kategori eski içeriğine dönecek. {preview.products.restoredWithZeroStock.length} silinmiş ürün sıfır stokla geri gelecek.</p>
          <p className="mt-2 text-sm leading-6 text-gray-700">{preview.ordersPreserved} sipariş korunacak. Mevcut {preview.products.stockPreservedForExisting} ürünün güncel stokları korunacak. {preview.media.readyAssetsChecked} hazır medya kaydının {preview.media.referencedFilesChecked} dosyası doğrulandı; {preview.media.historicAssetRecordsToRestore} eski medya kaydı geri getirilecek. Sonradan eklenen {preview.media.newerAssetRecordsPreserved} medya kaydı korunacak.</p>
          {[
            ["Gizlenecek yeni ürünler", preview.products.newerHidden, (item) => `${item.name} · stok ${item.stock}`],
            ["Eskiye dönecek ürünler", preview.products.changed, (item) => `${item.before.name} → ${item.after.name} · ₺${item.before.price} → ₺${item.after.price} · değişen alanlar: ${item.fields.join(", ")}`],
            ["Sıfır stokla geri gelecek ürünler", preview.products.restoredWithZeroStock, (item) => item.name],
            ["Gizlenecek yeni kategoriler", preview.categories.newerHidden, (item) => item.name],
            ["Eskiye dönecek kategoriler", preview.categories.changed, (item) => `${item.beforeName} → ${item.name} · değişen alanlar: ${item.fields.join(", ")}`],
            ["Geri gelecek kategoriler", preview.categories.restored, (item) => item.name],
          ].map(([title, items, label]) => items.length > 0 && <details key={title} className="mt-3 rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm"><summary className="cursor-pointer font-medium text-gray-800">{title} ({items.length})</summary><ul className="mt-2 max-h-56 list-disc space-y-1 overflow-auto pl-5 text-gray-700">{items.map((item) => <li key={item.id}>{label(item)}</li>)}</ul></details>)}
          <form onSubmit={startRestore} className="mt-5 border-t border-amber-200 pt-5">
            <p className="text-sm font-medium text-gray-900">Geri yüklemeden hemen önce güncel durum için ayrıca güvenlik yedeği alınır.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-medium text-gray-700">Yönetici parolanız<input required type="password" autoComplete="current-password" value={restorePassword} onChange={(event) => setRestorePassword(event.target.value)} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" /></label>
              <label className="text-sm font-medium text-gray-700">Onay için KATALOGU GERI YUKLE yazın<input required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" /></label>
            </div>
            <button disabled={Boolean(busy) || Boolean(activeJobId) || confirmation !== "KATALOGU GERI YUKLE"} className="mt-4 rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800 disabled:opacity-50">{busy === "restore" ? "Başlatılıyor…" : "Bu sürüme geri yükle"}</button>
          </form>
        </div>}
      </Panel>
    </div>
  );
}
