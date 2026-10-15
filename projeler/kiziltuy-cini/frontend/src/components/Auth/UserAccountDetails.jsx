// src/components/UserAccountDetails.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { message, Tabs } from "antd";
import imageCompression from "browser-image-compression";
import UserAccountFavProductItem from "../Products/UserAccountFavProductItem";

import "./UserAccountDetails.css";

const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/; // ↰ en az 8 karakter, harf + rakam

const UserAccountDetails = () => {
  const navigate = useNavigate();

  /* ---------------- STATE ---------------- */
  const [userData, setUserData] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    avatar: null,
  });

  // şifre değiştirme
  const [showPwdFields, setShowPwdFields] = useState(false);
  const [pwdData, setPwdData] = useState({
    current: "",
    next: "",
    confirm: "",
  });

  const [loading, setLoading] = useState(false);

  // Beğenilen bloglar
  const [likedBlogs, setLikedBlogs] = useState([]);
  const [loadingLikes, setLoadingLikes] = useState(true);

  // Doğrulama maili yeniden gönderme
  const [sendingMail, setSendingMail] = useState(false);

  /* ---------------- ENV ---------------- */
  const apiUrl = import.meta.env.VITE_API_BASE_URL;
  const storedUser = JSON.parse(localStorage.getItem("user"));
  const userId =
    storedUser?._id || storedUser?.id || storedUser?._userId || null;

  /* ---------------- EFFECTS ---------------- */
  // Giriş kontrolü
  useEffect(() => {
    if (!userId) navigate("/login", { replace: true });
  }, [userId, navigate]);

  // Kullanıcı + Beğenilen bloglar
  useEffect(() => {
    if (!userId) return;

    // user
    (async () => {
      try {
        const res = await fetch(`${apiUrl}/api/users/${userId}`);
        if (!res.ok) throw new Error("Fetch failed");
        const data = await res.json();
        setUserData(data);
        setFormData({
          username: data.username || "",
          email: data.email || "",
          avatar: null,
        });
        setEditMode(false);
      } catch (err) {
        console.error("❌ Kullanıcı bilgisi alınamadı:", err);
        message.error("Kullanıcı bilgileri alınamadı");
      }
    })();

    // liked blogs
    (async () => {
      try {
        const res = await fetch(`${apiUrl}/api/users/${userId}/likedBlogs`);
        if (!res.ok) throw new Error("Likes fetch failed");
        const list = await res.json();
        setLikedBlogs(list);
      } catch (err) {
        console.error("❌ Beğenilen bloglar alınamadı:", err);
        message.error("Beğenilen içerikler yüklenemedi");
      } finally {
        setLoadingLikes(false);
      }
    })();
  }, [apiUrl, userId]);

  /* ---------------- HANDLERS ---------------- */
  const handleResendVerification = async () => {
    setSendingMail(true);
    try {
      const res = await fetch(`${apiUrl}/api/auth/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userData.email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gönderim başarısız");
      message.success(data.message);
    } catch (err) {
      message.error(err.message);
    } finally {
      setSendingMail(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setEditMode(true);
  };

  const handleAvatarChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      avatar: e.target.files[0] || null,
    }));
    setEditMode(true);
  };

  const handlePwdField = (e) => {
    const { name, value } = e.target;
    setPwdData((prev) => ({ ...prev, [name]: value }));
    setEditMode(true);
  };

  const handleUpdate = async () => {
    // --- parola doğrulama ---
    if (showPwdFields) {
      if (!pwdData.current || !pwdData.next || !pwdData.confirm) {
        return message.error("Lütfen tüm şifre alanlarını doldur.");
      }
      if (!passwordRegex.test(pwdData.next)) {
        return message.error(
          "Yeni şifre en az 8 karakter olmalı ve harf + rakam içermelidir."
        );
      }
      if (pwdData.next !== pwdData.confirm) {
        return message.error("Yeni şifreler eşleşmiyor.");
      }
    }

    setLoading(true);
    try {
      const form = new FormData();
      form.append("username", formData.username);
      form.append("email", formData.email);

      // şifre alanları
      if (showPwdFields) {
        form.append("currentPassword", pwdData.current);
        form.append("password", pwdData.next);
      }

      // avatar
      if (formData.avatar) {
        const compressed = await imageCompression(formData.avatar, {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 512,
          useWebWorker: true,
        });
        form.append("avatar", compressed);
      }

      const res = await fetch(`${apiUrl}/api/users/${userId}`, {
        method: "PUT",
        body: form,
      });
      if (!res.ok) throw new Error("Update failed");

      const updated = await res.json();
      localStorage.setItem("user", JSON.stringify(updated));
      setUserData(updated);
      setEditMode(false);
      setShowPwdFields(false);
      setPwdData({ current: "", next: "", confirm: "" });
      message.success("Bilgiler güncellendi");
    } catch (err) {
      console.error("❌ Güncelleme hatası:", err);
      message.error("Güncelleme başarısız");
    } finally {
      setLoading(false);
    }
  };

  const removeFromFavorites = async (productId) => {
    try {
      const res = await fetch(
        `${apiUrl}/api/users/${userId}/favorites/${productId}`,
        { method: "POST" }
      );
      const data = await res.json();
      setUserData((prev) => ({
        ...prev,
        favorites: prev.favorites.filter((p) => p._id !== productId),
      }));
      localStorage.setItem(
        "user",
        JSON.stringify({ ...storedUser, favorites: data.favorites })
      );
    } catch {
      message.error("Favoriden kaldırılamadı.");
    }
  };

  const handleUnlike = async (blogIdToRemove) => {
    try {
      const res = await fetch(
        `${apiUrl}/api/users/${userId}/likedBlogs/${blogIdToRemove}`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error("Unlike failed");
      const { likedBlogs: newList } = await res.json();
      setLikedBlogs(newList);
      message.success("Beğeniden çıkarıldı");
    } catch (err) {
      console.error("❌ Beğeni kaldırma hatası:", err);
      message.error("Beğeniden çıkarılamadı");
    }
  };

  /* ---------------- RENDER ---------------- */
  if (!userId) return null;
  if (!userData) return <p>Yükleniyor...</p>;

  const items = [
    {
      key: "1",
      label: "Hesap Bilgileri",
      children: (
        <div className="user-account-details">
          <div className="user-account-header">
            {/* AVATAR */}
            <div className="user-avatar-large">
              <img
                src={`${apiUrl}/api/users/${userId}/image`}
                alt="Avatar"
                onError={(e) =>
                  (e.currentTarget.src = "/img/avatars/avatar1.jpg")
                }
              />
            </div>

            {/* FORM */}
            <div className="user-form-section">
              {/* KULLANICI ADI */}
              <div className="form-group">
                <label>Kullanıcı Adı</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                />
              </div>

              {/* EMAIL */}
              <div className="form-group">
                <label>Email Adresi</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>

              {/* E-posta doğrulama durumu */}
              {!userData.emailVerified && (
                <div className="verification-info">
                  <p className="verification-warning">
                    E-posta adresiniz henüz doğrulanmadı.
                  </p>
                  <button
                    className="resend-mail-button"
                    onClick={handleResendVerification}
                    disabled={sendingMail}
                  >
                    {sendingMail
                      ? "Gönderiliyor..."
                      : "Doğrulama Mailini Yeniden Gönder"}
                  </button>
                </div>
              )}

              {/* ŞİFRE DEĞİŞTİR BUTONU / ALANLARI */}
              {!showPwdFields ? (
                <button
                  className="password-toggle-button"
                  onClick={() => setShowPwdFields(true)}
                >
                  Şifre Değiştir
                </button>
              ) : (
                <>
                  <div className="form-group">
                    <label>Mevcut Şifre</label>
                    <input
                      type="password"
                      name="current"
                      value={pwdData.current}
                      onChange={handlePwdField}
                    />
                  </div>
                  <div className="form-group">
                    <label>Yeni Şifre</label>
                    <input
                      type="password"
                      name="next"
                      value={pwdData.next}
                      onChange={handlePwdField}
                      placeholder="En az 8 karakter, harf + rakam"
                    />
                  </div>
                  <div className="form-group">
                    <label>Yeni Şifre (Tekrar)</label>
                    <input
                      type="password"
                      name="confirm"
                      value={pwdData.confirm}
                      onChange={handlePwdField}
                    />
                  </div>
                </>
              )}

              {/* AVATAR */}
              <div className="form-group">
                <label>Profil Fotoğrafı</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                />
              </div>

              {/* UYARI */}
              {editMode && (
                <p className="edit-warning">
                  Değişiklik yapıldı. Lütfen kaydedin.
                </p>
              )}

              {/* KAYDET */}
              <button
                className="update-button"
                onClick={handleUpdate}
                disabled={loading || !editMode}
              >
                {loading ? "Güncelleniyor..." : "Kaydet"}
              </button>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "2",
      label: "Favori Ürünler",
      children: (
        <div className="fav-products-grid">
          {userData.favorites.map((p) => (
            <UserAccountFavProductItem
              key={p._id}
              product={p}
              onRemove={removeFromFavorites}
            />
          ))}
        </div>
      ),
    },
    {
      key: "3",
      label: "Beğenilen İçerikler",
      children: (
        <div className="liked-blogs-section">
          {loadingLikes ? (
            <p>Yükleniyor...</p>
          ) : likedBlogs.length ? (
            likedBlogs.map((b) => (
              <div key={b.blogId} className="liked-blog-card">
                <div
                  className="liked-blog-image"
                  style={{
                    backgroundImage: `url(${
                      b.coverImage || "/img/default-blog.jpg"
                    })`,
                  }}
                />
                <div className="liked-blog-content">
                  <div
                    className="liked-blog-title"
                    onClick={() => navigate(`/blogs/${b.blogId}`)}
                  >
                    {b.title}
                  </div>
                </div>
                <button
                  className="liked-blog-button"
                  onClick={() => handleUnlike(b.blogId)}
                >
                  Beğeniden Çıkar
                </button>
              </div>
            ))
          ) : (
            <p>Henüz beğendiğin bir blog yok.</p>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="user-account-wrapper">
      <Tabs defaultActiveKey="1" centered items={items} />
    </div>
  );
};

export default UserAccountDetails;
