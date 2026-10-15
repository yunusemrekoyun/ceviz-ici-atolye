import {
  Button,
  Popconfirm,
  Space,
  Table,
  message,
  Input,
  Row,
  Col,
} from "antd";
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

const ProductPage = () => {
  const [dataSource, setDataSource] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/products`);
      if (!res.ok) throw new Error("Veri getirilemedi");

      const result = await res.json();
      const list = Array.isArray(result)
        ? result
        : Array.isArray(result.products)
        ? result.products
        : [];

      setDataSource(list);
      setFilteredData(list);
    } catch (err) {
      console.error("Veri hatası:", err);
      message.error("Sunucu hatası.");
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const filtered = dataSource.filter((item) => {
      const name = item.name?.toLowerCase() || "";
      const category = item.category?.name?.toLowerCase() || "";
      const subcategory = item.subcategory?.toLowerCase() || "";
      return (
        name.includes(search.toLowerCase()) ||
        category.includes(search.toLowerCase()) ||
        subcategory.includes(search.toLowerCase())
      );
    });
    setFilteredData(filtered);
  }, [search, dataSource]);

  const deleteProduct = async (id) => {
    try {
      const res = await fetch(`${apiUrl}/api/products/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Silme başarısız");

      message.success("Ürün başarıyla silindi.");
      setDataSource((prev) => prev.filter((p) => p._id !== id));
    } catch (err) {
      console.error("Silme hatası:", err);
      message.error("Sunucu hatası.");
    }
  };

  const columns = [
    {
      title: "Görsel",
      dataIndex: "_id",
      key: "img",
      render: (id) => (
        <img
          src={`${apiUrl}/api/products/${id}/image/mainImages/0`}
          alt="Ürün"
          width={100}
          loading="lazy"
        />
      ),
    },
    {
      title: "İsim",
      dataIndex: "name",
      key: "name",
      sorter: (a, b) => a.name.localeCompare(b.name),
      sortDirections: ["ascend", "descend"],
      render: (text) => <b>{text}</b>,
    },
    {
      title: "Kategori",
      dataIndex: ["category", "name"],
      key: "category",
      sorter: (a, b) =>
        (a.category?.name || "").localeCompare(b.category?.name || ""),
      sortDirections: ["ascend", "descend"],
      render: (_, record) => record.category?.name || "—",
    },
    {
      title: "Alt Kategori",
      dataIndex: "subcategory",
      key: "subcategory",
      sorter: (a, b) =>
        (a.subcategory || "").localeCompare(b.subcategory || ""),
      sortDirections: ["ascend", "descend"],
      render: (s) => s || "—",
    },
    {
      title: "İşlemler",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            onClick={() => navigate(`/admin/products/update/${record._id}`)}
          >
            Güncelle
          </Button>
          <Popconfirm
            title="Ürünü sil"
            description="Silmek istediğinizden emin misiniz?"
            okText="Evet"
            cancelText="Hayır"
            onConfirm={() => deleteProduct(record._id)}
          >
            <Button danger>Sil</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Row gutter={[0, 16]} style={{ marginBottom: "1rem" }}>
        <Col span={8}>
          <Input
            placeholder="Ürün ismi, kategori veya alt kategori ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
          />
        </Col>
      </Row>

      <Table
        dataSource={filteredData}
        columns={columns}
        rowKey={(r) => r._id}
        loading={loading}
        pagination={{ pageSize: 10 }}
      />
    </>
  );
};

export default ProductPage;
