// src/pages/Register.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { message, Modal } from "antd";
import "./Register.css";

const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/; // min 8 char, harf + rakam

const Register = () => {
  const navigate = useNavigate();
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  /* ---------------- STATE ---------------- */
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false); // spinner kontrolü

  /* ---------------- HANDLERS ---------------- */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    if (isSubmitting) return; // çift tıklama engeli
    if (!passwordRegex.test(formData.password))
      return message.error(
        "Şifre en az 8 karakter olmalı ve harf + rakam içermelidir."
      );
    if (formData.password !== formData.confirmPassword)
      return message.error("Şifreler birbirini tutmuyor.");

    try {
      setIsSubmitting(true); // spinner başlat
      /* 1) REGISTER */
      const regRes = await fetch(`${apiUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password,
        }),
      });
      const regData = await regRes.json();
      if (!regRes.ok) {
        setIsSubmitting(false);
        return message.error(regData.error || "Kayıt başarısız.");
      }

      /* 2) AUTO LOGIN */
      const loginRes = await fetch(`${apiUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });
      const loginData = await loginRes.json();
      if (!loginRes.ok) {
        setIsSubmitting(false);
        return message.error(loginData.error || "Otomatik giriş başarısız.");
      }

      /* 3) localStorage → Login.jsx ile aynı format */
      const { token, user } = loginData;
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      /* 4) MAIL VERIFY MODAL / REDIRECT */
      const finish = () => {
        navigate("/");
        window.location.reload();
      };
      if (!user.emailVerified) {
        Modal.warning({
          title: "E-posta Doğrulaması Gerekli",
          content:
            "Hesabınız oluşturuldu fakat e-posta adresiniz henüz doğrulanmadı. Lütfen e-postanızı kontrol edin.",
          okText: "Tamam",
          onOk: finish,
        });
      } else {
        message.success("Kayıt ve giriş başarılı.").then(finish);
      }
    } catch (err) {
      console.error("Register error:", err);
      message.error("Bir hata oluştu.");
      setIsSubmitting(false);
    }
  };

  /* ---------------- RENDER ---------------- */
  return (
    <div className="register-page mirror-layout">
      {/* Sağ taraf */}
      <div className="register-right mirror-visual">
        <div className="right-content">
          <h2>Birlikte büyüyoruz</h2>
          <p>Lorem ipsum dolor sit amet, consectetur adipisicing elit...</p>
        </div>
      </div>

      {/* Sol taraf */}
      <div className="register-left mirror-form">
        <div className="register-box">
          <div className="text-center">
            <img src="/logo/logo.png" alt="Logo" className="auth-logo" />
          </div>

          <form onSubmit={handleRegister}>
            {/* Kullanıcı adı */}
            <div className="form-group">
              <label htmlFor="username">Kullanıcı Adı</label>
              <input
                type="text"
                name="username"
                id="username"
                value={formData.username}
                onChange={handleInputChange}
                required
              />
            </div>

            {/* E-posta */}
            <div className="form-group">
              <label htmlFor="email">E-posta</label>
              <input
                type="email"
                name="email"
                id="email"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </div>

            {/* Şifre */}
            <div className="form-group">
              <label htmlFor="password">Şifre</label>
              <input
                type="password"
                name="password"
                id="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="En az 8 karakter, harf + rakam"
                required
              />
            </div>

            {/* Şifre tekrar */}
            <div className="form-group">
              <label htmlFor="confirmPassword">Şifre (Tekrar)</label>
              <input
                type="password"
                name="confirmPassword"
                id="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required
              />
            </div>

            {/* KAYIT OL → loading’li button */}
            <button type="submit" className="btn-login" disabled={isSubmitting}>
              {isSubmitting ? <span className="spinner"></span> : "KAYIT OL"}
            </button>
          </form>

          {/* Giriş linki */}
          <div className="login-prompt">
            <span>Zaten bir hesabınız var mı?</span>
            <button
              type="button"
              className="btn-login-alt"
              onClick={() => navigate("/login")}
            >
              GİRİŞ YAP
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
