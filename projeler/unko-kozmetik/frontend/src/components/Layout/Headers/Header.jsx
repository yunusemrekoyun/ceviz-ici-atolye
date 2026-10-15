/********************************************************
 * frontend/src/components/Layout/Headers/Header.jsx
 ********************************************************/
import { useContext, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Modal } from "antd";
import CartContext from "../../../context/CartContext";
import useCategories from "../../../hooks/useCategories";
import { getToken, logout } from "../../../utils/auth";
import { slugify } from "../../../utils/slugify";
import "./Header.css";

const { confirm } = Modal;

const NAV_LINKS = [
  { to: "/blog", label: "Hakkımızda" },
  { to: "/contact", label: "İletişim" },
];

const Header = ({ setIsSearchShow }) => {
  const { cartItems } = useContext(CartContext);
  const { pathname } = useLocation();
  const { categories } = useCategories();
  const token = getToken();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Kategoriler admin panelinde girilen "menü grubu"na göre, eklenme sırasıyla listelenir
  const menuGroups = useMemo(() => {
    const groups = new Map();
    const byCreation = [...categories].sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    );
    byCreation.forEach((cat) => {
      const group = cat.group?.trim() || "Diğer";
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group).push(cat);
    });
    return [...groups.entries()];
  }, [categories]);

  // Sayfa değişince menüleri kapat
  useEffect(() => {
    setIsMenuOpen(false);
    setIsDropdownOpen(false);
  }, [pathname]);

  // Mobil menü açıkken sayfa kaymasın
  useEffect(() => {
    document.body.style.overflow = isMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  const closeMenus = () => {
    setIsDropdownOpen(false);
    setIsMenuOpen(false);
  };

  const showLogoutConfirm = () => {
    confirm({
      title: "Çıkış yap",
      content: "Hesabınızdan çıkış yapmak istediğinize emin misiniz?",
      okText: "Evet",
      cancelText: "Hayır",
      onOk: async () => {
        await logout();
        window.location.href = "/";
      },
    });
  };

  const totalItems = cartItems.reduce(
    (total, item) => total + (item.quantity || 1),
    0
  );

  const categoryLinks = (onClick) =>
    menuGroups.map(([group, cats]) => (
      <div className="megamenu-products" key={group}>
        <h3 className="megamenu-products-title">{group}</h3>
        <ul className="megamenu-menu-list">
          {cats.map((cat) => (
            <li key={cat._id}>
              <Link to={`/shop/${slugify(cat.name)}`} onClick={onClick}>
                {cat.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    ));

  return (
    <header className="site-header">
      <div className="announcement">
        <p>
          1750 ₺ ve üzeri siparişlerde kargo ücretsiz
          <span aria-hidden="true"> · </span>
          <Link to="/shop?discounted=true">İndirimli ürünleri gör</Link>
        </p>
      </div>

      <div className="header-bar">
        <div className="container header-inner">
          <button
            type="button"
            className="icon-btn header-menu-btn"
            id="btn-menu"
            aria-label="Menüyü aç"
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen(true)}
          >
            <i className="bi bi-list" />
          </button>

          <Link to="/" className="logo" aria-label="ÜnKo Kozmetik ana sayfa">
            ÜnKo<span>Kozmetik</span>
          </Link>

          <nav
            className={`header-nav ${isMenuOpen ? "open" : ""}`}
            aria-label="Ana menü"
          >
            <div className="drawer-head">
              <span className="logo">
                ÜnKo<span>Kozmetik</span>
              </span>
              <button
                type="button"
                className="icon-btn"
                id="close-sidebar"
                aria-label="Menüyü kapat"
                onClick={() => setIsMenuOpen(false)}
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <ul className="menu-list">
              <li>
                <NavLink to="/" end className="menu-link">
                  Ana sayfa
                </NavLink>
              </li>
              <li
                className="megamenu-wrapper"
                onMouseEnter={() => setIsDropdownOpen(true)}
                onMouseLeave={() => setIsDropdownOpen(false)}
              >
                <NavLink to="/shop" className="menu-link" onClick={closeMenus}>
                  Mağaza
                  <i className="bi bi-chevron-down" aria-hidden="true" />
                </NavLink>
                {isDropdownOpen && menuGroups.length > 0 && (
                  <div className="megamenu">
                    <div className="megamenu-links">
                      {categoryLinks(closeMenus)}
                    </div>
                    <Link
                      to="/shop?discounted=true"
                      className="megamenu-promo"
                      onClick={closeMenus}
                    >
                      <img
                        src="/img/site/tile-hair.jpg"
                        alt=""
                        loading="lazy"
                      />
                      <span className="eyebrow">Fırsatlar</span>
                      <strong>İndirimli ürünleri keşfedin</strong>
                    </Link>
                  </div>
                )}
              </li>
              {NAV_LINKS.map((link) => (
                <li key={link.to}>
                  <NavLink to={link.to} className="menu-link">
                    {link.label}
                  </NavLink>
                </li>
              ))}
              <li className="drawer-only">
                <NavLink
                  to={token ? "/account" : "/auth"}
                  className="menu-link"
                >
                  {token ? "Hesabım" : "Giriş yap / Kayıt ol"}
                </NavLink>
              </li>
            </ul>

            {/* Mobil çekmecede kategoriler doğrudan listelenir */}
            <div className="drawer-categories">
              {categoryLinks(() => setIsMenuOpen(false))}
            </div>
          </nav>

          <div className="header-actions">
            <button
              type="button"
              className="icon-btn search-button"
              aria-label="Ürün ara"
              onClick={() => setIsSearchShow(true)}
            >
              <i className="bi bi-search" />
            </button>
            <Link
              to={token ? "/account" : "/auth"}
              className="icon-btn header-account"
              aria-label={token ? "Hesabım" : "Giriş yap"}
            >
              <i className="bi bi-person" />
            </Link>
            <Link
              to="/cart"
              className="icon-btn header-cart-link"
              aria-label={`Sepet, ${totalItems} ürün`}
            >
              <i className="bi bi-bag" />
              <span
                className={`header-cart-count ${totalItems ? "" : "is-empty"}`}
              >
                {totalItems}
              </span>
            </Link>
            {token && (
              <button
                type="button"
                className="icon-btn exit-button"
                onClick={showLogoutConfirm}
                aria-label="Çıkış yap"
              >
                <i className="bi bi-box-arrow-right" />
              </button>
            )}
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <div
          className="drawer-overlay"
          onClick={() => setIsMenuOpen(false)}
          aria-hidden="true"
        />
      )}
    </header>
  );
};

Header.propTypes = {
  setIsSearchShow: PropTypes.func,
};

export default Header;
