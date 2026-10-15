import React, { useEffect, useRef, useState } from "react";
import { FaCamera } from "react-icons/fa";
import api from "../../../api";
import defaultAvatar from "../../assets/user/fallback-avatar.webp";
import {
  mediaErrorMessage,
  startMediaPreparation,
  uploadMediaFile,
  validateMediaFile,
} from "../../services/mediaUpload";

// Hesap sayfasının üstü: profil fotoğrafı (dokununca değiştirilir), ad ve e-posta.
export default function AccountHeader({ user, profilePic, onPictureChange }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmRemove, setConfirmRemove] = useState(false);

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(""), 3000);
    return () => clearTimeout(t);
  }, [notice]);

  const pick = (event) => {
    const selected = event.target.files?.[0];
    event.target.value = "";
    if (!selected) return;
    setError("");
    setNotice("");
    setConfirmRemove(false);
    try {
      validateMediaFile(selected, "profile_image");
      startMediaPreparation(selected, "profile_image");
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
    } catch (uploadError) {
      setError(mediaErrorMessage(uploadError));
    }
  };

  const cancel = () => {
    setFile(null);
    setPreview("");
  };

  const save = async () => {
    setBusy(true);
    setError("");
    try {
      const asset = await uploadMediaFile(file, "profile_image");
      const { data } = await api.post("/profile-pictures", { mediaAssetId: asset.id });
      onPictureChange(data);
      cancel();
      setNotice("Profil fotoğrafı güncellendi.");
    } catch (err) {
      setError(mediaErrorMessage(err, err.response?.data?.message || "Fotoğraf yüklenemedi."));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setError("");
    try {
      await api.delete("/profile-pictures");
      onPictureChange(null);
      setConfirmRemove(false);
      setNotice("Profil fotoğrafı kaldırıldı.");
    } catch (err) {
      setError(err.response?.data?.message || "Fotoğraf kaldırılamadı.");
    } finally {
      setBusy(false);
    }
  };

  const fullName = user ? [user.firstName, user.lastName].filter(Boolean).join(" ") : "";

  return (
    <header>
      <div className="flex items-center gap-4 sm:gap-5">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          aria-label={profilePic?.url ? "Profil fotoğrafını değiştir" : "Profil fotoğrafı ekle"}
          className="relative shrink-0 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-dark1"
        >
          <img
            src={preview || profilePic?.url || defaultAvatar}
            alt=""
            className="h-[72px] w-[72px] rounded-full object-cover shadow-md ring-4 ring-white sm:h-24 sm:w-24"
          />
          <span className="absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-dark1 text-white ring-2 ring-white sm:h-8 sm:w-8">
            <FaCamera className="text-[11px]" />
          </span>
        </button>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={pick} />

        <div className="min-w-0">
          <p className="text-sm text-dark2">Merhaba,</p>
          {user ? (
            <h1 className="truncate text-2xl font-bold leading-tight text-dark1 sm:text-3xl">{fullName}</h1>
          ) : (
            <div className="mt-1 h-7 w-40 animate-pulse rounded bg-light2" />
          )}
          {user?.email && <p className="mt-0.5 truncate text-sm text-dark2">{user.email}</p>}
          {!file && profilePic?.url && !confirmRemove && (
            <button
              type="button"
              onClick={() => setConfirmRemove(true)}
              className="mt-1 text-xs font-medium text-dark2 underline underline-offset-2 hover:text-dark1"
            >
              Fotoğrafı kaldır
            </button>
          )}
        </div>
      </div>

      {(file || confirmRemove) && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-black/5">
          <p className="text-sm text-dark1">
            {file ? "Yeni fotoğraf seçildi." : "Profil fotoğrafı kaldırılsın mı?"}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={file ? cancel : () => setConfirmRemove(false)}
              disabled={busy}
              className="rounded-full px-4 py-2 text-sm font-medium text-dark1 ring-1 ring-light2 hover:bg-light1 disabled:opacity-50"
            >
              Vazgeç
            </button>
            <button
              type="button"
              onClick={file ? save : remove}
              disabled={busy}
              className={`rounded-full px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${
                file ? "bg-dark1 hover:bg-dark2" : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {busy ? "Bekleyin…" : file ? "Kaydet" : "Kaldır"}
            </button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="mt-3 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">
          {notice}
        </p>
      )}
    </header>
  );
}
