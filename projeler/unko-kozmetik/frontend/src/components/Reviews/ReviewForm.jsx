// frontend/src/components/Reviews/ReviewForm.jsx
import { useEffect, useState, useCallback } from "react";
import PropTypes from "prop-types";
import { message, Modal } from "antd";
import { Link, useLocation } from "react-router-dom";
import { fetchWithAuth } from "../Auth/fetchWithAuth";
import { readError } from "../../config/api";

const RATING_LABELS = ["", "Kötü", "Vasat", "İdare eder", "İyi", "Çok iyi"];

const ReviewForm = ({ singleProduct }) => {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [review, setReview] = useState("");
  const [userInfo, setUserInfo] = useState(null);
  const [isAccepted, setIsAccepted] = useState(false);
  const [isRulesModalVisible, setIsRulesModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const location = useLocation();

  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  const fetchUserInfo = useCallback(async () => {
    if (!localStorage.getItem("token")) return;
    try {
      const res = await fetchWithAuth(
        `${apiUrl}/api/auth/me`,
        {},
        { redirectOnFail: false }
      );
      if (res.ok) setUserInfo(await res.json());
    } catch {
      // Oturum yoksa form giriş bağlantısı gösterir
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchUserInfo();
  }, [fetchUserInfo]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) return message.warning("Lütfen bir puan seçin.");
    if (review.trim().length < 3)
      return message.warning("Yorumunuz en az 3 karakter olmalıdır.");
    if (!isAccepted)
      return message.warning("Yorum kurallarını kabul etmelisiniz.");

    setSubmitting(true);
    try {
      const res = await fetchWithAuth(
        `${apiUrl}/api/products/${singleProduct._id}/reviews`,
        {
          method: "POST",
          body: JSON.stringify({ text: review, rating }),
        }
      );
      if (!res.ok) throw new Error(await readError(res, "Yorum eklenemedi."));
      message.success("Yorumunuz alındı, onaylandıktan sonra yayınlanacak.");
      setReview("");
      setRating(0);
      setIsAccepted(false);
    } catch (err) {
      message.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!userInfo) {
    return (
      <div className="review-login">
        <p>Bu ürünü kullandınız mı? Deneyiminizi paylaşmak için giriş yapın.</p>
        <Link
          to="/auth"
          state={{ from: location.pathname }}
          className="btn btn-sm"
        >
          Giriş yap
        </Link>
      </div>
    );
  }

  const shown = hovered || rating;

  return (
    <>
      <form className="comment-form" onSubmit={handleSubmit}>
        <h3>Değerlendirme yazın</h3>

        <fieldset className="comment-form-rating">
          <legend>
            Puanınız <span className="required">*</span>
          </legend>
          <div className="star-input" onMouseLeave={() => setHovered(0)}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                type="button"
                key={star}
                className={`star ${shown >= star ? "is-on" : ""}`}
                aria-label={`${star} yıldız`}
                aria-pressed={rating === star}
                onMouseEnter={() => setHovered(star)}
                onClick={() => setRating(star)}
              >
                <i
                  className={`bi ${shown >= star ? "bi-star-fill" : "bi-star"}`}
                />
              </button>
            ))}
            <span className="star-label">{RATING_LABELS[shown]}</span>
          </div>
        </fieldset>

        <label className="comment-form-comment" htmlFor="comment">
          <span>
            Yorumunuz <span className="required">*</span>
          </span>
          <textarea
            id="comment"
            rows={5}
            value={review}
            maxLength={1000}
            placeholder="Ürünü ne kadar süredir kullanıyorsunuz, nasıl bir sonuç aldınız?"
            onChange={(e) => setReview(e.target.value)}
            required
          />
        </label>

        <label className="comment-form-rules">
          <input
            type="checkbox"
            checked={isAccepted}
            onChange={() => setIsAccepted((p) => !p)}
          />
          <span>
            <button
              type="button"
              className="text-link"
              onClick={() => setIsRulesModalVisible(true)}
            >
              Yorum kurallarını
            </button>{" "}
            okudum ve kabul ediyorum.
          </span>
        </label>

        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? "Gönderiliyor…" : "Yorumu gönder"}
        </button>
      </form>

      <Modal
        title="Yorum kuralları"
        open={isRulesModalVisible}
        onCancel={() => setIsRulesModalVisible(false)}
        footer={null}
        centered
      >
        <ul className="rules-list">
          <li>
            <strong>Saygılı dil:</strong> Küfür, argo, hakaret ve aşağılayıcı
            ifadeler yayınlanmaz.
          </li>
          <li>
            <strong>Gerçek deneyim:</strong> Yalnızca kullandığınız ürünler
            hakkında yorum yapın.
          </li>
          <li>
            <strong>Reklam yok:</strong> Telefon numarası, web sitesi veya
            sosyal medya hesabı paylaşmayın.
          </li>
          <li>
            <strong>Tekrar yok:</strong> Aynı içeriğe sahip yorumlar
            yayınlanmaz.
          </li>
          <li>
            <strong>Denetim:</strong> Tüm yorumlar kontrol edildikten sonra
            yayına alınır.
          </li>
        </ul>
      </Modal>
    </>
  );
};

ReviewForm.propTypes = {
  singleProduct: PropTypes.object.isRequired,
};

export default ReviewForm;
