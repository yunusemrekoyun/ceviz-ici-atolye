import { useEffect, useState } from "react";
import { Row, Col, Card, Statistic } from "antd";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

const DashboardPage = () => {
  const [productTimeData, setProductTimeData] = useState([]);
  const [blogTimeData, setBlogTimeData] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalProductLikes, setTotalProductLikes] = useState(0);
  const [totalBlogLikes, setTotalBlogLikes] = useState(0);
  const [totalVisitedProductsThisMonth, setTotalVisitedProductsThisMonth] =
    useState(0);

  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    const fetchVisitDurations = async () => {
      try {
        const [productRes, blogRes] = await Promise.all([
          fetch(`${apiUrl}/api/visits/total-duration?type=product`),
          fetch(`${apiUrl}/api/visits/total-duration?type=blog`),
        ]);

        const productData = await productRes.json();
        const blogData = await blogRes.json();

        const formatData = (arr) =>
          arr.map((item) => ({
            name: item.name,
            harcananSure: Math.round(item.totalDuration / 1000 / 60), // dakika
          }));

        setProductTimeData(formatData(productData).slice(0, 10)); // ilk 10 ürün
        setBlogTimeData(formatData(blogData).slice(0, 10)); // ilk 10 blog
      } catch (err) {
        console.error("Ziyaret süresi verisi alınamadı:", err);
      }
    };

    const fetchGeneralStats = async () => {
      try {
        const [usersRes, productLikesRes, blogLikesRes, monthlyVisitedRes] =
          await Promise.all([
            fetch(`${apiUrl}/api/users/count`),
            fetch(`${apiUrl}/api/users/favorites/total-count`),
            fetch(`${apiUrl}/api/blogs/likes/total-count`),
            fetch(`${apiUrl}/api/visits/monthly-unique-products`),
          ]);

        const users = await usersRes.json();
        const productLikes = await productLikesRes.json();
        const blogLikes = await blogLikesRes.json();
        const monthlyVisited = await monthlyVisitedRes.json();

        setTotalUsers(users.total);
        setTotalProductLikes(productLikes.total);
        setTotalBlogLikes(blogLikes.total);
        setTotalVisitedProductsThisMonth(monthlyVisited.total);
      } catch (err) {
        console.error("Genel istatistikler alınamadı:", err);
      }
    };

    fetchVisitDurations();
    fetchGeneralStats();
  }, [apiUrl]);

  return (
    <div>
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Bu Ayki Ziyaret Edilen Ürün Sayısı"
              value={totalVisitedProductsThisMonth}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Toplam Kullanıcı Sayısı" value={totalUsers} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Toplam Ürün Beğenisi" value={totalProductLikes} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Toplam Blog Beğenisi" value={totalBlogLikes} />
          </Card>
        </Col>
      </Row>

      <Card style={{ marginTop: 20 }}>
        <h2>Hangi Üründe Ne Kadar Vakit Harcandı (Dakika)</h2>
        <BarChart width={800} height={300} data={productTimeData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="name"
            tickFormatter={(val) =>
              val.length > 10 ? val.slice(0, 10) + "…" : val
            }
          />
          <YAxis />
          <Tooltip formatter={(v) => `${v} dakika`} />
          <Legend />
          <Bar dataKey="harcananSure" fill="#8884d8" />
        </BarChart>
      </Card>

      <Card style={{ marginTop: 20 }}>
        <h2>Hangi Blogda Ne Kadar Vakit Harcandı (Dakika)</h2>
        <BarChart width={800} height={300} data={blogTimeData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="name"
            tickFormatter={(val) =>
              val.length > 10 ? val.slice(0, 10) + "…" : val
            }
          />
          <YAxis />
          <Tooltip formatter={(v) => `${v} dakika`} />
          <Legend />
          <Bar dataKey="harcananSure" fill="#82ca9d" />
        </BarChart>
      </Card>
    </div>
  );
};

export default DashboardPage;
