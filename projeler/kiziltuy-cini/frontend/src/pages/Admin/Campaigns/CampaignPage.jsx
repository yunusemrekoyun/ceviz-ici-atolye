import { Button, Popconfirm, Space, Table, message } from "antd";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const CampaignPage = () => {
  const [dataSource, setDataSource] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  const columns = [
    {
      title: "Görsel",
      dataIndex: "_id",
      key: "background",
      render: (id) => (
        <img
          src={`${apiUrl}/api/campaigns/${id}/image`}
          alt="Campaign Visual"
          width={100}
        />
      ),
    },
    {
      title: "Başlık",
      dataIndex: "title",
      key: "title",
    },
    {
      title: "Açıklama",
      dataIndex: "description",
      key: "description",
    },
    {
      title: "Ürün Sayısı",
      dataIndex: "products",
      key: "products",
      render: (products) => products.length,
    },
    {
      title: "İşlem",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            onClick={() => navigate(`/admin/campaigns/update/${record._id}`)}
          >
            Güncelle
          </Button>
          <Popconfirm
            title="Kampanya Sil"
            description="Silmek istediğinizden emin misiniz?"
            onConfirm={() => deleteCampaign(record._id)}
            okText="Evet"
            cancelText="Hayır"
          >
            <Button danger>Sil</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const deleteCampaign = async (id) => {
    try {
      const res = await fetch(`${apiUrl}/api/campaigns/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Silme başarısız");

      message.success("Kampanya silindi");
      setDataSource((prev) => prev.filter((c) => c._id !== id));
    } catch (err) {
      message.error("Silme hatası");
      console.error(err);
    }
  };

  useEffect(() => {
    const fetchCampaigns = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${apiUrl}/api/campaigns?page=1&limit=100`);
        const result = await res.json();
        // result = { total, page, totalPages, campaigns: [… ] }
        setDataSource(result.campaigns);
      } catch (err) {
        console.error(err);
        message.error("Kampanyalar alınamadı");
      } finally {
        setLoading(false);
      }
    };
    fetchCampaigns();
  }, [apiUrl]);

  return (
    <Table
      dataSource={dataSource}
      columns={columns}
      rowKey={(record) => record._id}
      loading={loading}
    />
  );
};

export default CampaignPage;
