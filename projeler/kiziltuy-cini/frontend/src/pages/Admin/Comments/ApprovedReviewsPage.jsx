import { useEffect, useState, useCallback } from "react";
import { Table, message, Spin, Button, Popconfirm } from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

const ApprovedReviewsPage = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  const fetchApprovedReviews = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/api/product-reviews/approved`);
      if (!res.ok) throw new Error("Onaylanmış yorumlar alınamadı.");
      const data = await res.json();
      setReviews(data);
    } catch (err) {
      console.error(err);
      message.error("Yorumlar getirilirken hata oluştu.");
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchApprovedReviews();
  }, [fetchApprovedReviews]);

  const handleDelete = async (productId, reviewId) => {
    try {
      const res = await fetch(
        `${apiUrl}/api/product-reviews/${productId}/${reviewId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error();
      message.success("Yorum silindi.");
      setReviews((prev) => prev.filter((r) => r._id !== reviewId));
    } catch {
      message.error("Silme işlemi başarısız.");
    }
  };

  const columns = [
    {
      title: "Kullanıcı",
      dataIndex: ["user", "username"],
      key: "user",
      render: (text) => text || "Anonim",
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
      title: "Tarih",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (text) => dayjs(text).format("DD MMMM YYYY HH:mm"),
    },
    {
      title: "Ürün",
      dataIndex: ["product", "name"],
      key: "product",
      render: (text) => text || "-",
    },
    {
      title: "İşlem",
      key: "action",
      width: 100,
      render: (_, review) => (
        <Popconfirm
          title="Yorumu silmek istediğinize emin misiniz?"
          onConfirm={() => handleDelete(review.productId, review._id)}
          okText="Evet"
          cancelText="Hayır"
        >
          <Button danger icon={<DeleteOutlined />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <h2>Onaylanmış Yorumlar</h2>
      {loading ? (
        <Spin />
      ) : (
        <Table
          columns={columns}
          dataSource={reviews}
          rowKey="_id"
          pagination={{ pageSize: 10 }}
        />
      )}
    </div>
  );
};

export default ApprovedReviewsPage;
