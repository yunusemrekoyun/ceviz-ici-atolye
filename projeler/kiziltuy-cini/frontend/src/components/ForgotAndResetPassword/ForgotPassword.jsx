import { useState } from "react";
import { Input, Button, message } from "antd";
import "./ForgotReset.css";

const apiUrl = import.meta.env.VITE_API_BASE_URL;

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleForgotPassword = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "İşlem başarısız.");

      message.success(
        "Şifre sıfırlama bağlantısı e-posta adresinize gönderildi."
      );
    } catch (err) {
      message.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-reset-wrapper">
      <h2>Şifremi Unuttum</h2>
      <Input
        placeholder="E-posta adresiniz"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ marginBottom: "1rem" }}
      />
      <Button type="primary" onClick={handleForgotPassword} loading={loading}>
        Şifre Sıfırlama Bağlantısı Gönder
      </Button>
    </div>
  );
};

export default ForgotPassword;
