// src/components/breadCrumb/BreadCrumb.jsx
import React from "react";
import PropTypes from "prop-types";
import { Link, useLocation } from "react-router-dom";

const PATH_TRANSLATE = {
  "": "Ana Sayfa",
  home: "Ana Sayfa",
  shop: "Mağaza",
  about: "Hakkımızda",
  blog: "Blog",
  contact: "İletişim",
  "product-details": "Mağaza",
  cart: "Sepet",
  checkout: "Ödeme",
  "payment-result": "Ödeme Sonucu",
  auth: "Giriş / Kayıt",
  profile: "Profil",
  // … diğer admin segmentler
};

const BreadCrumb = ({ name: lastName }) => {
  const location = useLocation();
  const segments = location.pathname.split("/").filter(Boolean);

  return (
    <div className="bg-gray-100 py-3">
      <div className="container mx-auto px-4 text-sm text-gray-600 flex flex-wrap items-center">
        <Link to="/" className="hover:underline">
          Ana Sayfa
        </Link>
        {segments.map((seg, idx) => {
          const isLast = idx === segments.length - 1;
          // ID segmenti: ürün detay sayfasındaki son segment
          const label =
            isLast && lastName
              ? lastName
              : PATH_TRANSLATE[seg] || decodeURIComponent(seg);

          // routeTo: product-details segmenti shop'a, diğerleri kendi path'ine
          let to;
          if (seg === "product-details") {
            to = "/shop";
          } else {
            to = "/" + segments.slice(0, idx + 1).join("/");
          }

          return (
            <span key={idx} className="flex items-center ml-2">
              <span className="mx-1">/</span>
              {isLast ? (
                <span className="font-medium text-gray-800">{label}</span>
              ) : (
                <Link to={to} className="hover:underline">
                  {label}
                </Link>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
};

BreadCrumb.propTypes = {
  // Son segment için geçilecek isim
  name: PropTypes.string,
};

BreadCrumb.defaultProps = {
  name: null,
};

export default BreadCrumb;
