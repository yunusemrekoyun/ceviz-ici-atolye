import { useState } from "react";
import PropTypes from "prop-types";
import { message } from "antd";
import { Link } from "react-router-dom";
import { EyeOutlined, EyeInvisibleOutlined } from "@ant-design/icons";
import { readError } from "../../config/api";

const MIN_PASSWORD_LENGTH = 6;

const Register = ({ onRegistered }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    if (formData.password.length < MIN_PASSWORD_LENGTH) {
      return message.error(
        `Şifre en az ${MIN_PASSWORD_LENGTH} karakter olmalıdır.`
      );
    }
    if (formData.password !== formData.confirmPassword) {
      return message.error("Şifreler eşleşmiyor.");
    }

    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password,
        }),
      });

      if (!response.ok) {
        return message.error(await readError(response, "Kayıt başarısız."));
      }

      message.success("Hesabınız oluşturuldu. Şimdi giriş yapabilirsiniz.");
      onRegistered?.(formData.email);
      setFormData({
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
      });
    } catch (error) {
      console.error("Register error:", error);
      message.error("Bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="auth-form account-column" onSubmit={handleRegister}>
      <div className="field">
        <label htmlFor="register-username">
          Ad soyad <span className="required">*</span>
        </label>
        <input
          id="register-username"
          type="text"
          onChange={handleInputChange}
          name="username"
          autoComplete="name"
          value={formData.username}
          required
        />
      </div>
      <div className="field">
        <label htmlFor="register-email">
          E-posta <span className="required">*</span>
        </label>
        <input
          id="register-email"
          type="email"
          onChange={handleInputChange}
          name="email"
          autoComplete="email"
          value={formData.email}
          required
        />
      </div>
      <div className="field">
        <label htmlFor="register-password">
          Şifre <span className="required">*</span>
        </label>
        <div className="password-container">
          <input
            id="register-password"
            type={showPassword ? "text" : "password"}
            onChange={handleInputChange}
            name="password"
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
            value={formData.password}
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
        <small className="field-hint">
          En az {MIN_PASSWORD_LENGTH} karakter
        </small>
      </div>
      <div className="field">
        <label htmlFor="register-confirm">
          Şifre tekrar <span className="required">*</span>
        </label>
        <div className="password-container">
          <input
            id="register-confirm"
            type={showConfirmPassword ? "text" : "password"}
            onChange={handleInputChange}
            name="confirmPassword"
            autoComplete="new-password"
            value={formData.confirmPassword}
            required
          />
          <button
            type="button"
            className="toggle-visibility"
            aria-label={
              showConfirmPassword ? "Şifreyi gizle" : "Şifreyi göster"
            }
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            {showConfirmPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
          </button>
        </div>
      </div>
      <p className="auth-legal">
        Kişisel verileriniz hesabınızı yönetmek ve{" "}
        <Link to="/policy#gizlilik">gizlilik politikamızda</Link> belirtilen
        amaçlar için kullanılır.
      </p>
      <button className="btn btn-primary btn-lg btn-block" disabled={loading}>
        {loading ? "Hesap oluşturuluyor…" : "Hesap oluştur"}
      </button>
    </form>
  );
};

Register.propTypes = {
  onRegistered: PropTypes.func,
};

export default Register;
