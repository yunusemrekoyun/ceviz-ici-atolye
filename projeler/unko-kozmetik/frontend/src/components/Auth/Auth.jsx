import { useState } from "react";
import Login from "./Login";
import Register from "./Register";
import "./Auth.css";

const Auth = () => {
  const [mode, setMode] = useState("login");
  const [registeredEmail, setRegisteredEmail] = useState("");

  return (
    <section className="account-page">
      <div className="container account-wrapper">
        <div className="account-visual" aria-hidden="true">
          <img src="/img/site/auth-side.jpg" alt="" />
          <p>
            Profesyonel bakım, siparişlerinizi takip etmek ve hızlı ödeme için
            tek hesap.
          </p>
        </div>

        <div className="account-panel">
          <h1 className="page-title">
            {mode === "login" ? "Tekrar hoş geldiniz" : "Hesap oluşturun"}
          </h1>
          <p className="account-lead">
            {mode === "login"
              ? "Siparişlerinizi görmek ve ödeme yapmak için giriş yapın."
              : "Birkaç saniyede üye olun, siparişlerinizi tek yerden takip edin."}
          </p>

          <div className="auth-tabs" role="tablist" aria-label="Hesap">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "login"}
              className={mode === "login" ? "active" : ""}
              onClick={() => setMode("login")}
            >
              Giriş yap
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "register"}
              className={mode === "register" ? "active" : ""}
              onClick={() => setMode("register")}
            >
              Kayıt ol
            </button>
          </div>

          {mode === "login" ? (
            <Login key={registeredEmail} defaultEmail={registeredEmail} />
          ) : (
            <Register
              onRegistered={(email) => {
                setRegisteredEmail(email);
                setMode("login");
              }}
            />
          )}
        </div>
      </div>
    </section>
  );
};

export default Auth;
