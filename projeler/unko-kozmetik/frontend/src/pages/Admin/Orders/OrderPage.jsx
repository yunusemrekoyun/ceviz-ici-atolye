import {
  Spin,
  Table,
  Select,
  message,
  Input,
  Card,
  Row,
  Col,
  Grid,
} from "antd";
import { useEffect, useState, useCallback } from "react";
import { fetchWithAuth } from "../../../components/Auth/fetchWithAuth";
import { readError } from "../../../config/api";
import { formatPrice } from "../../../utils/cart";
import AdminOrderDetailsModal from "./AdminOrderDetailsModal";

const { Option } = Select;
const { useBreakpoint } = Grid;

const STATUSES = [
  "Sipariş Alındı",
  "Sipariş Onaylandı",
  "Kargoya Verildi",
  "Teslim Edildi",
  "İptal Edildi",
];

const OrderPage = () => {
  const [dataSource, setDataSource] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const apiUrl = import.meta.env.VITE_API_BASE_URL;
  const screens = useBreakpoint();

  const term = searchTerm.trim().toLowerCase();
  const filteredOrders = term
    ? dataSource.filter(
        (order) =>
          order._id.toLowerCase().includes(term) ||
          order.email?.toLowerCase().includes(term) ||
          order.name?.toLocaleLowerCase("tr").includes(term)
      )
    : dataSource;

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${apiUrl}/api/orders/all`);
      if (!res.ok)
        throw new Error(await readError(res, "Siparişler alınamadı."));
      const resJson = await res.json();
      setDataSource(resJson.data || []);
    } catch (err) {
      message.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      const res = await fetchWithAuth(`${apiUrl}/api/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok)
        throw new Error(await readError(res, "Durum güncellenemedi."));
      message.success("Durum güncellendi.");
      fetchOrders();
    } catch (err) {
      message.error(err.message);
    }
  };

  const columns = [
    {
      title: "Sipariş No",
      dataIndex: "_id",
      key: "id",
      render: (id, record) => (
        <a onClick={() => setSelectedOrder(record)}>#{id.slice(-6)}</a>
      ),
    },
    {
      title: "Müşteri E-posta",
      dataIndex: "email",
      key: "email",
    },
    {
      title: "Sipariş Fiyatı",
      dataIndex: "total",
      key: "total",
      render: (total) => <b>{formatPrice(total)}</b>,
    },
    {
      title: "Durum",
      dataIndex: "status",
      key: "status",
      render: (status, record) => (
        <Select
          value={status}
          onChange={(val) => handleStatusChange(record._id, val)}
          style={{ width: 180 }}
        >
          {STATUSES.map((s) => (
            <Option key={s} value={s}>
              {s}
            </Option>
          ))}
        </Select>
      ),
    },
    {
      title: "Tarih",
      dataIndex: "createdAt",
      key: "date",
      render: (d) => new Date(d).toLocaleDateString("tr-TR"),
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    },
    {
      title: "Saat",
      dataIndex: "createdAt",
      key: "time",
      render: (d) =>
        new Date(d).toLocaleTimeString("tr-TR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
    },
  ];

  return (
    <>
      <div style={{ marginBottom: 16, textAlign: "center" }}>
        <Input.Search
          placeholder="Sipariş no, e-posta veya isim ile ara"
          allowClear
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: "100%", maxWidth: 300, margin: "0 auto" }}
        />
      </div>

      {/* Geniş ekranda tablo, mobilde kartlar */}
      {screens.md ? (
        <Spin spinning={loading}>
          <div style={{ overflowX: "auto", display: "block" }}>
            <Table
              dataSource={filteredOrders}
              columns={columns}
              rowKey={(rec) => rec._id}
              pagination={{ pageSize: 10 }}
              scroll={{ x: "max-content" }}
              style={{ width: "100%" }}
              locale={{ emptyText: "Henüz sipariş yok." }}
            />
          </div>
        </Spin>
      ) : (
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          {filteredOrders.map((order) => (
            <Col xs={24} sm={12} md={8} key={order._id}>
              <Card
                title={`Sipariş No: ${order._id.slice(-6)}`}
                extra={<a onClick={() => setSelectedOrder(order)}>Detaylar</a>}
                style={{ width: "100%" }}
              >
                <p>E-posta: {order.email}</p>
                <p>
                  Fiyat: <b>{formatPrice(order.total)}</b>
                </p>
                <Select
                  value={order.status}
                  onChange={(val) => handleStatusChange(order._id, val)}
                  style={{ width: "100%", marginBottom: 12 }}
                >
                  {STATUSES.map((s) => (
                    <Option key={s} value={s}>
                      {s}
                    </Option>
                  ))}
                </Select>
                <p>
                  Tarih: {new Date(order.createdAt).toLocaleDateString("tr-TR")}
                  <br />
                  Saat:{" "}
                  {new Date(order.createdAt).toLocaleTimeString("tr-TR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <AdminOrderDetailsModal
        visible={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        order={selectedOrder}
      />
    </>
  );
};

export default OrderPage;
