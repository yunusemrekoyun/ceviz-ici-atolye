import { Button, Popconfirm, Space, Table, message, Input } from "antd";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchWithAuth } from "../../../components/Auth/fetchWithAuth";
import { readError } from "../../../config/api";
import { invalidateCategories } from "../../../hooks/useCategories";
import "./CategoryPage.css";

const { Search } = Input;

const CategoryPage = () => {
  const [dataSource, setDataSource] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const navigate = useNavigate();
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/categories`);
      if (!res.ok) throw new Error();
      const response = await res.json();
      setDataSource(response.data || []);
    } catch {
      message.error("Veri getirme başarısız.");
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const deleteCategory = async (categoryId) => {
    try {
      const res = await fetchWithAuth(
        `${apiUrl}/api/categories/${categoryId}`,
        {
          method: "DELETE",
        }
      );
      if (!res.ok) throw new Error(await readError(res, "Silme hatası."));
      invalidateCategories();
      message.success("Kategori silindi.");
      fetchCategories();
    } catch (err) {
      message.error(err.message);
    }
  };

  // Arama metnine göre filtrelenmiş liste
  const filteredData = dataSource.filter((cat) =>
    cat.name
      .toLocaleLowerCase("tr")
      .includes(searchText.toLocaleLowerCase("tr"))
  );

  const columns = [
    {
      title: "Kategori",
      dataIndex: "name",
      key: "name",
      render: (text) => <b>{text}</b>,
    },
    {
      title: "Menü Grubu",
      dataIndex: "group",
      key: "group",
      render: (group) => group || "-",
    },
    {
      title: "Markalar",
      dataIndex: "brands",
      key: "brands",
      render: (brands) => brands.join(", "),
    },
    {
      title: "İşlemler",
      key: "actions",
      render: (_, record) => (
        <Space direction="vertical" size="small">
          <Button
            type="primary"
            size="small"
            onClick={() => navigate(`/admin/categories/update/${record._id}`)}
          >
            Güncelle
          </Button>
          <Popconfirm
            title="Kategoriyi sil"
            description="Silmek istediğinizden emin misiniz?"
            okText="Evet"
            cancelText="Hayır"
            onConfirm={() => deleteCategory(record._id)}
          >
            <Button type="primary" danger size="small">
              Sil
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="page-container">
      <Search
        placeholder="Kategori adına göre ara"
        allowClear
        onChange={(e) => setSearchText(e.target.value)}
        style={{
          width: "100%",
          maxWidth: 300,
          marginBottom: 16,
          marginLeft: "auto",
          marginRight: "auto",
        }}
      />
      <Table
        rowKey="_id"
        dataSource={filteredData}
        columns={columns}
        loading={loading}
        pagination={{ pageSize: 10 }}
        scroll={{ x: "max-content" }}
        responsive
        className="category-page-table"
      />
    </div>
  );
};

export default CategoryPage;
