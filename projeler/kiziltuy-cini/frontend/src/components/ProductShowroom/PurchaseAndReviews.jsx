import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { List, Avatar, Form, Button, Input, Rate, message } from "antd";
import { Comment } from "@ant-design/compatible";
import dayjs from "dayjs";
import "./PurchaseAndReviews.css";

const PurchaseAndReviews = ({ product }) => {
  const [activeTab, setActiveTab] = useState("buy");
  const [comments, setComments] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [value, setValue] = useState("");
  const [rating, setRating] = useState(0);
  const [visibleCount, setVisibleCount] = useState(5);

  const apiUrl = import.meta.env.VITE_API_BASE_URL;
  const user = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    if (activeTab === "reviews" && product?._id) {
      const fetchComments = async () => {
        setIsLoadingComments(true);
        try {
          const res = await fetch(
            `${apiUrl}/api/product-reviews/${product._id}`
          );
          if (!res.ok) throw new Error();
          const data = await res.json();
          const filtered = data.reviews.filter((item) => item.user !== null);
          setComments(filtered);
        } catch {
          message.error("Yorumlar yüklenemedi");
        } finally {
          setIsLoadingComments(false);
        }
      };

      fetchComments();
    }
  }, [activeTab, product?._id, apiUrl]);

  const handleSubmit = async () => {
    if (!user) return message.warning("Yorum yapmak için giriş yapın");
    if (!value.trim()) return message.warning("Yorum boş olamaz");
    if (!rating || rating === 0) return message.warning("Lütfen puan verin");

    setSubmitting(true);
    try {
      const res = await fetch(`${apiUrl}/api/product-reviews/${product._id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: value,
          rating,
          user: user._id || user.id,
        }),
      });

      if (!res.ok) throw new Error();

      message.success(
        "Yorumunuz başarıyla gönderildi. Onay sonrası yayınlanacaktır."
      );

      setValue("");
      setRating(0);

      const updated = await fetch(
        `${apiUrl}/api/product-reviews/${product._id}`
      );
      const updatedData = await updated.json();
      const filtered = updatedData.reviews.filter((item) => item.user !== null);
      setComments(filtered);
    } catch {
      message.error("Yorum eklenemedi");
    } finally {
      setSubmitting(false);
    }
  };

  if (!product) return null;

  return (
    <section className="bottom-tabs-section">
      <div className="tab-header">
        <button
          className={activeTab === "buy" ? "active" : ""}
          onClick={() => setActiveTab("buy")}
        >
          Satın Al
        </button>
        <button
          className={activeTab === "reviews" ? "active" : ""}
          onClick={() => setActiveTab("reviews")}
        >
          Yorumlar
        </button>
      </div>

      {activeTab === "buy" && (
        <div className="purchase-links">
          {Array.isArray(product?.buyLink) && product.buyLink.length > 0 ? (
            product.buyLink.map((link, index) => {
              let logoSrc = null;
              let altText = "";
              let hostname = "";

              try {
                const url = new URL(link);
                hostname = url.hostname.replace("www.", "");

                if (hostname.includes("trendyol")) {
                  logoSrc = "/img/shop/trendyol-logo.png";
                  altText = "Trendyol'da Satın Al";
                } else if (hostname.includes("ciceksepeti")) {
                  logoSrc = "/img/shop/ciceksepeti-logo.png";
                  altText = "ÇiçekSepeti'nde Satın Al";
                }
              } catch {
                return null;
              }

              if (!logoSrc) return null;

              return (
                <div key={index} className="buy-link-card">
                  <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="buy-link-logo-wrapper"
                  >
                    <img
                      src={logoSrc}
                      alt={altText}
                      className="buy-link-logo"
                      title={altText}
                    />
                  </a>
                  <div className="buy-link-price">
                    {product.price?.current != null ? (
                      <>
                        <span className="price-amount">
                          {product.price.current.toLocaleString("tr-TR", {
                            style: "currency",
                            currency: "TRY",
                          })}
                        </span>
                        {product.price?.discount > 0 && (
                          <span className="price-discount">
                            %{product.price.discount} indirim
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="price-not-available">
                        Fiyat bilgisi yok
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="no-buy-link">Satın alma bağlantısı bulunamadı.</div>
          )}
        </div>
      )}

      {activeTab === "reviews" && (
        <div className="comments-section">
          <h3>Yorumlar ({comments.length})</h3>

          {isLoadingComments ? (
            <div className="comments-loading">Yorumlar yükleniyor...</div>
          ) : comments.length === 0 ? (
            <div className="no-comments">
              Henüz yorum yapılmamış. İlk sen ol!
            </div>
          ) : (
            <>
              <List
                dataSource={comments.slice(0, visibleCount)}
                itemLayout="horizontal"
                renderItem={(item) => (
                  <Comment
                    author={<strong>{item.user.username}</strong>}
                    avatar={
                      <Avatar
                        src={item.user.avatar || "/img/avatars/avatar1.jpg"}
                        alt={item.user.username}
                      />
                    }
                    content={<p>{item.text}</p>}
                    datetime={dayjs(item.createdAt).format("DD MMM YYYY HH:mm")}
                  />
                )}
              />

              {visibleCount < comments.length && (
                <div style={{ textAlign: "center", marginTop: 20 }}>
                  <Button
                    className="load-more-button"
                    onClick={() => setVisibleCount(visibleCount + 5)}
                  >
                    Daha fazla görüntüle
                  </Button>
                </div>
              )}
            </>
          )}

          {user && (
            <Form layout="vertical">
              <Form.Item>
                <Rate value={rating} onChange={(value) => setRating(value)} />
              </Form.Item>
              <Form.Item style={{ marginBottom: 8 }}>
                <Input.TextArea
                  rows={4}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="Yorumunuzu yazın..."
                />
              </Form.Item>
              <Form.Item style={{ marginBottom: 0 }}>
                <Button
                  htmlType="submit"
                  loading={submitting}
                  onClick={handleSubmit}
                  type="primary"
                >
                  Yorum Yap
                </Button>
              </Form.Item>
            </Form>
          )}
        </div>
      )}
    </section>
  );
};

PurchaseAndReviews.propTypes = {
  product: PropTypes.shape({
    _id: PropTypes.string,
    buyLink: PropTypes.arrayOf(PropTypes.string),
    price: PropTypes.shape({
      current: PropTypes.number,
      discount: PropTypes.number,
    }),
  }),
};

export default PurchaseAndReviews;
