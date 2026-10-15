// src/components/Auth/VerifyEmail.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { message, Spin } from "antd";

const VerifyEmail = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const apiUrl = import.meta.env.VITE_API_BASE_URL;
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verify = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/auth/verify/${token}`);
        if (!res.ok) throw new Error("Doğrulama başarısız.");

        message.success("E-posta doğrulandı. Giriş yapabilirsiniz.");
        navigate("/login");
      } catch (err) {
        message.error("Doğrulama bağlantısı geçersiz ya da süresi dolmuş.");
        navigate("/register");
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [token, apiUrl, navigate]);

  return (
    <div style={{ textAlign: "center", marginTop: "100px" }}>
      {loading ? <Spin size="large" /> : null}
    </div>
  );
};

export default VerifyEmail;
