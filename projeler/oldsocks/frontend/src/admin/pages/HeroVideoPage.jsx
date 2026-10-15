// src/admin/pages/HeroVideoPage.jsx
import { useEffect, useRef, useState } from "react";
import {
  Button,
  Typography,
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
  Tooltip,
  Chip,
  Spinner,
} from "@material-tailwind/react";
import {
  ArrowUpTrayIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import ToastAlert from "../../components/ui/ToastAlert";
import api from "../../../api";
import { v4 as uuidv4 } from "uuid";
import { useUploadQueue } from "../../context/UploadQueueContext";
import {
  mediaErrorMessage,
  startMediaPreparation,
  uploadMediaFile,
  validateMediaFile,
} from "../../services/mediaUpload";

/* ───── Görsel/Video yardımcıları ───── */
const isHeic = (file) => {
  const name = (file?.name || "").toLowerCase();
  const type = (file?.type || "").toLowerCase();
  return (
    name.endsWith(".heic") ||
    name.endsWith(".heif") ||
    type.includes("heic") ||
    type.includes("heif")
  );
};
const isImage = (file) => (file?.type || "").startsWith("image/");
const isVideo = (file) => (file?.type || "").startsWith("video/");

/* Silme Onay Modali */
const ConfirmModal = ({ open, onClose, onConfirm, message }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-xl p-6 shadow max-w-sm w-full">
        <Typography className="mb-6">{message}</Typography>
        <div className="flex justify-end gap-3">
          <Button variant="text" onClick={onClose}>
            Vazgeç
          </Button>
          <Button color="red" onClick={onConfirm}>
            Sil
          </Button>
        </div>
      </div>
    </div>
  );
};

export default function HeroVideoPage() {
  const [videos, setVideos] = useState([]);
  const [file, setFile] = useState(null); // kullanıcı seçiminden sonra (optimize edilmiş olabilir)
  const [rawFile, setRawFile] = useState(null); // kullanıcıdan gelen ham dosya (bilgilendirme için)
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [selected, setSelected] = useState(null); // { url, kind }
  const [isFetching, setIsFetching] = useState(true);
  const [progress, setProgress] = useState(0);
  const [reordering, setReordering] = useState(false);

  const inputRef = useRef(null);
  const { addTask, updateTask, removeTask } = useUploadQueue();

  const fetchVideos = async () => {
    try {
      setIsFetching(true);
      const res = await api.get("/hero-videos");
      setVideos(res.data);
    } catch {
      setToast({ msg: "Medya listesi alınamadı", type: "error" });
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  /* ————— Dosya seçimi / drop ————— */
  const handlePickedFile = async (picked) => {
    if (!picked) return;

    // Limit doluysa yeni seçim yapılmasın
    if (videos.length >= 3) {
      setToast({
        msg: "En fazla 3 hero medyası yükleyebilirsiniz. Lütfen önce birini silin.",
        type: "error",
      });
      inputRef.current && (inputRef.current.value = "");
      return;
    }

    if (isVideo(picked)) {
      try {
        validateMediaFile(picked, "hero_video");
        startMediaPreparation(picked, "hero_video");
        setRawFile(picked);
        setFile(picked);
        setToast({
          msg: "Video yüklendikten sonra mobil ve masaüstü sürümleri hazırlanacak.",
          type: "info",
        });
      } catch (error) {
        setToast({ msg: mediaErrorMessage(error), type: "error" });
        inputRef.current && (inputRef.current.value = "");
      }
      return;
    }

    if (isImage(picked) || isHeic(picked)) {
      try {
        validateMediaFile(picked, "hero_image");
        startMediaPreparation(picked, "hero_image");
        setRawFile(picked);
        setFile(picked);
        setToast({
          msg: "Görsel sunucuda farklı ekran boyutları için optimize edilecek.",
          type: "info",
        });
      } catch (err) {
        setToast({
          msg: mediaErrorMessage(err),
          type: "error",
        });
        inputRef.current && (inputRef.current.value = "");
      }
      return;
    }

    // Diğer tüm türler
    setToast({
      msg: "Sadece video veya görsel yükleyebilirsiniz.",
      type: "error",
    });
    inputRef.current && (inputRef.current.value = "");
  };

  const onDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const f = e.dataTransfer?.files?.[0];
    await handlePickedFile(f);
  };

  const prevent = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  /* ————— Upload ————— */
  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    setProgress(0);

    // UploadQueue
    const taskId = uuidv4();
    addTask({
      id: taskId,
      name: file?.name || "Hero Medya",
      progress: 0,
    });

    try {
      const purpose = isVideo(file) ? "hero_video" : "hero_image";
      const asset = await uploadMediaFile(file, purpose, {
        onProgress: (state) => {
          const p =
            state.phase === "processing"
              ? 95
              : state.phase === "ready"
              ? 100
              : Math.round(state.percent * 0.9);
          setProgress(p);
          updateTask(taskId, {
            progress: p,
            phase: state.phase,
            status: state.phase,
          });
        },
      });
      await api.post("/hero-videos", { mediaAssetId: asset.id });

      setFile(null);
      setRawFile(null);
      setProgress(0);
      inputRef.current && (inputRef.current.value = "");
      await fetchVideos();

      setToast({ msg: "Yükleme başarılı", type: "success" });
      updateTask(taskId, { progress: 100, status: "success" });
      setTimeout(() => removeTask(taskId), 2000);
    } catch (err) {
      const msg = mediaErrorMessage(
        err,
        err?.response?.data?.message || "Yükleme hatası"
      );
      setToast({ msg, type: "error" });
      updateTask(taskId, {
        progress: 100,
        status: "error",
        errorMsg: msg,
      });
      setTimeout(() => removeTask(taskId), 4000);
    } finally {
      setLoading(false);
    }
  };

  /* ————— Sıralama ————— */
  const moveItem = async (index, direction) => {
    const target = index + direction;
    if (reordering || target < 0 || target >= videos.length) return;

    const previous = videos;
    const next = [...videos];
    [next[index], next[target]] = [next[target], next[index]];

    // Önce ekranda uygula, sonra sunucuya yaz; hata olursa eski sıraya dön.
    setVideos(next);
    setReordering(true);
    try {
      const res = await api.patch("/hero-videos/order", {
        ids: next.map((item) => item._id),
      });
      setVideos(res.data);
    } catch (err) {
      setVideos(previous);
      setToast({
        msg: err?.response?.data?.message || "Sıralama kaydedilemedi",
        type: "error",
      });
    } finally {
      setReordering(false);
    }
  };

  /* ————— Delete ————— */
  const handleDelete = async () => {
    try {
      await api.delete(`/hero-videos/${confirmId}`);
      setConfirmId(null);
      fetchVideos();
      setToast({ msg: "Silindi", type: "success" });
    } catch {
      setToast({ msg: "Silme işlemi başarısız", type: "error" });
    }
  };

  return (
    <div className="mx-auto max-w-[1400px]">
      {/* Page Header */}
      <div className="sticky top-0 z-10 -mx-4 sm:mx-0 bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-b">
        <div className="px-4 py-4 sm:py-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0">
              <Typography variant="h4" className="!text-xl sm:!text-2xl">
                Hero Medyaları
              </Typography>
              <Typography variant="small" className="text-gray-600">
                En fazla 3 öğe yükleyebilirsiniz. (Video veya Görsel) Kartların
                altındaki oklarla vitrindeki gösterim sırasını değiştirebilirsiniz.
              </Typography>

              {/* Limit info bandı */}
              {videos.length >= 3 && (
                <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 text-amber-900 p-2 text-sm flex items-start gap-2">
                  <ExclamationTriangleIcon className="w-5 h-5 mt-0.5 shrink-0" />
                  <div>
                    Maksimum <b>3</b> hero medyası eklenebilir. Yeni bir medya
                    yüklemek için önce mevcutlardan birini silin.
                  </div>
                </div>
              )}
            </div>

            {/* Uploader Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <label
                onDrop={onDrop}
                onDragOver={prevent}
                onDragEnter={prevent}
                onDragLeave={prevent}
                className="flex items-center justify-between gap-3 cursor-pointer border border-gray-300 rounded-lg px-3 py-2 hover:bg-gray-50 transition w-full sm:w-80"
                title="MP4/WebM/QuickTime video veya JPG/PNG/WebP/HEIC görsel yükleyin."
              >
                <div className="flex items-center gap-2 min-w-0">
                  <ArrowUpTrayIcon className="w-5 h-5 text-gray-600 shrink-0" />
                  <span className="text-sm text-gray-700 truncate">
                    {rawFile ? rawFile.name : "Video/Görsel Seç veya Bırak"}
                  </span>
                </div>
                <input
                  ref={inputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,image/*"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    await handlePickedFile(f);
                  }}
                  className="hidden"
                />
              </label>

              <Button
                color="blue"
                onClick={handleUpload}
                disabled={!file || loading || videos.length >= 3}
                className="w-full sm:w-auto disabled:opacity-50"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <Spinner className="h-4 w-4" /> Yükleniyor…{" "}
                    {progress ? `${progress}%` : ""}
                  </span>
                ) : (
                  "Yükle"
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Empty State / Loading */}
      {isFetching ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-40 sm:h-48 rounded-lg bg-gray-100 animate-pulse"
            />
          ))}
        </div>
      ) : videos.length === 0 ? (
        <div
          className="m-4 rounded-xl border border-dashed p-10 text-center"
          onDrop={onDrop}
          onDragOver={prevent}
          onDragEnter={prevent}
          onDragLeave={prevent}
        >
          <ArrowUpTrayIcon className="mx-auto h-10 w-10 text-gray-400" />
          <Typography className="mt-3">Henüz medya yok</Typography>
          <Typography variant="small" className="text-gray-600">
            Video veya görsel eklemek için dosyayı sürükleyip bırakın ya da
            yukarıdan seçin.
          </Typography>
        </div>
      ) : null}

      {/* Cards */}
      {videos.length > 0 && (
        <div className="p-4">
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4">
            {videos.map((item, index) => (
              <div
                key={item._id}
                className="border rounded-lg overflow-hidden group relative cursor-pointer bg-white shadow-sm hover:shadow-md transition"
                onClick={() => setSelected({ url: item.url, kind: item.kind })}
              >
                <div className="relative w-full aspect-video bg-black">
                  {item.kind === "image" ? (
                    <img
                      src={item.url}
                      alt="Hero görseli"
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 grid place-items-center text-white text-sm">
                      ▶ İzlemek için tıklayın
                    </div>
                  )}

                  {/* Sıra numarası */}
                  <div className="absolute left-2 top-2">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white text-xs font-semibold backdrop-blur">
                      {index + 1}
                    </span>
                  </div>

                  {/* Type Badge */}
                  <div className="absolute left-2 bottom-2">
                    <Chip
                      value={item.kind === "image" ? "Görsel" : "Video"}
                      size="sm"
                      className="bg-black/60 text-white backdrop-blur rounded-full"
                    />
                  </div>
                </div>

                {/* Sıralama */}
                <div
                  className="flex items-center justify-between gap-2 border-t bg-gray-50 px-2 py-1.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Tooltip content="Öne al">
                    <span>
                      <Button
                        size="sm"
                        variant="text"
                        disabled={index === 0 || reordering}
                        onClick={() => moveItem(index, -1)}
                        className="px-2 py-1 disabled:opacity-30"
                        aria-label="Öne al"
                      >
                        <ChevronLeftIcon className="w-4 h-4" />
                      </Button>
                    </span>
                  </Tooltip>

                  <span className="text-xs text-gray-600">
                    {index + 1}. sıra
                  </span>

                  <Tooltip content="Geriye al">
                    <span>
                      <Button
                        size="sm"
                        variant="text"
                        disabled={index === videos.length - 1 || reordering}
                        onClick={() => moveItem(index, 1)}
                        className="px-2 py-1 disabled:opacity-30"
                        aria-label="Geriye al"
                      >
                        <ChevronRightIcon className="w-4 h-4" />
                      </Button>
                    </span>
                  </Tooltip>
                </div>

                {/* Actions */}
                <div className="absolute top-2 right-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition">
                  <Tooltip content="Sil">
                    <Button
                      size="sm"
                      color="red"
                      variant="outlined"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmId(item._id);
                      }}
                      className="px-2 py-1"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </Button>
                  </Tooltip>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Silme Onayı */}
      <ConfirmModal
        open={!!confirmId}
        onClose={() => setConfirmId(null)}
        onConfirm={handleDelete}
        message="Bu öğeyi silmek istediğinize emin misiniz?"
      />

      {/* Media Önizleme */}
      <Dialog
        open={!!selected}
        handler={() => setSelected(null)}
        size="xl"
        className="!max-w-[95vw] sm:!max-w-3xl"
      >
        <DialogHeader>Önizleme</DialogHeader>
        <DialogBody className="overflow-hidden">
          {selected?.kind === "image" ? (
            <img
              src={selected.url}
              alt="Önizleme"
              className="w-full max-h-[75vh] object-contain rounded"
            />
          ) : (
            <video
              src={selected?.url}
              controls
              autoPlay
              className="w-full max-h-[75vh] rounded"
            />
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="text" onClick={() => setSelected(null)}>
            Kapat
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Toast */}
      {toast && (
        <ToastAlert
          msg={toast.msg}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
