// src/pages/admin/InstagramPostsPage.jsx
import React, { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardBody,
  Typography,
  Button,
  Input,
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
  IconButton,
  Switch,
} from "@material-tailwind/react";
import { PencilIcon, TrashIcon, PlusIcon } from "@heroicons/react/24/outline";
import api from "../../../api";
import ToastAlert from "../../components/ui/ToastAlert";

/* ─────── Silme Onay Modali ─────── */
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

export default function InstagramPostsPage() {
  const [posts, setPosts] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    _id: null,
    embedLink: "",
    caption: "",
    active: true,
  });

  /* toast & sil onay */
  const [toast, setToast] = useState(null); // { msg, type }
  const [deleteId, setDeleteId] = useState(null);

  /* ─────── Verileri çek ─────── */
  const fetchPosts = useCallback(async () => {
    try {
      const { data } = await api.get("/instagram-posts/admin");
      setPosts(data);
    } catch {
      setToast({ msg: "Gönderiler alınamadı.", type: "error" });
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  /* ─────── Dialog aç / kapat ─────── */
  const handleOpen = (
    post = { _id: null, embedLink: "", caption: "", active: true }
  ) => {
    setForm(post);
    setOpen(true);
  };

  const handleClose = () => {
    setForm({ _id: null, embedLink: "", caption: "", active: true });
    setOpen(false);
  };

  /* ─────── Kaydet ─────── */
  const handleSubmit = async () => {
    if (!form.embedLink.trim()) {
      setToast({ msg: "Embed URL boş olamaz.", type: "error" });
      return;
    }

    const payload = {
      embedLink: form.embedLink.trim(),
      caption: form.caption.trim(),
      active: form.active,
    };

    try {
      if (form._id) {
        await api.put(`/instagram-posts/${form._id}`, payload);
        setToast({ msg: "Gönderi güncellendi.", type: "success" });
      } else {
        const response = await api.post("/instagram-posts", payload);
        if (response.status === 200 && response.data.message) {
          setToast({ msg: response.data.message, type: "info" });
          fetchPosts();
          handleClose();
          return;
        }
        setToast({ msg: "Gönderi eklendi.", type: "success" });
      }
      fetchPosts();
      handleClose();
    } catch (err) {
      const msg =
        err.response?.data?.message || "Gönderi eklenirken hata oluştu.";
      setToast({ msg, type: "error" });
    }
  };

  /* ─────── Silme akışı ─────── */
  const triggerDelete = (id) => setDeleteId(id);

  const handleDeleteConfirmed = async () => {
    const id = deleteId;
    setDeleteId(null);
    try {
      await api.delete(`/instagram-posts/${id}`);
      setToast({ msg: "Gönderi silindi.", type: "success" });
      fetchPosts();
    } catch {
      setToast({ msg: "Gönderi silinemedi.", type: "error" });
    }
  };

  /* ─────── Render ─────── */
  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
      {/* Başlık + ekle butonu */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 sm:gap-4 mb-6">
        <div className="min-w-0">
          <Typography variant="h4" className="text-2xl sm:text-3xl">
            Instagram Gönderileri
          </Typography>
          <Typography variant="small" className="text-gray-600">
            Embed URL ile gönderi ekleyin, düzenleyin ve aktif/pasif yapın.
          </Typography>
        </div>
        <Button
          color="blue"
          className="inline-flex items-center gap-2 self-start md:self-auto"
          onClick={() => handleOpen()}
        >
          <PlusIcon className="h-5 w-5" />
          <span className="hidden xs:inline">Yeni Gönderi</span>
        </Button>
      </div>

      {/* Liste */}
      <Card className="overflow-hidden">
        <CardBody className="space-y-4 p-3 sm:p-4">
          {posts.length === 0 ? (
            <div className="rounded-xl border border-dashed p-10 text-center">
              <Typography variant="h6" className="mb-2">
                Henüz gönderi eklenmemiş
              </Typography>
              <Typography className="text-gray-600">
                Sağ üstten “Yeni Gönderi” ile ekleyin.
              </Typography>
            </div>
          ) : (
            posts.map((post) => (
              <div
                key={post._id}
                className="grid grid-cols-1 md:grid-cols-[1fr,auto] gap-3 md:gap-4 border rounded-lg p-3 sm:p-4"
              >
                {/* Sol bilgi alanı */}
                <div className="min-w-0">
                  <Typography className="font-medium text-blue-800 break-all">
                    <a
                      href={post.embedLink}
                      target="_blank"
                      rel="noreferrer"
                      className="underline underline-offset-2 decoration-blue-300 hover:decoration-blue-500"
                      title={post.embedLink}
                    >
                      {post.embedLink}
                    </a>
                  </Typography>

                  {post.caption && (
                    <Typography className="text-sm text-gray-700 mt-1 line-clamp-2 sm:line-clamp-3">
                      {post.caption}
                    </Typography>
                  )}

                  <Typography
                    className={`text-xs mt-1 ${
                      post.active ? "text-green-600" : "text-red-500"
                    }`}
                  >
                    {post.active ? "Aktif" : "Pasif"}
                  </Typography>
                </div>

                {/* Sağ aksiyon alanı */}
                <div className="flex items-center justify-end gap-2">
                  <IconButton
                    variant="text"
                    color="blue"
                    onClick={() => handleOpen(post)}
                    aria-label="Düzenle"
                  >
                    <PencilIcon className="h-5 w-5" />
                  </IconButton>
                  <IconButton
                    variant="text"
                    color="red"
                    onClick={() => triggerDelete(post._id)}
                    aria-label="Sil"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </IconButton>
                </div>
              </div>
            ))
          )}
        </CardBody>
      </Card>

      {/* Dialog */}
      <Dialog
        open={open}
        handler={handleClose}
        size="lg"
        className="mx-2 sm:mx-auto"
      >
        <DialogHeader>
          {form._id ? "Gönderiyi Düzenle" : "Yeni Gönderi Ekle"}
        </DialogHeader>

        {/* mobilde rahat kullanım için max yükseklik + scroll */}
        <DialogBody divider className="max-h-[70vh] overflow-auto">
          <div className="grid grid-cols-1 gap-4">
            <Input
              label="Instagram Embed URL"
              value={form.embedLink}
              onChange={(e) =>
                setForm((f) => ({ ...f, embedLink: e.target.value }))
              }
              crossOrigin=""
            />
            <Input
              label="Açıklama (isteğe bağlı)"
              value={form.caption}
              onChange={(e) =>
                setForm((f) => ({ ...f, caption: e.target.value }))
              }
              crossOrigin=""
            />
            <div className="flex items-center justify-between">
              <Typography className="text-sm">Gönderi Aktif mi?</Typography>
              <Switch
                checked={form.active}
                onChange={(e) =>
                  setForm((f) => ({ ...f, active: e.target.checked }))
                }
              />
            </div>
            <Typography variant="small" className="text-gray-600">
              Örn: https://www.instagram.com/p/XXXXXXXXX/embed
            </Typography>
          </div>
        </DialogBody>

        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3">
          <Button
            variant="text"
            onClick={handleClose}
            className="w-full sm:w-auto"
          >
            Vazgeç
          </Button>
          <Button
            color="blue"
            onClick={handleSubmit}
            className="w-full sm:w-auto"
          >
            Kaydet
          </Button>
        </DialogFooter>
      </Dialog>

      {/* Silme onayı */}
      <ConfirmModal
        open={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteConfirmed}
        message="Bu gönderiyi silmek istediğinize emin misiniz?"
      />

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
