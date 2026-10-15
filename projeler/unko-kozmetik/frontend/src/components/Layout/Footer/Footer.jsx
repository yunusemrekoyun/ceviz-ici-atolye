import { Link } from "react-router-dom";
import Policy from "../Policy/Policy";
import useCategories from "../../../hooks/useCategories";
import "./Footer.css";

const Footer = () => {
  const { categories } = useCategories();
  // Menü gruplarının ilk kategorisi footer'da kısayol olarak listelenir
  const groups = [...new Set(categories.map((c) => c.group).filter(Boolean))];

  return (
    <>
      <Policy />
      <footer className="footer">
        <div className="container footer-grid">
          <div className="footer-brand">
            <Link to="/" className="logo">
              ÜnKo<span>Kozmetik</span>
            </Link>
            <p>
              Profesyonel saç ve cilt bakımında güvendiğiniz markalar, Eryaman
              mağazamızda ve online.
            </p>
          </div>

          <nav className="footer-col" aria-label="Mağaza">
            <h4>Mağaza</h4>
            <ul>
              <li>
                <Link to="/shop">Tüm ürünler</Link>
              </li>
              {groups.map((group) => (
                <li key={group}>
                  <Link to={`/shop?group=${encodeURIComponent(group)}`}>
                    {group}
                  </Link>
                </li>
              ))}
              <li>
                <Link to="/shop?discounted=true">İndirimdekiler</Link>
              </li>
            </ul>
          </nav>

          <nav className="footer-col" aria-label="Kurumsal">
            <h4>Kurumsal</h4>
            <ul>
              <li>
                <Link to="/blog">Hakkımızda</Link>
              </li>
              <li>
                <Link to="/contact">İletişim</Link>
              </li>
              <li>
                <Link to="/account">Hesabım</Link>
              </li>
              <li>
                <Link to="/cart">Sepetim</Link>
              </li>
            </ul>
          </nav>

          <div className="footer-col footer-contact">
            <h4>Bize ulaşın</h4>
            <address>
              Eryaman, 2. Cd. AVM Eryaman D:11/9
              <br />
              06824 Etimesgut / Ankara
            </address>
            <a href="tel:+905525395910">+90 552 539 59 10</a>
            <a href="mailto:info@ünkokozmetik.com">info@ünkokozmetik.com</a>
            <span className="footer-hours">Pzt – Cmt · 09.00 – 18.00</span>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="container footer-bottom-inner">
            <p>
              © {new Date().getFullYear()} ÜnKo Kozmetik. Tüm hakları saklıdır.
            </p>
            <img
              src="/img/footer/cards.png"
              alt="Visa, Mastercard ve diğer kabul edilen ödeme yöntemleri"
              className="footer-cards"
            />
            <ul className="footer-legal">
              <li>
                <Link to="/policy#gizlilik">Gizlilik</Link>
              </li>
              <li>
                <Link to="/policy#kosullar">Şartlar ve koşullar</Link>
              </li>
              <li>
                <Link to="/policy#iade">İade politikası</Link>
              </li>
            </ul>
          </div>
        </div>
      </footer>
    </>
  );
};

export default Footer;
