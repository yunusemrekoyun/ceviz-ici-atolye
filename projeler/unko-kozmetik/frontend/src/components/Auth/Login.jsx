/********************************************************
 * frontend/src/components/Auth/Login.jsx
 ********************************************************/
import PropTypes from "prop-types";
import { message } from "antd";
import { useState } from "react";
import { EyeOutlined, EyeInvisibleOutlined } from "@ant-design/icons";
import { useLocation, useNavigate } from "react-router-dom";
import { readError } from "../../config/api";
import { safeRedirectPath, saveSession } from "../../utils/auth";

const Login = ({ defaultEmail = "" }) => {
  const [formData, setFormData] = useState({
    email: defaultEmail,
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        return message.error(
          await readError(response, "E-posta veya şifre hatalı.")
        );
      }

      const data = await response.json();
      saveSession(data);

      if (data.role === "admin") {
        message.success("Admin girişi başarılı!");
        navigate("/admin");
      } else {
        message.success("Giriş başarılı!");
        // Örn. sepetten giriş sayfasına gelindiyse sepete geri dön
        navigate(safeRedirectPath(location.state?.from) || "/");
      }
    } catch (error) {
      console.error("Login error:", error);
      message.error("Bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="auth-form account-column" onSubmit={handleLogin}>
      <div className="field">
        <label htmlFor="login-email">
          E-posta <span className="required">*</span>
        </label>
        <input
          id="login-email"
          type="email"
          name="email"
          autoComplete="email"
          value={formData.email}
          onChange={handleInputChange}
          required
        />
      </div>
      <div className="field">
        <label htmlFor="login-password">
          Şifre <span className="required">*</span>
        </label>
        <div className="password-container">
          <input
            id="login-password"
            type={showPassword ? "text" : "password"}
            name="password"
            autoComplete="current-password"
            value={formData.password}
            onChange={handleInputChange}
            required
          />
          <button
            type="button"
            className="toggle-visibility"
            aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
          </button>
        </div>
      </div>
      <button className="btn btn-primary btn-lg btn-block" disabled={loading}>
        {loading ? "Giriş yapılıyor…" : "Giriş yap"}
      </button>
    </form>
  );
};

Login.propTypes = {
  defaultEmail: PropTypes.string,
};

export default Login;
