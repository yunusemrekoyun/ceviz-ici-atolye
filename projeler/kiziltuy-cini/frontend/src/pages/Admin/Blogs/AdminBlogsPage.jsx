import { Button, Popconfirm, Space, Table, message } from "antd";
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

const AdminBlogsPage = () => {
  const [dataSource, setDataSource] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/blogs`);
      if (!res.ok) throw new Error("Fetch error");
      const data = await res.json();
      setDataSource(data);
    } catch (err) {
      console.error(err);
      message.error("Bloglar yüklenemedi.");
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const deleteBlog = async (blogId) => {
    try {
      const res = await fetch(`${apiUrl}/api/blogs/${blogId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      message.success("Blog silindi.");
      setDataSource((prev) => prev.filter((b) => b.blogId !== blogId));
    } catch (err) {
      console.error(err);
      message.error("Blog silme hatası.");
    }
  };

  const columns = [
    {
      title: "Blog ID",
      dataIndex: "blogId",
      key: "blogId",
    },
    {
      title: "Görsel",
      dataIndex: "blogId", // 🔁 artık blogId kullanıyoruz
      key: "image",
      render: (blogId) => (
        <img
          src={`${apiUrl}/api/blogs/${blogId}/image/0`}
          alt="Kapak"
          width={100}
          onError={(e) => (e.target.src = "/img/fallback.jpg")}
        />
      ),
    },
    {
      title: "Başlık",
      dataIndex: "title",
      key: "title",
      render: (text) => <b>{text}</b>,
    },
    {
      title: "Tarih",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (dt) => new Date(dt).toLocaleDateString(),
    },
    {
      title: "Beğeni",
      dataIndex: "likedBy",
      key: "likes",
      render: (arr) => (Array.isArray(arr) ? arr.length : 0),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            onClick={() => navigate(`/admin/blogs/update/${record.blogId}`)}
          >
            Güncelle
          </Button>
          <Popconfirm
            title="Bu blogu silmek istediğinize emin misiniz?"
            okText="Evet"
            cancelText="Hayır"
            onConfirm={() => deleteBlog(record.blogId)}
          >
            <Button danger>Sil</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Table
      dataSource={dataSource}
      columns={columns}
      rowKey={(r) => r.blogId}
      loading={loading}
    />
  );
};

export default AdminBlogsPage;
