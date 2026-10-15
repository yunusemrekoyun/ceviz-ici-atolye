import React, { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api";
import { AuthContext } from "../../context/AuthContext";
import { clearCheckout } from "../../utils/checkoutSession";
import { accountInputClass } from "./accountStyles";

// KVKK: müşteri hesabını ve hesaba bağlı kişisel verilerini kendisi silebilir.
export default function DeleteAccountForm({ onCancel }) {
  const navigate = useNavigate();
  const { setIsLoggedIn } = useContext(AuthContext);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!confirm) {
      setError("Onay kutusunu işaretleyin.");
      return;
    }
    setLoading(true);
    try {
      await api.delete("/users/me", { data: { password, confirm: true }, skipAuthRefresh: true });
      localStorage.removeItem("accessToken");
      clearCheckout();
      setIsLoggedIn(false);
      navigate("/", { replace: true, state: { accountDeleted: true } });
    } catch (err) {
      setError(err?.response?.data?.message || "Hesap silinemedi. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm leading-6 text-dark2">
        Hesabınız, adresleriniz, profil fotoğrafınız, yorumlarınız ve bülten kaydınız silinir.
        Verdiğiniz siparişlerin kayıtları yasal saklama süresi boyunca tutulur. Bu işlem geri alınamaz.
      </p>
      <div>
        <label htmlFor="delete-password" className="mb-1.5 block text-xs font-medium text-dark2">
          Şifreniz
        </label>
        <input
          id="delete-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className={accountInputClass}
        />
      </div>
      <label className="flex items-start gap-2.5 text-sm text-dark1">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 accent-red-600"
          checked={confirm}
          onChange={(e) => setConfirm(e.target.checked)}
        />
        <span>Hesabımın ve kişisel verilerimin kalıcı olarak silineceğini anladım.</span>
      </label>
      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => {
            setPassword("");
            setConfirm(false);
            setError("");
            onCancel?.();
          }}
          className="rounded-full px-5 py-2.5 text-sm font-medium text-dark1 ring-1 ring-light2 hover:bg-light1"
        >
          Vazgeç
        </button>
        <button
          type="submit"
          disabled={loading}
          className="rounded-full bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
        >
          {loading ? "Siliniyor…" : "Hesabımı kalıcı olarak sil"}
        </button>
      </div>
    </form>
  );
}
