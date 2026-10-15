import { Button, Popconfirm, Table, Tag, message, Input } from "antd";
import { useCallback, useEffect, useState } from "react";
import { fetchWithAuth } from "../../components/Auth/fetchWithAuth";
import { readError } from "../../config/api";
import "./UserPage.css";

const UserPage = () => {
  const [dataSource, setDataSource] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${apiUrl}/api/users`);
      if (!res.ok)
        throw new Error(await readError(res, "Veri getirme başarısız."));
      const responseData = await res.json();
      setDataSource(responseData.data || []);
    } catch (err) {
      message.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  const deleteUser = async (userId) => {
    try {
      const res = await fetchWithAuth(`${apiUrl}/api/users/${userId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await readError(res, "Silme başarısız."));
      message.success("Kullanıcı silindi.");
      fetchUsers();
    } catch (err) {
      message.error(err.message);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const columns = [
    {
      title: "Kullanıcı Adı",
      dataIndex: "username",
      key: "username",
    },
    {
      title: "E-posta",
      dataIndex: "email",
      key: "email",
    },
    {
      title: "Rol",
      dataIndex: "role",
      key: "role",
      render: (role) => (
        <Tag color={role === "admin" ? "gold" : "blue"}>
          {role === "admin" ? "Admin" : "Müşteri"}
        </Tag>
      ),
    },
    {
      title: "Kayıt Tarihi",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (d) => (d ? new Date(d).toLocaleDateString("tr-TR") : "-"),
    },
    {
      title: "İşlemler",
      key: "actions",
      render: (_, record) => (
        <Popconfirm
          title="Kullanıcıyı Sil"
          description="Kullanıcıyı silmek istediğinizden emin misiniz?"
          okText="Evet"
          cancelText="Hayır"
          onConfirm={() => deleteUser(record._id)}
        >
          <Button type="primary" danger>
            Sil
          </Button>
        </Popconfirm>
      ),
    },
  ];

  const query = searchText.trim().toLocaleLowerCase("tr");
  const filteredData = query
    ? dataSource.filter(
        (u) =>
          u.username?.toLocaleLowerCase("tr").includes(query) ||
          u.email?.toLocaleLowerCase("tr").includes(query)
      )
    : dataSource;

  return (
    <div
      className="page-container"
      style={{ overflow: "auto", height: "calc(100vh - 100px)" }}
    >
      <Input
        placeholder="Kullanıcı adı veya e-posta ile ara"
        value={searchText}
        allowClear
        onChange={(e) => setSearchText(e.target.value)}
        style={{ width: 300, maxWidth: "100%", marginBottom: 16 }}
      />
      <Table
        dataSource={filteredData}
        columns={columns}
        rowKey={(rec) => rec._id}
        loading={loading}
        className="user-page-table"
        scroll={{ x: "max-content" }}
      />
    </div>
  );
};

export default UserPage;
