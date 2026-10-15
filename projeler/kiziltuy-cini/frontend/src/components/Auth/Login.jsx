import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { message, Modal, Spin } from "antd";
import "./Login.css";

const Login = () => {
  const navigate = useNavigate();
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  /* ---------------- STATE ---------------- */
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false); // ↰ spinner

  /* ---------------- HANDLERS ---------------- */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Giriş başarısız");

      const { token, user } = data;
      const { emailVerified } = user; // ✔️ doğru alan

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      const redirectUser = () => {
        if (user.role === "admin") window.location.href = "/admin";
        else {
          navigate("/");
          window.location.reload();
        }
      };

      if (!emailVerified) {
        Modal.warning({
          title: "E-posta Doğrulaması Gerekli",
          content:
            "E-posta adresiniz henüz doğrulanmamış. Lütfen gelen kutunuzu kontrol edin.",
          okText: "Tamam",
          onOk: redirectUser, // ↰ Tamam’a basınca yine yönlendir
        });
      } else {
        message.success("Giriş başarılı.");
        redirectUser();
      }
    } catch (err) {
      console.error("Login error:", err);
      message.error(err.message || "Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- RENDER ---------------- */
  return (
    <div className="login-page">
      {/* Spinner overlay */}
      {loading && (
        <div className="login-spinner">
          <Spin size="large" />
        </div>
      )}

      <div className="login-left">
        <div className="login-box">
          <div className="text-center">
            <img src="/logo/logo.png" alt="Logo" className="auth-logo" />
          </div>

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label htmlFor="email">E-posta</label>
              <input
                type="email"
                name="email"
                id="email"
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Şifre</label>
              <input
                type="password"
                name="password"
                id="password"
                onChange={handleInputChange}
                required
              />
            </div>

            <button type="submit" className="btn-login">
              GİRİŞ YAP
            </button>

            <a href="/forgot-password" className="forgot-link">
              Şifrenizi mi unuttunuz?
            </a>
          </form>

          <div className="register-prompt">
            <span>Hesabınız yok mu?</span>
            <button
              type="button"
              className="btn-register"
              onClick={() => navigate("/register")}
            >
              KAYIT OL
            </button>
          </div>
        </div>
      </div>

      {/* Sağ görsel kısım */}
      <div className="login-right login-visual">
        <div className="right-content">
          <h2>Sizi yeniden görmek harika!</h2>
          <p>Kişisel hesap deneyiminize devam etmek için giriş yapın.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
