/********************************************************
 * frontend/src/layouts/MainLayout.jsx
 ********************************************************/
import { useEffect, useState } from "react";
import Proptypes from "prop-types";

import Footer from "../components/Layout/Footer/Footer";
import Header from "../components/Layout/Headers/Header";
import Search from "../components/Modals/Search/Search";
import Dialog from "../components/Modals/Dialog/Dialog";
import { Outlet } from "react-router-dom";

/**
 * Bu layout normal sayfalarda kullanılıyor.
 * "children" prop'u, <Route element={<MainLayout>...</MainLayout>} ...> eklenince
 * bu bileşenin içine yerleştirilir.
 */
const MainLayout = ({ children }) => {
  const [isSearchShow, setIsSearchShow] = useState(false);
  const [isDialogShow, setIsDialogShow] = useState(false);

  useEffect(() => {
    const dialogStatus = localStorage.getItem("dialog")
      ? JSON.parse(localStorage.getItem("dialog"))
      : true;

    // "dialog" localStorage yoksa ayarlayalım
    if (!localStorage.getItem("dialog")) {
      localStorage.setItem("dialog", JSON.stringify(true));
    }

    // 2sn sonra dialog açalım
    const timer = setTimeout(() => {
      setIsDialogShow(dialogStatus);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="main-layout">
      <a href="#main" className="skip-link">
        İçeriğe geç
      </a>
      <Dialog isDialogShow={isDialogShow} setIsDialogShow={setIsDialogShow} />
      <Search isSearchShow={isSearchShow} setIsSearchShow={setIsSearchShow} />
      <Header setIsSearchShow={setIsSearchShow} />
      <main id="main" className="main-content">
        {children}
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

MainLayout.propTypes = {
  children: Proptypes.node,
};

export default MainLayout;
