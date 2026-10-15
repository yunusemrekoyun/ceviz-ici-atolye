import { Suspense, useEffect, useState, useRef } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import { ConfigProvider, Layout, Menu, Button, Grid, Modal, Spin } from "antd";
import {
  MenuOutlined,
  UserOutlined,
  LaptopOutlined,
  RollbackOutlined,
  BarcodeOutlined,
  DashboardOutlined,
  ShoppingCartOutlined,
  AppstoreOutlined,
  CommentOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import { logout } from "../utils/auth";

const { Sider, Header, Content } = Layout;
const { useBreakpoint } = Grid;

// Admin paneli koyu mürekkep tonunda; seçili menü öğesi vurgu renginde
const ADMIN_THEME = {
  components: {
    Layout: { siderBg: "#241b1e", headerBg: "#241b1e" },
    Menu: {
      darkItemBg: "#241b1e",
      darkSubMenuItemBg: "#1c1517",
      darkItemSelectedBg: "#9b4a5c",
      darkItemHoverBg: "#3a2d31",
      darkItemColor: "rgba(255, 255, 255, 0.72)",
    },
  },
};

// Menü anahtarları rota yollarıdır; böylece açık sayfa menüde seçili görünür
const MENU_ITEMS = [
  { key: "/admin", icon: <DashboardOutlined />, label: "Dashboard" },
  {
    key: "categories",
    icon: <AppstoreOutlined />,
    label: "Kategoriler",
    children: [
      { key: "/admin/categories", label: "Kategori Listesi" },
      { key: "/admin/categories/create", label: "Yeni Kategori Oluştur" },
    ],
  },
  {
    key: "products",
    icon: <LaptopOutlined />,
    label: "Ürünler",
    children: [
      { key: "/admin/products", label: "Ürün Listesi" },
      { key: "/admin/products/create", label: "Yeni Ürün Oluştur" },
      { key: "/admin/products/discounts", label: "İndirimli Ürünler" },
    ],
  },
  {
    key: "coupons",
    icon: <BarcodeOutlined />,
    label: "Kuponlar",
    children: [
      { key: "/admin/coupons", label: "Kupon Listesi" },
      { key: "/admin/coupons/create", label: "Yeni Kupon Oluştur" },
    ],
  },
  { key: "/admin/users", icon: <UserOutlined />, label: "Kullanıcı Listesi" },
  { key: "/admin/orders", icon: <ShoppingCartOutlined />, label: "Siparişler" },
  { key: "/admin/comments", icon: <CommentOutlined />, label: "Yorumlar" },
  { key: "/", icon: <RollbackOutlined />, label: "Ana Sayfa" },
  { key: "logout", icon: <LogoutOutlined />, label: "Çıkış Yap" },
];

const AdminLayout = ({ children }) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const screens = useBreakpoint();
  const [mobileMenuVisible, setMobileMenuVisible] = useState(false);
  const menuRef = useRef(null);

  // Handle menu toggle (open/close)
  const toggleCollapsed = () => {
    setMobileMenuVisible((prevState) => !prevState);
  };

  // Handle click outside the menu to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMobileMenuVisible(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleMenuClick = ({ key }) => {
    if (key === "logout") {
      Modal.confirm({
        title: "Çıkış Yap",
        content: "Çıkış yapmak istediğinize emin misiniz?",
        okText: "Evet",
        cancelText: "Hayır",
        onOk: async () => {
          await logout();
          window.location.href = "/";
        },
      });
      return;
    }
    navigate(key);
    if (!screens.md) {
      setMobileMenuVisible(false); // Close the menu when an item is clicked
    }
  };

  // Güncelleme sayfalarında ilgili liste seçili görünsün
  const selectedKey =
    pathname.replace(/\/update\/[^/]+$/, "").replace(/\/$/, "") || "/admin";

  return (
    <ConfigProvider theme={ADMIN_THEME}>
      <Layout style={{ minHeight: "100vh" }}>
        <Sider
          breakpoint="md"
          collapsedWidth="0"
          collapsed={!screens.md && !mobileMenuVisible}
          onCollapse={(collapsed) => setMobileMenuVisible(!collapsed)}
          width={220}
          theme="dark"
          ref={menuRef}
          trigger={null}
        >
          <Menu
            mode="inline"
            theme="dark"
            style={{ height: "100%" }}
            items={MENU_ITEMS}
            selectedKeys={[selectedKey]}
            defaultOpenKeys={["categories", "products", "coupons"]}
            onClick={handleMenuClick}
          />
        </Sider>

        <Layout>
          <Header
            style={{
              backgroundColor: "#241b1e",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 16px",
            }}
          >
            <div style={{ color: "white", fontSize: "18px" }}>
              ÜnKo Kozmetik · Admin Panel
            </div>
            {!screens.md && (
              <Button
                icon={<MenuOutlined />}
                type="primary"
                onClick={toggleCollapsed} // Toggle mobile menu visibility
                style={{ border: "none" }}
                aria-label="Menü"
              />
            )}
          </Header>

          <Content style={{ padding: 24 }}>
            {children}
            <Suspense
              fallback={
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    padding: 60,
                  }}
                >
                  <Spin size="large" />
                </div>
              }
            >
              <Outlet />
            </Suspense>
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
};

AdminLayout.propTypes = {
  children: PropTypes.node,
};

export default AdminLayout;
