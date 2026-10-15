import { useEffect, useState, useCallback } from "react";
import { List, Avatar, Form, Button, Input, message } from "antd";
import { Comment } from "@ant-design/compatible";
import dayjs from "dayjs";
import PropTypes from "prop-types";
import "./BlogComments.css";

const BlogComments = ({ blogId, user }) => {
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [value, setValue] = useState("");
  const [visibleCount, setVisibleCount] = useState(5);
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  const fetchComments = useCallback(async () => {
    setLoadingComments(true);
    try {
      const res = await fetch(`${apiUrl}/api/blogs/${blogId}/comments`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setComments(data);
    } catch {
      message.error("Yorumlar yüklenemedi");
    } finally {
      setLoadingComments(false);
    }
  }, [apiUrl, blogId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleSubmit = async () => {
    if (!user) return message.warning("Yorum yapmak için giriş yapın");
    if (!value.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`${apiUrl}/api/blogs/${blogId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, content: value }),
      });
      if (res.ok) {
        setValue("");
        await fetchComments();
      } else {
        message.error("Yorum eklenemedi");
      }
    } catch {
      message.error("Sunucu hatası");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="comments-section">
      <h3>Yorumlar ({comments.length})</h3>

      {loadingComments ? (
        <p>Yorumlar yükleniyor...</p>
      ) : comments.length === 0 ? (
        <div className="no-comments">Henüz yorum yapılmamış. İlk sen ol!</div>
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
                    src={`${apiUrl}/api/users/${item.user._id}/image`}
                    alt={item.user.username}
                    onError={(e) => (e.target.src = "/img/avatars/avatar1.jpg")}
                  />
                }
                content={<p>{item.content}</p>}
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
          <Form.Item style={{ marginTop: 20, marginBottom: 8 }}>
            <Input.TextArea
              rows={4}
              onChange={(e) => setValue(e.target.value)}
              value={value}
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
  );
};

BlogComments.propTypes = {
  blogId: PropTypes.string.isRequired,
  user: PropTypes.shape({
    id: PropTypes.string,
    username: PropTypes.string,
  }),
};

export default BlogComments;
