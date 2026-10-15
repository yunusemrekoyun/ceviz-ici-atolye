import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Modal } from "antd";
import Search from "../../Modals/Search/Search";
import "./Header.css";

const { confirm } = Modal;

const Header = () => {
  /* ---------- 1) USER STATE & STORAGE SYNC ---------- */
  const [user, setUser] = useState(() =>
    JSON.parse(localStorage.getItem("user"))
  );

  /* localStorage değiştiğinde (diğer sekme vs.) */
  useEffect(() => {
    const sync = () => setUser(JSON.parse(localStorage.getItem("user")));
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  /* ---------- 2) MOBİL EKRAN TAKİBİ ---------- */
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  /* ---------- 3) UI ---------- */
  return (
    <header>
      <div className="header-top">
        <div className="container header-wrapper">
          {/* Logo */}
          <div className="header-left">
            <Link to="/" className="logo">
              <img src="/logo/logo.png" alt="Site Logo" className="site-logo" />
            </Link>
          </div>

          {/* Masaüstü arama */}
          {!isMobile && (
            <div className="header-center">
              <Search />
            </div>
          )}

          {/* Sağ kısım */}
          <div className="header-right">
            {/* Mobil arama ikonu */}
            {isMobile && (
              <div
                className="mobile-search-icon"
                onClick={() => setShowMobileSearch((p) => !p)}
              >
                <i className="bi bi-search"></i>
              </div>
            )}

            {/* ------ Giriş yapmamış ------ */}
            {!user ? (
              <>
                <Link to="/login" className="header-icon">
                  <i className="bi bi-person"></i>
                  <span>Üye Girişi</span>
                </Link>
                <Link to="/register" className="header-icon">
                  <i className="bi bi-person-plus"></i>
                  <span>Üye Ol</span>
                </Link>
              </>
            ) : (
              /* ------ Giriş yapmış ------ */
              <>
                <Link to="/account" className="header-icon user-info">
                  <i className="bi bi-person-circle"></i>
                  <span>{user.username}</span>
                </Link>
                <Link
                  to="/"
                  className="header-icon"
                  onClick={(e) => {
                    e.preventDefault();
                    confirm({
                      title: "Çıkış Yap",
                      content: "Çıkış yapmak istediğinize emin misiniz?",
                      okText: "Evet",
                      cancelText: "Hayır",
                      onOk() {
                        localStorage.removeItem("user");
                        localStorage.removeItem("token");
                        setUser(null); // aynı sekmede anında güncelle
                        window.location.href = "/";
                      },
                    });
                  }}
                >
                  <i className="bi bi-box-arrow-right"></i>
                  <span>Çıkış</span>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Mobil tam-genişlik arama kutusu */}
        {isMobile && (
          <div
            className={`mobile-search-area ${showMobileSearch ? "show" : ""}`}
          >
            <Search />
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
