import { useState, useEffect } from "react";
import { Row, Col, Card, Statistic, message } from "antd";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { fetchWithAuth } from "../../components/Auth/fetchWithAuth";

const DashboardPage = () => {
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSales: 0,
    totalOrders: 0,
    totalCustomers: 0,
    totalRevenue: 0,
    monthlyProductSales: [],
    monthlyCustomerGrowth: [],
  });

  useEffect(() => {
    const load = async () => {
      try {
        // Token süresi dolmuşsa fetchWithAuth otomatik yeniler
        const res = await fetchWithAuth(`${apiUrl}/api/dashboard`);
        if (!res.ok) throw new Error("Veri alınamadı");
        const resJson = await res.json();
        setStats((prev) => ({ ...prev, ...resJson.data }));
      } catch (err) {
        console.error("Dashboard yükleme hatası:", err);
        message.error("Dashboard verileri alınamadı.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [apiUrl]);

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic title="Toplam Sipariş" value={stats.totalOrders} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic title="Toplam Ürün Satışı" value={stats.totalSales} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic
              title="Toplam Müşteri Sayısı"
              value={stats.totalCustomers}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card loading={loading}>
            <Statistic
              title="Toplam Gelir"
              value={stats.totalRevenue}
              precision={2}
              prefix="₺"
              groupSeparator="."
              decimalSeparator=","
            />
          </Card>
        </Col>
      </Row>

      <Card style={{ marginTop: 20 }}>
        <h2>Son 6 Aydaki Ürün Satış Artışı</h2>
        <div style={{ width: "100%", height: 300 }}>
          <ResponsiveContainer>
            <LineChart
              data={stats.monthlyProductSales}
              margin={{ top: 5, right: 30, bottom: 5 }}
            >
              <XAxis dataKey="month" />
              <YAxis allowDecimals={false} />
              <CartesianGrid strokeDasharray="3 3" />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="count"
                name="Satış Adedi"
                stroke="#8884d8"
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card style={{ marginTop: 20 }}>
        <h2>Son 6 Aydaki Müşteri Artışı</h2>
        <div style={{ width: "100%", height: 300 }}>
          <ResponsiveContainer>
            <LineChart
              data={stats.monthlyCustomerGrowth}
              margin={{ top: 5, right: 30, bottom: 5 }}
            >
              <XAxis dataKey="month" />
              <YAxis allowDecimals={false} />
              <CartesianGrid strokeDasharray="3 3" />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="count"
                name="Yeni Müşteri"
                stroke="#82ca9d"
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};

export default DashboardPage;
