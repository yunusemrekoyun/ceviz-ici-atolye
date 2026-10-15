import { useEffect, useState, useCallback } from "react";
import {
  Tabs,
  Table,
  Button,
  message,
  Popconfirm,
  Spin,
  Input,
  Typography,
} from "antd";
import { fetchWithAuth } from "../../components/Auth/fetchWithAuth";
import { readError } from "../../config/api";
import dayjs from "dayjs";

const { Search } = Input;
const { Paragraph } = Typography;

const CommentsPage = () => {
  const apiUrl = import.meta.env.VITE_API_BASE_URL;
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState([]);
  const [approved, setApproved] = useState([]);
  const [searchText, setSearchText] = useState("");

  const fetchComments = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, aRes] = await Promise.all([
        fetchWithAuth(`${apiUrl}/api/products/admin/reviews?approved=false`),
        fetchWithAuth(`${apiUrl}/api/products/admin/reviews?approved=true`),
      ]);
      if (pRes.ok && aRes.ok) {
        const pData = await pRes.json();
        const aData = await aRes.json();
        setPending(pData.data || []);
        setApproved(aData.data || []);
      } else {
        message.error("Yorumlar alınamadı.");
      }
    } catch {
      message.error("Sunucuya ulaşılamadı.");
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleApprove = async (record) => {
    try {
      const res = await fetchWithAuth(
        `${apiUrl}/api/products/${record.productId}/reviews/${record.reviewId}/approve`,
        { method: "PUT" }
      );
      if (!res.ok) throw new Error(await readError(res, "Onay başarısız."));
      message.success("Yorum onaylandı.");
      fetchComments();
    } catch (err) {
      message.error(err.message);
    }
  };

  const handleDelete = async (record) => {
    try {
      const res = await fetchWithAuth(
        `${apiUrl}/api/products/${record.productId}/reviews/${record.reviewId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error(await readError(res, "Silme başarısız."));
      message.success("Yorum silindi.");
      fetchComments();
    } catch (err) {
      message.error(err.message);
    }
  };

  const filteredPending = pending.filter((r) =>
    r.productName.toLowerCase().includes(searchText.toLowerCase())
  );
  const filteredApproved = approved.filter((r) =>
    r.productName.toLowerCase().includes(searchText.toLowerCase())
  );

  const columns = [
    {
      title: "Ürün",
      dataIndex: "productName",
      key: "productName",
      responsive: ["xs", "sm", "md", "lg"], // Ekran boyutlarına göre görünürlük ayarları
    },
    {
      title: "Kullanıcı",
      dataIndex: "user",
      key: "user",
      responsive: ["md"], // Sadece orta ve üstü ekran boyutlarında görünsün
    },
    {
      title: "Puan",
      dataIndex: "rating",
      key: "rating",
      responsive: ["sm", "md"], // Küçük ve orta ekranlarda görünsün
    },
    {
      title: "Yorum",
      dataIndex: "text",
      key: "text",
      render: (text) => (
        <Paragraph
          ellipsis={{
            rows: 2,
            expandable: true,
            symbol: "daha fazla",
          }}
        >
          {text}
        </Paragraph>
      ),
      responsive: ["sm", "md"], // Küçük ve orta ekranlarda görünsün
    },
    {
      title: "Tarih",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date) => dayjs(date).format("DD/MM/YYYY HH:mm"),
      sorter: (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      defaultSortOrder: "descend",
      responsive: ["lg"], // Yalnızca büyük ekranlarda görünsün
    },
    {
      title: "İşlem",
      key: "action",
      render: (_, record) => (
        <span style={{ whiteSpace: "nowrap" }}>
          {record.approved === false && (
            <Button
              type="primary"
              onClick={() => handleApprove(record)}
              style={{ marginRight: 8 }}
            >
              Onayla
            </Button>
          )}
          <Popconfirm
            title="Silinsin mi?"
            onConfirm={() => handleDelete(record)}
            okText="Evet"
            cancelText="Hayır"
          >
            <Button danger>Sil</Button>
          </Popconfirm>
        </span>
      ),
    },
  ];

  const tabsItems = [
    {
      key: "pending",
      label: `Onay Bekleyen (${pending.length})`,
      children: (
        <div style={{ overflowX: "auto" }}>
          <Table
            dataSource={filteredPending}
            columns={columns}
            rowKey="reviewId"
            pagination={{ pageSize: 10 }}
            scroll={{ x: true }}
          />
        </div>
      ),
    },
    {
      key: "approved",
      label: `Onaylanan (${approved.length})`,
      children: (
        <div style={{ overflowX: "auto" }}>
          <Table
            dataSource={filteredApproved}
            columns={columns}
            rowKey="reviewId"
            pagination={{ pageSize: 10 }}
            scroll={{ x: true }}
          />
        </div>
      ),
    },
  ];

  return (
    <Spin spinning={loading}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "1rem",
          justifyContent: "flex-start",
          marginBottom: 16,
        }}
      >
        <Search
          placeholder="Ürün adına göre ara"
          allowClear
          onChange={(e) => setSearchText(e.target.value)}
          style={{ flex: 1, minWidth: 200, maxWidth: 400 }}
        />
      </div>

      <Tabs defaultActiveKey="pending" items={tabsItems} />
    </Spin>
  );
};

export default CommentsPage;
