import { Button, Popconfirm, Space, Table, message, Input } from "antd";
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { fetchWithAuth } from "../../../components/Auth/fetchWithAuth";
import { imageUrl, readError } from "../../../config/api";
import { formatPrice } from "../../../utils/cart";
const { Search } = Input;

const ProductPage = () => {
  const [dataSource, setDataSource] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const navigate = useNavigate();
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  // Ürün silme fonksiyonu
  const deleteProduct = async (productId) => {
    try {
      const response = await fetchWithAuth(
        `${apiUrl}/api/products/${productId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok)
        throw new Error(await readError(response, "Silme işlemi başarısız."));
      message.success("Ürün başarıyla silindi.");
      setDataSource((prev) =>
        prev.filter((product) => product._id !== productId)
      );
    } catch (error) {
      message.error(error.message);
    }
  };

  // Tablo kolonları
  const columns = [
    {
      title: "Görsel",
      dataIndex: "img",
      key: "img",
      render: (images, record) => (
        <img
          src={imageUrl(images?.[0])}
          alt={record.name}
          width={80}
          loading="lazy"
        />
      ),
    },
    {
      title: "Ürün Adı",
      dataIndex: "name",
      key: "name",
      render: (text) => <b>{text}</b>,
    },
    {
      title: "Kategori",
      dataIndex: "categoryName",
      key: "categoryName",
    },
    {
      title: "Marka",
      dataIndex: "brand",
      key: "brand",
      render: (brand) => brand?.toUpperCase(),
    },
    {
      title: "Fiyat",
      dataIndex: "price",
      key: "price",
      render: (price) => <span>{formatPrice(price.current)}</span>,
    },
    {
      title: "İndirim",
      dataIndex: "price",
      key: "discount",
      render: (price) => <span>%{price.discount}</span>,
    },
    {
      title: "İşlemler",
      key: "actions",
      render: (_, record) => (
        <Space direction="vertical" size="small">
          <Button
            type="primary"
            size="small"
            onClick={() => navigate(`/admin/products/update/${record._id}`)}
          >
            Güncelle
          </Button>
          <Popconfirm
            title="Ürünü sil"
            description="Silmek istediğinize emin misiniz?"
            okText="Evet"
            cancelText="Hayır"
            onConfirm={() => deleteProduct(record._id)}
          >
            <Button type="primary" danger size="small">
              Sil
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // Verileri çekme
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [categoriesRes, productsRes] = await Promise.all([
        fetch(`${apiUrl}/api/categories`),
        fetch(`${apiUrl}/api/products`),
      ]);
      if (!categoriesRes.ok || !productsRes.ok) {
        throw new Error();
      }
      const [categoriesRaw, productsData] = await Promise.all([
        categoriesRes.json(),
        productsRes.json(),
      ]);
      const categoriesData = categoriesRaw.data; // sadece data kısmı

      const withCatName = productsData.map((prod) => {
        const cat = categoriesData.find((c) => c._id === prod.category);
        return {
          ...prod,
          categoryName: cat ? cat.name : "",
        };
      });

      setDataSource(withCatName);
    } catch (err) {
      console.error("Veri getirme hatası:", err);
      message.error("Veri getirme başarısız.");
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Arama metnine göre filtre
  const filteredData = dataSource.filter((item) =>
    item.name
      .toLocaleLowerCase("tr")
      .includes(searchText.toLocaleLowerCase("tr"))
  );

  return (
    <>
      <div style={{ overflowX: "auto", height: "100vh" }}>
        <Search
          placeholder="Ürün adına göre ara"
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
          dataSource={filteredData}
          columns={columns}
          rowKey={(record) => record._id}
          loading={loading}
          pagination={{ pageSize: 10 }} // Pagination ekledik
          responsive // Responsive yapı
          scroll={{ x: false }} // Yatay kaydırmayı kaldırdık
          className="ant-table" // Tabloya stil ekledik
        />
      </div>
    </>
  );
};

export default ProductPage;
