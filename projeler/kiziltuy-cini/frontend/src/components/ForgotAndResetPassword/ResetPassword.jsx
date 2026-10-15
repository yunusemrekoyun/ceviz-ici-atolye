import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Input, Button, Modal, message } from "antd";
import "./ForgotReset.css";

const apiUrl = import.meta.env.VITE_API_BASE_URL;

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const isPasswordValid = (pw) =>
    pw.length >= 8 && /[a-zA-Z]/.test(pw) && /\d/.test(pw);

  const handleResetPassword = async () => {
    if (password !== confirmPassword) {
      return message.warning("Şifreler eşleşmiyor.");
    }
    if (!isPasswordValid(password)) {
      return message.warning(
        "Şifreniz en az 8 karakter olmalı, harf ve rakam içermelidir."
      );
    }

    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/auth/reset-password/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Şifre sıfırlama başarısız.");

      setModalVisible(true);
    } catch (err) {
      message.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOk = () => {
    setModalVisible(false);
    navigate("/login");
  };

  return (
    <div className="forgot-reset-wrapper">
      <h2>Yeni Şifre Belirle</h2>
      <Input.Password
        placeholder="Yeni şifre"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ marginBottom: "1rem" }}
      />
      <Input.Password
        placeholder="Yeni şifre (tekrar)"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        style={{ marginBottom: "1rem" }}
      />
      <Button type="primary" onClick={handleResetPassword} loading={loading}>
        Şifreyi Güncelle
      </Button>

      <Modal
        title="Şifre Güncellendi"
        open={modalVisible}
        onOk={handleOk}
        onCancel={handleOk}
        okText="Giriş Yap"
        cancelText="Kapat"
      >
        <p>
          Şifreniz başarıyla değiştirildi. Giriş sayfasına yönlendirileceksiniz.
        </p>
      </Modal>
    </div>
  );
};

export default ResetPassword;
