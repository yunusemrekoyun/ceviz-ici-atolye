// src/components/user/UserAccountLayout.jsx
import React, { useContext, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import api from "../../../api";
import { AuthContext } from "../../context/AuthContext";
import AccountHeader from "./AccountHeader";
import UserAccount from "./UserAccount";
import AddressList from "./AddressList";
import OrdersList from "./OrdersList";
import Logout from "../auth/Logout";

const TABS = [
  { key: "profile", label: "Profil" },
  { key: "addresses", label: "Adreslerim" },
  { key: "orders", label: "Siparişlerim" },
];

// Hesap sayfası: üstte fotoğraf + ad, altında sekmeler. Telefonda sekmeler üç parçalı seçici,
// masaüstünde soldaki menü.
export default function UserAccountLayout() {
  const location = useLocation();
  const { isLoggedIn } = useContext(AuthContext);
  const [tab, setTab] = useState(location.state?.tab || "profile");
  const [user, setUser] = useState(null);
  const [profilePic, setProfilePic] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoggedIn) return;
    let alive = true;
    setError("");
    api
      .get("/users/me")
      .then((res) => alive && setUser(res.data))
      .catch((err) => alive && setError(err.response?.data?.message || "Profil alınamadı."));
    api
      .get("/profile-pictures")
      .then((res) => alive && setProfilePic(res.data))
      .catch(() => alive && setProfilePic(null));
    return () => {
      alive = false;
    };
  }, [isLoggedIn]);

  return (
    <div className="bg-light1/70">
      <div className="mx-auto max-w-5xl px-4 pb-16 pt-6 sm:px-6 lg:pt-10">
        <AccountHeader user={user} profilePic={profilePic} onPictureChange={setProfilePic} />
        {error && !user && (
          <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="mt-6 lg:mt-10 lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start lg:gap-10">
          <nav aria-label="Hesap menüsü" className="lg:sticky lg:top-24">
            {/* Telefon/tablet: üç parçalı seçici */}
            <div role="tablist" className="grid grid-cols-3 gap-1 rounded-full bg-white p-1 shadow-sm ring-1 ring-black/5 lg:hidden">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.key}
                  onClick={() => setTab(t.key)}
                  className={`rounded-full px-2 py-2.5 text-sm font-semibold transition ${
                    tab === t.key ? "bg-dark1 text-white shadow" : "text-dark2 hover:text-dark1"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Masaüstü: dikey menü */}
            <div className="hidden space-y-1 rounded-2xl bg-white p-2 shadow-sm ring-1 ring-black/5 lg:block">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  aria-current={tab === t.key ? "page" : undefined}
                  className={`w-full rounded-xl px-4 py-2.5 text-left font-medium transition ${
                    tab === t.key ? "bg-dark1 text-white" : "text-dark1 hover:bg-light1"
                  }`}
                >
                  {t.label}
                </button>
              ))}
              <div className="border-t border-light2 pt-1">
                <Logout variant="menu" />
              </div>
            </div>
          </nav>

          <main className="mt-5 min-w-0 lg:mt-0">
            {tab === "profile" && <UserAccount user={user} onUserChange={setUser} />}
            {tab === "addresses" && <AddressList />}
            {tab === "orders" && <OrdersList />}
          </main>
        </div>
      </div>
    </div>
  );
}
