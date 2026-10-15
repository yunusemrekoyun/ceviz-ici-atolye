import { useState } from "react";
import { message } from "antd";
import "./Dialog.css";
import PropTypes from "prop-types";
import { readError } from "../../../config/api";

const Dialog = ({ isDialogShow, setIsDialogShow }) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  const handleDontShowAgain = (event) => {
    localStorage.setItem("dialog", JSON.stringify(!event.target.checked));
  };

  const handleSubscribe = async (event) => {
    event.preventDefault();
    if (!email.trim())
      return message.warning("Lütfen e-posta adresinizi girin.");

    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/newsletter`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error(await readError(res, "Abonelik başarısız."));
      const data = await res.json();
      message.success(data.message);
      // Abone olan kullanıcıya pencere tekrar gösterilmez
      localStorage.setItem("dialog", JSON.stringify(false));
      setEmail("");
      setIsDialogShow(false);
    } catch (err) {
      message.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`modal-dialog ${isDialogShow ? "show" : ""} `}>
      <div className="modal-content">
        <button
          type="button"
          className="modal-close"
          onClick={() => setIsDialogShow(false)}
          aria-label="Kapat"
        >
          <i className="bi bi-x"></i>
        </button>
        <div className="modal-image">
          <img src="/img/modal-dialog.jpg" alt="" />
        </div>
        <div className="popup-wrapper">
          <div className="popup-content">
            <div className="popup-title">
              <h3>İndirimli Ürünleri Kaçırmayın!</h3>
            </div>
            <p className="popup-text">
              E-posta adresinizi bırakın, kampanyalardan ilk siz haberdar olun.
            </p>
            <form className="popup-form" onSubmit={handleSubscribe}>
              <input
                type="email"
                placeholder="Email adresinizi giriniz"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                BENİ İNDİRİMLERDEN HABERDAR ET
              </button>
              <label>
                <input type="checkbox" onChange={handleDontShowAgain} />
                <span>Bir daha gösterme.</span>
              </label>
            </form>
          </div>
        </div>
      </div>
      <div
        className="modal-overlay"
        onClick={() => setIsDialogShow(false)}
      ></div>
    </div>
  );
};

export default Dialog;

Dialog.propTypes = {
  setIsDialogShow: PropTypes.func,
  isDialogShow: PropTypes.bool,
};
