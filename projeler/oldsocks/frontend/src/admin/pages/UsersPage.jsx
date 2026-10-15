// src/pages/admin/UsersPage.jsx
import React, { useState, useEffect } from "react";
import api from "../../../api";
import {
  Card,
  CardHeader,
  CardBody,
  Typography,
  Dialog,
  DialogBody,
  DialogFooter,
  Button,
} from "@material-tailwind/react";
import { XMarkIcon, TrashIcon } from "@heroicons/react/24/solid";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import ToastAlert from "../../components/ui/ToastAlert";

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [open, setOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    // Admin-only /api/v1/users
    api
      .get("/users")
      .then((res) => setUsers(res.data))
      .catch((err) => console.error(err));
  }, []);

  const handleOpen = (user) => {
    setSelected(user);
    setOpen(true);
  };
  const handleClose = () => {
    setOpen(false);
    setSelected(null);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/users/${selected._id}`);
      setUsers((list) => list.filter((u) => u._id !== selected._id));
      setConfirmDelete(false);
      handleClose();
      setToast({ type: "success", msg: "Kullanıcı silindi." });
    } catch (err) {
      setConfirmDelete(false);
      setToast({
        type: "error",
        msg: err?.response?.data?.message || "Kullanıcı silinemedi.",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Typography variant="h4">Kullanıcı Yönetimi</Typography>

      {/* Grid of user cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {users.map((u) => (
          <Card
            key={u._id}
            className="cursor-pointer hover:shadow-lg transition"
            onClick={() => handleOpen(u)}
          >
            <CardHeader
              floated={false}
              shadow={false}
              className="h-16 flex items-center bg-blue-gray-50"
            >
              <Typography variant="h6">
                {u.firstName} {u.lastName}
              </Typography>
            </CardHeader>
            <CardBody className="pt-2">
              <Typography className="text-sm text-gray-600">
                {u.email}
              </Typography>
              <Typography
                variant="small"
                className={`mt-2 inline-block ${
                  u.role === "admin" ? "text-red-600" : "text-green-600"
                }`}
              >
                {u.role.toUpperCase()}
              </Typography>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Detail dialog */}
      <Dialog open={open} size="lg" handler={handleClose}>
        <div className="flex justify-between items-center px-6 pt-4">
          <Typography variant="h5">
            {selected?.firstName} {selected?.lastName}
          </Typography>
          <XMarkIcon className="w-6 h-6 cursor-pointer" onClick={handleClose} />
        </div>
        <DialogBody divider>
          {selected && (
            <div className="space-y-3">
              <Typography>
                <strong>Email:</strong> {selected.email}
              </Typography>
              <Typography>
                <strong>Telefon:</strong> {selected.phone || "-"}
              </Typography>
              <Typography>
                <strong>Rol:</strong> {selected.role}
              </Typography>
              <Typography>
                <strong>Adres:</strong>{" "}
                {selected.address
                  ? `${selected.address.street}, ${selected.address.city}`
                  : "-"}
              </Typography>
              <Typography>
                <strong>Oluşturulma Tarihi:</strong>{" "}
                {new Date(selected.createdAt).toLocaleString()}
              </Typography>
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button
            variant="text"
            color="red"
            className="flex items-center gap-2"
            onClick={() => setConfirmDelete(true)}
          >
            <TrashIcon className="w-5 h-5" /> Sil
          </Button>
          <Button variant="gradient" onClick={handleClose}>
            Kapat
          </Button>
        </DialogFooter>
      </Dialog>

      <ConfirmDialog
        open={confirmDelete}
        title="Kullanıcıyı sil"
        message={`${selected?.firstName || ""} ${selected?.lastName || ""} (${selected?.email || ""}) kalıcı olarak silinecek. Bu işlem geri alınamaz.`}
        confirmLabel="Kalıcı olarak sil"
        tone="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />

      {toast && <ToastAlert msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
