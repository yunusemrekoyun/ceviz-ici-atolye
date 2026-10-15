import { Layout, Menu } from "antd";
import PropTypes from "prop-types";
import {
  DashboardOutlined,
  FolderOpenOutlined,
  ShoppingOutlined,
  CommentOutlined,
  ReadOutlined,
  GiftOutlined,
  UserOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

const { Sider, Header, Content } = Layout;

const getUserRole = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  return user ? user.role : null;
};

const AdminLayout = ({ children }) => {
  const navigate = useNavigate();
  const userRole = getUserRole();

  /** -------------------- MENÜ -------------------- **/
  const menuItems = [
    // 1 – Dashboard
    {
      key: "1",
      icon: <DashboardOutlined />,
      label: "Dashboard",
      path: "/admin",
      onClick: () => navigate("/admin"),
    },

    // 2 – Kategoriler
    {
      key: "2",
      icon: <FolderOpenOutlined />,
      label: "Kategoriler",
      children: [
        {
          key: "2-1",
          label: "Kategori Listesi",
          path: "/admin/categories",
          onClick: () => navigate("/admin/categories"),
        },
        {
          key: "2-2",
          label: "Yeni Kategori Oluştur",
          path: "/admin/categories/create",
          onClick: () => navigate("/admin/categories/create"),
        },
      ],
    },

    // 3 – Ürünler
    {
      key: "3",
      icon: <ShoppingOutlined />,
      label: "Ürünler",
      children: [
        {
          key: "3-1",
          label: "Ürün Listesi",
          path: "/admin/products",
          onClick: () => navigate("/admin/products"),
        },
        {
          key: "3-2",
          label: "Yeni Ürün Oluştur",
          path: "/admin/products/create",
          onClick: () => navigate("/admin/products/create"),
        },
      ],
    },

    // 4 – Yorumlar
    {
      key: "4",
      icon: <CommentOutlined />,
      label: "Yorumlar",
      children: [
        {
          key: "4-1",
          label: "Onay Bekleyen Yorumlar",
          path: "/admin/reviews/pending",
          onClick: () => navigate("/admin/reviews/pending"),
        },
        {
          key: "4-2",
          label: "Onaylanan Yorumlar",
          path: "/admin/reviews/approved",
          onClick: () => navigate("/admin/reviews/approved"),
        },
      ],
    },

    // 5 – Bloglar
    {
      key: "5",
      icon: <ReadOutlined />,
      label: "Bloglar",
      children: [
        {
          key: "5-1",
          label: "Blog Listesi",
          path: "/admin/blogs",
          onClick: () => navigate("/admin/blogs"),
        },
        {
          key: "5-2",
          label: "Yeni Blog Oluştur",
          path: "/admin/blogs/create",
          onClick: () => navigate("/admin/blogs/create"),
        },
      ],
    },

    // 6 – Kampanyalar
    {
      key: "6",
      icon: <GiftOutlined />,
      label: "Kampanyalar",
      children: [
        {
          key: "6-1",
          label: "Kampanya Listesi",
          path: "/admin/campaigns",
          onClick: () => navigate("/admin/campaigns"),
        },
        {
          key: "6-2",
          label: "Yeni Kampanya Oluştur",
          path: "/admin/campaigns/create",
          onClick: () => navigate("/admin/campaigns/create"),
        },
      ],
    },

    // 7 – Kullanıcılar
    {
      key: "7",
      icon: <UserOutlined />,
      label: "Kullanıcı Listesi",
      path: "/admin/users",
      onClick: () => navigate("/admin/users"),
    },

    // 8 – Ana Sayfa
    {
      key: "8",
      icon: <HomeOutlined />,
      label: "Ana Sayfaya Git",
      onClick: () => (window.location.href = "/"),
    },
  ];
  /** ------------------------------------------------ */

  // Aktif menü öğesini belirle
  const getActiveKey = () => {
    for (const item of menuItems) {
      if (item.children) {
        for (const child of item.children) {
          if (child.path === window.location.pathname) return child.key;
        }
      } else if (item.path === window.location.pathname) {
        return item.key;
      }
    }
  };

  // Sayfa başlığı
  const getPageTitle = () => {
    for (const item of menuItems) {
      if (item.children) {
        for (const child of item.children) {
          if (child.path === window.location.pathname) return child.label;
        }
      } else if (item.path === window.location.pathname) {
        return item.label;
      }
    }
  };

  /** ------------- YETKİ KONTROLÜ -------------- **/
  if (userRole !== "admin") {
    window.location.href = "/";
    return null;
  }
  /** ------------------------------------------- **/

  return (
    <div className="admin-layout">
      <Layout style={{ minHeight: "100vh" }}>
        <Sider width={200} theme="dark">
          <Menu
            mode="vertical"
            style={{ height: "100%" }}
            items={menuItems}
            defaultSelectedKeys={[getActiveKey()]}
          />
        </Sider>

        <Layout>
          <Header>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                color: "white",
              }}
            >
              <h2>{getPageTitle()}</h2>
              <h2>Admin Paneli</h2>
            </div>
          </Header>

          <Content>
            <div
              className="site-layout-background"
              style={{ padding: "24px 50px", minHeight: 360 }}
            >
              {children}
            </div>
          </Content>
        </Layout>
      </Layout>
    </div>
  );
};

AdminLayout.propTypes = {
  children: PropTypes.node,
};

export default AdminLayout;
