import { useState } from "react";
import "./Footer.css";
import Privacy from "../Policy/Privacy";

const Footer = () => {
  const [isPrivacyVisible, setIsPrivacyVisible] = useState(false);

  return (
    <>
      <footer className="footer">
        <div className="footer-content container">
          {/* Abone Ol */}
          <div className="footer-section subscribe">
            <h4 className="subscribe-title">
              Yeni Gelişmeler İçin Bültenimize Kaydolun
            </h4>
            <form className="subscribe-form">
              <input
                type="email"
                placeholder="Mail Adresinizi Giriniz."
                required
              />
              <button type="submit" className="subscribe-btn">
                Kaydol
              </button>
            </form>
            <p className="privacy-text">
              Kaydolarak&nbsp;
              <span
                className="footer-link"
                onClick={() => setIsPrivacyVisible(true)}
                style={{ cursor: "pointer", color: "#007bff" }}
              >
                Şartlar ve Koşullar
              </span>
              ,&nbsp;
              <span
                className="footer-link"
                onClick={() => setIsPrivacyVisible(true)}
                style={{ cursor: "pointer", color: "#007bff" }}
              >
                Gizlilik Politikamız
              </span>
              ’ı kabul ediyorum.
            </p>
          </div>

          {/* Site Haritası */}
          <div className="footer-section sitemap">
            <h4 className="sitemap-title">Site Haritası</h4>
            <ul className="sitemap-list">
              <li>
                <a href="/">Ana Sayfa</a>
              </li>
              <li>
                <a href="/shop">Mağaza</a>
              </li>
              <li>
                <a href="/blog">Blog</a>
              </li>
              <li>
                <a href="/contact">İletişim</a>
              </li>
              <li>
                <a href="/cart">Sepetim</a>
              </li>
              <li>
                <a href="/account">Hesabım</a>
              </li>
              <li>
                <a href="/login">Giriş Yap</a>
              </li>
              <li>
                <a href="/register">Kayıt Ol</a>
              </li>
            </ul>
          </div>

          {/* İletişim */}
          <div className="footer-section contact">
            <div className="contact-info">
              <h4 className="contact-title">Bize Ulaşın</h4>
              <p className="contact-phone">(+90) 123 456 78 90</p>
              <p className="contact-hours">Mesai: Pzt–Cum 9:00–18:00</p>
              <p className="contact-email">
                <strong>E-posta:</strong> info@example.com
              </p>
              <p className="contact-fax">
                <strong>Faks:</strong> (+800) 1234 5678 90
              </p>
            </div>
            <div className="footer-logo">
              <img src="/logo/logo.png" alt="Logo" />
            </div>
          </div>
        </div>
      </footer>

      {/* Modal */}
      <Privacy
        visible={isPrivacyVisible}
        onClose={() => setIsPrivacyVisible(false)}
      />
    </>
  );
};

export default Footer;
