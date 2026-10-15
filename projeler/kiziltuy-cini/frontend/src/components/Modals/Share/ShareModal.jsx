import { useEffect } from "react";
import ReactDOM from "react-dom";
import PropTypes from "prop-types";
import "./ShareModal.css";

const ShareModal = ({ isOpen, onClose, shareUrl }) => {
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (e.target.classList.contains("share-modal-overlay")) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="share-modal-overlay">
      <div className="share-modal">
        <p className="share-url">{shareUrl}</p>
        <button
          className="copy-btn"
          onClick={() => navigator.clipboard.writeText(shareUrl)}
        >
          Kopyala
        </button>
      </div>
    </div>,
    document.body
  );
};

ShareModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  shareUrl: PropTypes.string.isRequired,
};

export default ShareModal;
