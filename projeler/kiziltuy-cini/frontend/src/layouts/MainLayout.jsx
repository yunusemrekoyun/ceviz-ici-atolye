// src/layouts/MainLayout.jsx
import { useState, useEffect, useRef } from "react";
import PropTypes from "prop-types";

import Header from "../components/Layout/Header/Header";
import HeaderBottom from "../components/Layout/Header/HeaderBottom";
import Footer from "../components/Layout/Footer/Footer";

import "./MainLayout.css";

const MainLayout = ({ children }) => {
  const [hideHeader, setHideHeader] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.pageYOffset;

      // Aşağı kaydırıyorsa gizle, yukarı kaydırıyorsa göster
      if (currentY > lastScrollY.current && currentY > 50) {
        setHideHeader(true);
      } else {
        setHideHeader(false);
      }

      lastScrollY.current = currentY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className={`main-layout ${hideHeader ? "header-hidden" : ""}`}>
      <div className={`header-wrapper ${hideHeader ? "hidden" : ""}`}>
        <Header />
      </div>
      <HeaderBottom className="header-bottom" />
      <main className="content">{children}</main>
      <Footer />
    </div>
  );
};

MainLayout.propTypes = {
  children: PropTypes.node,
};

export default MainLayout;
