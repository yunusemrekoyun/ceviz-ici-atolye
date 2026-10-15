// src/components/layout/Header.jsx
import React, { useContext, useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import {
  FaSearch,
  FaShoppingCart,
  FaUser,
  FaBars,
  FaTimes,
} from "react-icons/fa";
import { ChevronDownIcon, ChevronRightIcon } from "@heroicons/react/24/solid";
import { AuthContext } from "../../context/AuthContext";
import { useCart } from "../../context/useCart";
import SearchModal from "../search/SearchModal";
import useCategoriesCache from "../../hooks/useCategoriesCache";
import logo from "../../assets/logo/logo.webp";
import publicApi from "../../../publicApi";
import { useSiteContent } from "../../context/siteContent";
import { getResponsiveImageProps } from "../../utils/media";
import HeaderBrand from "./HeaderBrand";

const DISCOUNT_HOVER_KEY = "__discount_campaigns__";
const Header = () => {
  const { isLoggedIn } = useContext(AuthContext);
  const { items } = useCart();
  const siteContent = useSiteContent();
  const siteLogo = getResponsiveImageProps(siteContent?.logo || logo, {
    widths: [256, 512, 640], defaultWidth: 256, sizes: "56px",
  });

  const [showSearch, setShowSearch] = useState(false);

  // Kaydırınca header üstte kalır; yarı saydam, bulanık zemine geçer ve incelir.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Mobil Drawer
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false); // animasyon

  // Mağaza dropdown (desktop)
  const [shopOpen, setShopOpen] = useState(false);
  const [hoverParent, setHoverParent] = useState(null);
  const closeTimer = useRef(null);
  const shopToggleRef = useRef(null);
  const navigate = useNavigate();

  // Mobil akordeon: açık parent id'leri
  const [openParents, setOpenParents] = useState(() => new Set());
  const [headerCampaigns, setHeaderCampaigns] = useState([]);

  const { data: cachedCategories } = useCategoriesCache();
  const cats = useMemo(
    () => (Array.isArray(cachedCategories) ? cachedCategories : []),
    [cachedCategories]
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await publicApi.get("/cart-campaigns/header");
        if (!alive) return;
        setHeaderCampaigns(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Header kampanyaları alınamadı:", e);
        if (alive) setHeaderCampaigns([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // id helper
  const getId = (maybeObj) =>
    typeof maybeObj === "object" && maybeObj?._id
      ? String(maybeObj._id)
      : String(maybeObj || "");

  const parents = useMemo(() => cats.filter((c) => !c.parent), [cats]);
  const childrenOf = (parentId) =>
    cats.filter((c) => c.parent && getId(c.parent) === String(parentId));
  const topPanelCampaigns = useMemo(
    () => headerCampaigns.filter((c) => c.headerPlacement === "top_panel"),
    [headerCampaigns]
  );
  const subPanelCampaigns = useMemo(
    () => headerCampaigns.filter((c) => c.headerPlacement === "sub_panel"),
    [headerCampaigns]
  );
  const allMobileCampaigns = useMemo(
    () => [...topPanelCampaigns, ...subPanelCampaigns],
    [topPanelCampaigns, subPanelCampaigns]
  );

  // Desktop hover’lı menüde children
  const isDiscountHover = hoverParent === DISCOUNT_HOVER_KEY;
  const hoveredParentObj = isDiscountHover
    ? null
    : cats.find((x) => getId(x._id) === String(hoverParent));
  const currentChildren = isDiscountHover
    ? subPanelCampaigns
    : hoveredParentObj?.children?.length
    ? hoveredParentObj.children
    : childrenOf(hoverParent);
  const hasChildren = (currentChildren || []).length > 0;
  const hasRightPanel = hasChildren;

  // Desktop dropdown açık/kapalı
  const openMenu = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setShopOpen(true);
    setHoverParent(null);
  };
  const scheduleClose = () => {
    closeTimer.current = setTimeout(() => {
      setShopOpen(false);
      setHoverParent(null);
    }, 250);
  };

  // Mağazaya git: kategori ve indirim adres çubuğunda (paylaşılabilir),
  // kampanya ürün listeleri sayfa durumunda taşınır.
  const goShopWith = (preset) => {
    setShopOpen(false);
    setHoverParent(null);
    setMobileMenuOpen(false);
    setDrawerVisible(false);
    if (Array.isArray(preset?.productIds)) {
      navigate("/shop", { state: { preset } });
      return;
    }
    const params = new URLSearchParams();
    for (const id of preset?.category || []) params.append("kategori", String(id));
    for (const id of preset?.subCategory || []) params.append("alt", String(id));
    if (preset?.discountOnly) params.set("indirim", "1");
    const search = params.toString();
    navigate(search ? `/shop?${search}` : "/shop");
  };

  // Mobil drawer animasyonu
  useEffect(() => {
    if (mobileMenuOpen) {
      // çizimden sonra translateX’i sıfırla
      const t = setTimeout(() => setDrawerVisible(true), 10);
      return () => clearTimeout(t);
    } else {
      setDrawerVisible(false);
    }
  }, [mobileMenuOpen]);

  // Akordeon toggle
  const toggleParentOpen = (pid) => {
    setOpenParents((prev) => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid);
      else next.add(pid);
      return next;
    });
  };

  const menuItems = [
    { label: "Ana Sayfa", path: "/" },
    { label: "Hakkımızda", path: "/about" },
    { label: "Blog", path: "/blog" },
    { label: "İletişim", path: "/contact" },
  ];

  const iconButton =
    "flex h-10 w-10 items-center justify-center rounded-full text-dark1 transition hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-dark1";

  return (
    <header
      className={`sticky top-0 z-50 border-b transition-[background-color,box-shadow,border-color] duration-300 ${
        scrolled
          ? "border-transparent bg-light1/80 shadow-[0_10px_30px_-18px_rgba(0,0,0,0.45)] backdrop-blur-md supports-[backdrop-filter]:bg-light1/70"
          : "border-light2 bg-light1"
      }`}
    >
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
        <div
          className={`grid grid-cols-[1fr_auto_1fr] items-center gap-2 transition-[height] duration-300 ${
            scrolled ? "h-14 lg:h-16" : "h-16 lg:h-20"
          }`}
        >
          {/* Sol: mobilde menü ve arama, masaüstünde menü linkleri */}
          <div className="flex min-w-0 items-center gap-0.5 sm:gap-1">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className={`${iconButton} lg:hidden`}
              aria-label="Menüyü Aç"
            >
              <FaBars className="text-lg" />
            </button>
            <button
              type="button"
              className={`${iconButton} lg:hidden`}
              onClick={() => setShowSearch(true)}
              aria-label="Ürün ara"
            >
              <FaSearch className="text-[15px]" />
            </button>

            {/* Menü - Desktop */}
            <nav className="hidden lg:flex items-center gap-4 xl:gap-7 text-sm xl:text-[15px] font-medium tracking-wide text-dark2 relative">
              <Link to="/" className="hover:text-brand transition-colors">
                Ana Sayfa
              </Link>

              {/* Mağaza (hover veya klavye → mega menü) */}
              <div
                className="relative flex items-center gap-1"
                onMouseEnter={openMenu}
                onMouseLeave={scheduleClose}
                onKeyDown={(e) => {
                  if (e.key === "Escape" && shopOpen) {
                    setShopOpen(false);
                    setHoverParent(null);
                    shopToggleRef.current?.focus();
                  }
                }}
                onBlur={(e) => {
                  // Odak menünün dışına çıkınca kapanır (klavyeyle gezinme).
                  if (!e.currentTarget.contains(e.relatedTarget)) {
                    setShopOpen(false);
                    setHoverParent(null);
                  }
                }}
              >
                <Link
                  to="/shop"
                  className="hover:text-brand transition-colors"
                  onClick={() => {
                    setShopOpen(false);
                    setHoverParent(null);
                  }}
                >
                  Mağaza
                </Link>
                <button
                  ref={shopToggleRef}
                  type="button"
                  aria-expanded={shopOpen}
                  aria-controls="magaza-menusu"
                  aria-label="Mağaza menüsünü aç"
                  onClick={() => (shopOpen ? setShopOpen(false) : openMenu())}
                  className="rounded p-1 text-dark2 hover:text-dark1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-dark1"
                >
                  <ChevronDownIcon className={`h-4 w-4 transition-transform ${shopOpen ? "rotate-180" : ""}`} />
                </button>

                {shopOpen && (
                  <div
                    id="magaza-menusu"
                    className={
                      `absolute left-0 top-full mt-3 bg-white border border-light2 rounded-xl shadow-xl p-4 z-50 ` +
                      (hasRightPanel
                        ? "w-[900px] grid grid-cols-2 gap-6"
                        : "w-[420px]")
                    }
                    onMouseEnter={openMenu}
                    onMouseLeave={scheduleClose}
                  >
                    {/* Sol kolon: Fırsatlar + Parent kategoriler */}
                    <div
                      className={
                        hasRightPanel ? "border-r border-light2 pr-4" : ""
                      }
                    >
                      {/* Fırsatlar */}
                      <div className="mb-4">
                        <button
                          onMouseEnter={() => {
                            if (subPanelCampaigns.length > 0) {
                              setHoverParent(DISCOUNT_HOVER_KEY);
                            } else {
                              setHoverParent(null);
                            }
                          }}
                          onFocus={() => setHoverParent(subPanelCampaigns.length > 0 ? DISCOUNT_HOVER_KEY : null)}
                          onClick={() => goShopWith({ discountOnly: true })}
                          className={`w-full text-left px-3 py-2 font-medium text-red-600 ${
                            hoverParent === DISCOUNT_HOVER_KEY
                              ? "bg-red-50 rounded-lg"
                              : "animate-pulse"
                          }`}
                          title="İndirimdeki tüm ürünler"
                        >
                          İndirim
                        </button>

                        {topPanelCampaigns.length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {topPanelCampaigns.map((c) => (
                              <li key={c._id}>
                                <button
                                  onClick={() =>
                                    goShopWith({
                                      title: c.name,
                                      productIds: c.productIds || [],
                                    })
                                  }
                                  className="w-full text-left px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg transition text-sm"
                                >
                                  {c.name}
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div className="text-xs uppercase text-dark2 mb-2">
                        Kategoriler
                      </div>
                      <ul className="space-y-1">
                        {parents.map((p) => (
                          <li key={p._id}>
                            <button
                              onMouseEnter={() => setHoverParent(p._id)}
                              onFocus={() => setHoverParent(p._id)}
                              onClick={() =>
                                goShopWith({
                                  category: [p._id],
                                  subCategory: [],
                                })
                              }
                              className={`w-full text-left px-3 py-2 rounded-lg transition ${
                                hoverParent === p._id
                                  ? "bg-light1 text-dark1"
                                  : "hover:bg-light1"
                              }`}
                            >
                              {p.name}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Sağ kolon: Alt Kategoriler */}
                    {hasRightPanel && (
                      <div className="pl-2">
                        <div className="text-xs uppercase text-dark2 mb-2">
                          {isDiscountHover ? "Kampanyalar" : "Alt Kategoriler"}
                        </div>
                        {isDiscountHover ? (
                          <ul className="space-y-2">
                            {currentChildren.map((c) => (
                              <li key={c._id}>
                                <button
                                  onClick={() =>
                                    goShopWith({
                                      title: c.name,
                                      productIds: c.productIds || [],
                                    })
                                  }
                                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-red-50 text-red-600 transition"
                                >
                                  {c.name}
                                </button>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <ul className="grid grid-cols-2 gap-2">
                            {currentChildren.map((sc) => (
                              <li key={sc._id}>
                                <button
                                  onClick={() =>
                                    goShopWith({
                                      category: [],
                                      subCategory: [sc._id],
                                    })
                                  }
                                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-light1 transition"
                                >
                                  {sc.name}
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Diğer menüler */}
              {menuItems.slice(1).map(({ label, path }) => (
                <Link
                  key={path}
                  to={path}
                  className="hover:text-brand transition-colors"
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Orta: marka */}
          <Link to="/" className="justify-self-center rounded-full px-1" aria-label="OLDSOCKS ana sayfa">
            <HeaderBrand header={siteContent?.header} logoProps={siteLogo} compact={scrolled} />
          </Link>

          {/* Sağ: arama (masaüstü), profil, sepet */}
          <div className="flex items-center justify-end gap-0.5 sm:gap-1.5">
            <button
              type="button"
              className={`${iconButton} hidden lg:flex`}
              onClick={() => setShowSearch(true)}
              aria-label="Ürün ara"
            >
              <FaSearch className="text-[15px]" />
            </button>
            <Link to="/profile" aria-label={isLoggedIn ? "Hesabım" : "Giriş yap"} className={iconButton}>
              <FaUser className="text-[15px]" />
            </Link>
            <Link
              to="/cart"
              id="cart-icon"
              aria-label={`Sepet${items.length ? `, ${items.length} ürün` : ""}`}
              className="relative ml-0.5 flex h-10 w-10 items-center justify-center rounded-full bg-dark1 text-white transition hover:bg-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dark1"
            >
              <FaShoppingCart className="text-[15px]" />
              {items.length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-dark1 shadow ring-1 ring-black/10">
                  {items.length}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* =================== Mobil Drawer =================== */}
      {/* Kaydırınca header'a gelen bulanıklık (backdrop-filter) içindeki "fixed" öğeleri
          header kutusuna hapseder; menü ve arama bu yüzden sayfa köküne taşınır. */}
      {mobileMenuOpen && createPortal(
        <div className="fixed inset-0 z-[1100]">
          {/* Backdrop */}
          <div
            className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity ${
              drawerVisible ? "opacity-100" : "opacity-0"
            }`}
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Panel */}
          <div
            className={`absolute left-0 top-0 h-full w-[86%] max-w-sm bg-white shadow-2xl border-r border-light2 transform transition-transform duration-300 ${
              drawerVisible ? "translate-x-0" : "-translate-x-full"
            } flex flex-col`}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-light2">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center"
                aria-label="OLDSOCKS ana sayfa"
              >
                <HeaderBrand header={siteContent?.header} logoProps={siteLogo} compact />
              </Link>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="w-9 h-9 flex items-center justify-center rounded-full border border-light3 hover:bg-light1"
                aria-label="Kapat"
              >
                <FaTimes className="text-dark2" />
              </button>
            </div>

            {/* Quick Actions */}
            <div className="px-4 pt-3 pb-1 grid grid-cols-3 gap-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  navigate("/shop");
                }}
                className="px-3 py-2 rounded-lg bg-light1 hover:bg-light1/80 border border-light2 text-sm"
              >
                Mağaza
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  goShopWith({ discountOnly: true });
                }}
                className="px-3 py-2 rounded-lg bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 text-sm"
              >
                İndirim
              </button>
              <button
                onClick={() => {
                  setShowSearch(true);
                  setMobileMenuOpen(false);
                }}
                className="px-3 py-2 rounded-lg bg-light1 hover:bg-light1/80 border border-light2 text-sm"
              >
                Ara
              </button>
            </div>

            {allMobileCampaigns.length > 0 && (
              <div className="px-4 py-2">
                <div className="rounded-xl border border-red-100 bg-red-50/50 p-3">
                  <div className="text-xs font-semibold text-red-600 mb-2 uppercase">
                    Kampanyalar
                  </div>
                  <div className="space-y-1">
                    {allMobileCampaigns.map((c) => (
                      <button
                        key={c._id}
                        onClick={() => {
                          setMobileMenuOpen(false);
                          goShopWith({
                            title: c.name,
                            productIds: c.productIds || [],
                          });
                        }}
                        className="w-full text-left px-2 py-1.5 rounded-lg text-sm text-red-700 hover:bg-red-100 transition"
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Links */}
            <nav className="px-4 py-2 space-y-2 overflow-y-auto">
              <Link
                to="/"
                className="block px-4 py-3 rounded-xl hover:bg-light1 transition"
                onClick={() => setMobileMenuOpen(false)}
              >
                Ana Sayfa
              </Link>

              {/* Kategoriler (akordeon kart) */}
              <div className="rounded-2xl border border-light2 overflow-hidden">
                <div className="px-4 py-2 text-xs uppercase text-dark2 bg-light1/60">
                  Kategoriler
                </div>
                <ul className="divide-y divide-light2">
                  {parents.map((p) => {
                    const pid = String(p._id);
                    const children =
                      (p.children && p.children.length
                        ? p.children
                        : childrenOf(pid)) || [];
                    const isOpen = openParents.has(pid);

                    return (
                      <li key={pid} className="bg-white">
                        <div className="flex items-center">
                          <button
                            onClick={() =>
                              goShopWith({ category: [pid], subCategory: [] })
                            }
                            className="flex-1 text-left px-4 py-3 hover:bg-light1 transition"
                          >
                            {p.name}
                          </button>
                          {children.length > 0 && (
                            <button
                              onClick={() => toggleParentOpen(pid)}
                              className="px-3 py-3 hover:bg-light1 transition"
                              aria-label="Alt kategorileri aç/kapat"
                            >
                              {isOpen ? (
                                <ChevronDownIcon className="w-4 h-4 text-dark2" />
                              ) : (
                                <ChevronRightIcon className="w-4 h-4 text-dark2" />
                              )}
                            </button>
                          )}
                        </div>

                        {children.length > 0 && isOpen && (
                          <ul className="bg-light1/60 px-2 py-2 grid grid-cols-1 gap-1">
                            {children.map((sc) => (
                              <li key={sc._id}>
                                <button
                                  onClick={() =>
                                    goShopWith({
                                      category: [],
                                      subCategory: [sc._id],
                                    })
                                  }
                                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-light1 transition text-sm"
                                >
                                  {sc.name}
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>

              {menuItems.slice(1).map(({ label, path }) => (
                <Link
                  key={path}
                  to={path}
                  className="block px-4 py-3 rounded-xl hover:bg-light1 transition"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>
        </div>,
        document.body
      )}

      {createPortal(<SearchModal open={showSearch} onClose={() => setShowSearch(false)} />, document.body)}
    </header>
  );
};

export default Header;
