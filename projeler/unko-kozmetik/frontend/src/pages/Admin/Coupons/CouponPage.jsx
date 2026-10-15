import { Button, Popconfirm, Space, Table, message } from "antd";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchWithAuth } from "../../../components/Auth/fetchWithAuth";
import { readError } from "../../../config/api";
import "./CouponPage.css";

const CouponPage = () => {
  const [dataSource, setDataSource] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  const columns = [
    {
      title: "Kupon Kodu",
      dataIndex: "code",
      key: "code",
      render: (code) => <b>{code}</b>,
    },
    {
      title: "İndirim Oranı",
      dataIndex: "discountPercent",
      key: "discountPercent",
      render: (percent) => <span>%{percent}</span>,
    },
    {
      title: "İşlemler",
      dataIndex: "actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            onClick={() => navigate(`/admin/coupons/update/${record._id}`)}
          >
            Güncelle
          </Button>
          <Popconfirm
            title="Kuponu Sil"
            description="Kuponu silmek istediğinizden emin misiniz?"
            okText="Evet"
            cancelText="Hayır"
            onConfirm={() => deleteCoupon(record._id)}
          >
            <Button type="primary" danger>
              Sil
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchWithAuth(`${apiUrl}/api/coupons`);
      if (!response.ok)
        throw new Error(await readError(response, "Veri getirme başarısız."));
      const responseData = await response.json();
      setDataSource(responseData.data || []);
    } catch (error) {
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  const deleteCoupon = async (couponId) => {
    try {
      const response = await fetchWithAuth(
        `${apiUrl}/api/coupons/${couponId}`,
        {
          method: "DELETE",
        }
      );
      if (!response.ok)
        throw new Error(await readError(response, "Silme işlemi başarısız."));
      message.success("Kupon başarıyla silindi.");
      fetchCoupons();
    } catch (error) {
      message.error(error.message);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  return (
    <div
      className="page-container"
      style={{ overflow: "auto", height: "calc(100vh - 100px)" }}
    >
      <Table
        dataSource={dataSource}
        columns={columns}
        rowKey={(record) => record._id}
        loading={loading}
        className="coupon-page-table"
      />
    </div>
  );
};

export default CouponPage;
