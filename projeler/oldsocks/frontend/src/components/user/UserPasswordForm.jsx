import React, { useContext, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api";
import { AuthContext } from "../../context/AuthContext";
import { getPasswordValidation } from "../../utils/passwordRules";
import { accountInputClass } from "./accountStyles";

export default function UserPasswordForm() {
  const navigate = useNavigate();
  const { setIsLoggedIn } = useContext(AuthContext);

  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const passwordValidation = useMemo(
    () => getPasswordValidation(form.newPassword || ""),
    [form.newPassword]
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (form.newPassword !== form.confirmPassword) {
      setError("Yeni şifre alanları eşleşmiyor.");
      return;
    }

    if (!passwordValidation.allOk) {
      setError("Yeni şifre güvenlik kurallarını sağlamıyor.");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/users/me/password", {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });

      setSuccess(
        data?.message || "Şifreniz güncellendi. Lütfen tekrar giriş yapın."
      );
      setForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      setTimeout(() => {
        localStorage.removeItem("accessToken");
        setIsLoggedIn(false);
        navigate("/auth", { replace: true });
      }, 900);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Şifre güncellenemedi. Lütfen tekrar deneyin."
      );
    } finally {
      setLoading(false);
    }
  };

  const field = (name, label, autoComplete) => (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-xs font-medium text-dark2">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={showPasswords ? "text" : "password"}
        autoComplete={autoComplete}
        value={form[name]}
        onChange={handleChange}
        required
        className={accountInputClass}
      />
    </div>
  );

  return (
    <div>
      {success && (
        <div className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{success}</div>
      )}
      {error && <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        {field("currentPassword", "Mevcut şifre", "current-password")}
        <div>
          {field("newPassword", "Yeni şifre", "new-password")}
          <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            {passwordValidation.results.map((rule) => (
              <li key={rule.id} className={rule.ok ? "text-emerald-600" : "text-gray-500"}>
                {rule.ok ? "✓ " : "• "} {rule.label}
              </li>
            ))}
          </ul>
        </div>
        {field("confirmPassword", "Yeni şifre (tekrar)", "new-password")}

        <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => setShowPasswords((prev) => !prev)}
            className="self-start text-sm font-medium text-dark2 underline underline-offset-2 hover:text-dark1"
          >
            {showPasswords ? "Şifreleri gizle" : "Şifreleri göster"}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-dark1 py-3 font-semibold text-white transition hover:bg-dark2 disabled:opacity-50 sm:w-auto sm:px-8"
          >
            {loading ? "Güncelleniyor..." : "Şifreyi Değiştir"}
          </button>
        </div>
      </form>
    </div>
  );
}
