import { useState } from "react";
import PropTypes from "prop-types";
import { Form, Rate, Input, Button, message } from "antd";

const ReviewForm = ({ productId, onReviewAdded, onReviewUpdate }) => {
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const user = localStorage.getItem("user")
    ? JSON.parse(localStorage.getItem("user"))
    : null;
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  const handleFinish = async () => {
    if (!user) return message.warning("Yorum yapmak için giriş yapmalısınız.");
    if (rating === 0 || !reviewText.trim())
      return message.warning("Lütfen puan ve yorumunuzu girin.");

    setSubmitting(true);
    try {
      const res = await fetch(`${apiUrl}/api/product-reviews/${productId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: reviewText,
          rating,
          user: user._id || user.id,
        }),
      });

      if (!res.ok) throw new Error();
      setRating(0);
      setReviewText("");
      message.success("Yorumunuz eklendi.");
      onReviewAdded();
      onReviewUpdate(); // yıldız & yorum sayısını güncelle
    } catch {
      message.error("Yorum eklenirken bir hata oluştu.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Form layout="vertical" onFinish={handleFinish}>
      <Form.Item label="Puanınız">
        <Rate allowHalf value={rating} onChange={setRating} />
      </Form.Item>
      <Form.Item label="Yorumunuz">
        <Input.TextArea
          rows={4}
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          placeholder="Yorumunuzu yazın..."
        />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit" loading={submitting} block>
          Gönder
        </Button>
      </Form.Item>
    </Form>
  );
};

ReviewForm.propTypes = {
  productId: PropTypes.string.isRequired,
  onReviewAdded: PropTypes.func.isRequired,
  onReviewUpdate: PropTypes.func.isRequired,
};

export default ReviewForm;
