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
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const CategoryPage = () => {
  const [dataSource, setDataSource] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  const columns = [
    {
      title: "Kategori Görseli",
      dataIndex: "_id",
      key: "img",
      render: (id) => (
        <img
          src={`${apiUrl}/api/categories/${id}/image`}
          alt="Kategori"
          width={100}
          loading="lazy"
        />
      ),
    },
    {
      title: "Kategori Adı",
      dataIndex: "name",
      key: "name",
      sorter: (a, b) => a.name.localeCompare(b.name),
      sortDirections: ["ascend", "descend"],
      render: (text) => <b>{text}</b>,
    },
    {
      title: "Alt Kategoriler",
      dataIndex: "subcategories",
      key: "subcategories",
      sorter: (a, b) =>
        (a.subcategories?.join(" ") || "").localeCompare(
          b.subcategories?.join(" ") || ""
        ),
      sortDirections: ["ascend", "descend"],
      render: (subs) =>
        subs && subs.length > 0 ? subs.join(", ") : <span>—</span>,
    },
    {
      title: "İşlemler",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            onClick={() => navigate(`/admin/categories/update/${record._id}`)}
          >
            Güncelle
          </Button>
          <Popconfirm
            title="Kategoriyi Sil"
            description="Silmek istediğinizden emin misiniz?"
            okText="Evet"
            cancelText="Hayır"
            onConfirm={() => deleteCategory(record._id)}
          >
            <Button type="primary" danger>
              Sil
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/categories`);
      if (response.ok) {
        const data = await response.json();
        setDataSource(data);
        setFilteredData(data);
      } else {
        message.error("Veri getirme başarısız.");
      }
    } catch (error) {
      console.log("Veri hatası:", error);
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  const deleteCategory = async (categoryId) => {
    try {
      const response = await fetch(`${apiUrl}/api/categories/${categoryId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        message.success("Kategori başarıyla silindi.");
        fetchCategories();
      } else {
        message.error("Silme işlemi başarısız.");
      }
    } catch (error) {
      console.log("Silme hatası:", error);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    const filtered = dataSource.filter((item) => {
      const name = item.name?.toLowerCase() || "";
      const subcats = item.subcategories?.join(", ")?.toLowerCase() || "";
      return (
        name.includes(search.toLowerCase()) ||
        subcats.includes(search.toLowerCase())
      );
    });
    setFilteredData(filtered);
  }, [search, dataSource]);

  return (
    <>
      <Row gutter={[0, 16]} style={{ marginBottom: "1rem" }}>
        <Col span={8}>
          <Input
            placeholder="Kategori veya alt kategori ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
          />
        </Col>
      </Row>

      <Table
        dataSource={filteredData}
        columns={columns}
        rowKey={(record) => record._id}
        loading={loading}
        pagination={{ pageSize: 10 }}
      />
    </>
  );
};

export default CategoryPage;
