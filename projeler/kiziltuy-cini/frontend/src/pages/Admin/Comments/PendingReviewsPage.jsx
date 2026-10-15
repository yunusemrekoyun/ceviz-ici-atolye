import { useEffect, useState, useCallback } from "react";
import { Table, Button, message, Spin } from "antd";
import { CheckOutlined, DeleteOutlined } from "@ant-design/icons";

const PendingReviewsPage = () => {
  const [pendingReviews, setPendingReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  const fetchPending = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/api/product-reviews/pending`);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("Veri hatalı");
      setPendingReviews(data);
    } catch (err) {
      message.error("Bekleyen yorumlar alınamadı.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  const handleApprove = async (productId, reviewId) => {
    try {
      const res = await fetch(
        `${apiUrl}/api/product-reviews/${productId}/${reviewId}/approve`,
        {
          method: "PATCH",
        }
      );
      if (!res.ok) throw new Error();
      message.success("Yorum onaylandı.");
      setPendingReviews(pendingReviews.filter((r) => r._id !== reviewId));
    } catch {
      message.error("Onay işlemi başarısız.");
    }
  };

  const handleDelete = async (productId, reviewId) => {
    try {
      const res = await fetch(
        `${apiUrl}/api/product-reviews/${productId}/${reviewId}`,
        {
          method: "DELETE",
        }
      );
      if (!res.ok) throw new Error();
      message.success("Yorum silindi.");
      setPendingReviews(pendingReviews.filter((r) => r._id !== reviewId));
    } catch {
      message.error("Silme işlemi başarısız.");
    }
  };

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const columns = [
    {
      title: "Kullanıcı",
      dataIndex: ["user", "username"],
      key: "user",
    },
    {
      title: "Yorum",
      dataIndex: "text",
      key: "text",
    },
    {
      title: "Puan",
      dataIndex: "rating",
      key: "rating",
      width: 80,
    },
    {
      title: "İşlemler",
      key: "actions",
      render: (_, review) => (
        <>
          <Button
            type="primary"
            icon={<CheckOutlined />}
            onClick={() => handleApprove(review.productId, review._id)}
            style={{ marginRight: 8 }}
          />
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(review.productId, review._id)}
          />
        </>
      ),
    },
  ];

  return (
    <div>
      <h2>Onay Bekleyen Yorumlar</h2>
      {loading ? (
        <Spin />
      ) : (
        <Table dataSource={pendingReviews} columns={columns} rowKey="_id" />
      )}
    </div>
  );
};

export default PendingReviewsPage;
