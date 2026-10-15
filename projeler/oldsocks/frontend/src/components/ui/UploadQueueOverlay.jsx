import { useUploadQueue } from "../../context/UploadQueueContext";

export default function UploadQueueOverlay() {
  const { queue } = useUploadQueue();
  if (!queue.length) return null;

  return (
    <div className="fixed bottom-4 right-4 w-[min(24rem,calc(100vw-2rem))] p-4 bg-white shadow-xl border rounded-xl z-[60]">
      <h3 className="text-sm font-bold mb-2">Medya işlemleri</h3>
      <ul className="space-y-2 max-h-60 overflow-y-auto">
        {queue.map((t) => (
          <li key={t.id}>
            <p className="truncate">{t.name}</p>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all ${
                  t.status === "error"
                    ? "bg-red-500"
                    : t.status === "success"
                    ? "bg-green-500"
                    : "bg-blue-600"
                }`}
                style={{ width: `${t.progress}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs mt-0.5">
              <span className="text-gray-500">
                {t.status === "error"
                  ? "Tamamlanamadı"
                  : t.status === "success"
                  ? "Hazır"
                  : t.phase === "processing"
                  ? "Sunucuda optimize ediliyor…"
                  : t.phase === "starting"
                  ? "Hazırlanıyor…"
                  : `Yükleniyor: ${t.progress}%`}
              </span>
              {t.status === "success" && (
                <span className="text-green-600 font-bold">✓</span>
              )}
              {t.status === "error" && (
                <span className="text-red-600 font-bold">✕</span>
              )}
            </div>
            {t.errorMsg && (
              <p className="mt-1 text-xs text-red-600 break-words">{t.errorMsg}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
