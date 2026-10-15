import { Table, Form, Input, Button, message, Collapse, Tag } from "antd";
import { useState, useEffect, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { fetchWithAuth } from "../components/Auth/fetchWithAuth";
import { readError } from "../config/api";
import { isLoggedIn } from "../utils/auth";
import { formatPrice } from "../utils/cart";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import OrderDetailsModal from "../components/Orders/OrderDetailModal";
import "./UserAccountPage.css";

const STATUS_COLORS = {
  "Sipariş Alındı": "blue",
  "Sipariş Onaylandı": "cyan",
  "Kargoya Verildi": "orange",
  "Teslim Edildi": "green",
  "İptal Edildi": "red",
};

const UserAccountPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  const [userInfo, setUserInfo] = useState(null);
  const [addressData, setAddressData] = useState(null);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [modalOrder, setModalOrder] = useState(null);
  const [activeKey, setActiveKey] = useState(location.state?.tab || "profile");

  const [profileForm] = Form.useForm();
  const [addressForm] = Form.useForm();

  // 1) Giriş yapılmamışsa giriş sayfasına yönlendir
  const fetchUserInfo = useCallback(async () => {
    if (!isLoggedIn()) {
      navigate("/auth", { state: { from: "/account" } });
      return;
    }
    try {
      const res = await fetchWithAuth(`${apiUrl}/api/auth/me`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setUserInfo(data);
      profileForm.setFieldsValue({
        username: data.username,
        email: data.email,
      });
    } catch {
      message.error("Kullanıcı bilgileri alınamadı.");
    }
  }, [apiUrl, navigate, profileForm]);

  const fetchAddress = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`${apiUrl}/api/address`);
      if (!res.ok) throw new Error();
      const { data } = await res.json();
      setAddressData(data[0] || null);
    } catch {
      message.error("Adres bilgisi alınamadı.");
    }
  }, [apiUrl]);

  const fetchOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const res = await fetchWithAuth(`${apiUrl}/api/orders`);
      if (!res.ok) throw new Error();
      const { data } = await res.json();
      setOrders(data || []);
    } catch {
      message.error("Siparişler alınamadı.");
    } finally {
      setOrdersLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchUserInfo();
  }, [fetchUserInfo]);

  // Açık bölümün verisini yükle
  useEffect(() => {
    if (!userInfo) return;
    if (activeKey === "address") fetchAddress();
    if (activeKey === "orders") fetchOrders();
  }, [activeKey, userInfo, fetchAddress, fetchOrders]);

  // Adres verisi geldikçe formu güncelle
  useEffect(() => {
    addressForm.setFieldsValue({
      email: userInfo?.email || "",
      name: addressData?.name || userInfo?.username || "",
      address: addressData?.address || "",
      district: addressData?.district || "",
      phone: addressData?.phone || "",
      city: addressData?.city || "",
    });
  }, [addressData, userInfo, addressForm]);

  const handleProfileSubmit = async (values) => {
    try {
      const { username, oldPassword, newPassword, confirmPassword } = values;
      const profileRes = await fetchWithAuth(`${apiUrl}/api/auth/me`, {
        method: "PUT",
        body: JSON.stringify({ username }),
      });
      if (!profileRes.ok) {
        throw new Error(
          await readError(profileRes, "Profil güncelleme başarısız.")
        );
      }

      if (oldPassword) {
        const passRes = await fetchWithAuth(
          `${apiUrl}/api/auth/change-password`,
          {
            method: "PUT",
            body: JSON.stringify({ oldPassword, newPassword, confirmPassword }),
          }
        );
        if (!passRes.ok) {
          throw new Error(
            await readError(passRes, "Şifre güncelleme başarısız.")
          );
        }
        message.success("Şifreniz başarıyla güncellendi.");
      }

      message.success("Profiliniz güncellendi.");
      fetchUserInfo();
      profileForm.resetFields([
        "oldPassword",
        "newPassword",
        "confirmPassword",
      ]);
    } catch (err) {
      message.error(err.message);
    }
  };

  const profileFormJsx = (
    <Form form={profileForm} layout="vertical" onFinish={handleProfileSubmit}>
      <Form.Item
        label="Kullanıcı Adı"
        name="username"
        rules={[
          {
            required: true,
            min: 2,
            message: "Kullanıcı adı en az 2 karakter olmalıdır.",
          },
        ]}
      >
        <Input />
      </Form.Item>
      <Form.Item label="E-posta" name="email">
        <Input disabled />
      </Form.Item>
      <Form.Item
        label="Eski Şifre"
        name="oldPassword"
        tooltip="Şifrenizi değiştirmek için girin"
      >
        <Input.Password
          placeholder="Eski şifreniz"
          autoComplete="current-password"
        />
      </Form.Item>
      <Form.Item
        label="Yeni Şifre"
        name="newPassword"
        dependencies={["oldPassword"]}
        rules={[
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (!getFieldValue("oldPassword")) return Promise.resolve();
              if (!value) return Promise.reject("Yeni şifre zorunludur.");
              if (value.length < 6)
                return Promise.reject("En az 6 karakter girin.");
              return Promise.resolve();
            },
          }),
        ]}
      >
        <Input.Password
          placeholder="Yeni şifreniz"
          autoComplete="new-password"
        />
      </Form.Item>
      <Form.Item
        label="Yeni Şifre (Tekrar)"
        name="confirmPassword"
        dependencies={["newPassword"]}
        rules={[
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (!getFieldValue("newPassword")) return Promise.resolve();
              if (value !== getFieldValue("newPassword"))
                return Promise.reject("Şifreler eşleşmiyor.");
              return Promise.resolve();
            },
          }),
        ]}
      >
        <Input.Password
          placeholder="Yeni şifreniz (tekrar)"
          autoComplete="new-password"
        />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit">
          Güncelle
        </Button>
      </Form.Item>
    </Form>
  );

  const handleAddressSubmit = async ({
    name,
    address,
    district,
    phone,
    city,
  }) => {
    try {
      const url = addressData
        ? `${apiUrl}/api/address/${addressData._id}`
        : `${apiUrl}/api/address/add`;
      const res = await fetchWithAuth(url, {
        method: addressData ? "PUT" : "POST",
        body: JSON.stringify({ name, address, district, phone, city }),
      });
      if (!res.ok)
        throw new Error(await readError(res, "Adres kaydedilemedi."));
      const { data } = await res.json();
      setAddressData(data);
      message.success("Adres kaydedildi.");
    } catch (err) {
      message.error(err.message);
    }
  };

  const addressFormJsx = (
    <Form form={addressForm} layout="vertical" onFinish={handleAddressSubmit}>
      <Form.Item label="E-posta" name="email">
        <Input disabled />
      </Form.Item>
      <Form.Item
        label="Ad Soyad"
        name="name"
        rules={[{ required: true, message: "Ad soyad zorunludur!" }]}
      >
        <Input />
      </Form.Item>
      <Form.Item
        label="Adres"
        name="address"
        rules={[{ required: true, message: "Adres zorunludur!" }]}
      >
        <Input />
      </Form.Item>
      <Form.Item label="İlçe (Opsiyonel)" name="district">
        <Input />
      </Form.Item>
      <Form.Item
        label="Telefon Numarası"
        name="phone"
        rules={[
          { required: true, message: "Telefon numarası zorunludur!" },
          {
            validator: (_, value) =>
              !value || String(value).replace(/\D/g, "").length >= 12
                ? Promise.resolve()
                : Promise.reject("Telefon numarasını eksiksiz girin."),
          },
        ]}
      >
        <PhoneInput
          country="tr"
          onlyCountries={["tr"]}
          masks={{ tr: "(...) ... .. .." }}
          countryCodeEditable={false}
          enableAreaCodes={false}
          onChange={(v) => addressForm.setFieldsValue({ phone: v })}
        />
      </Form.Item>
      <Form.Item
        label="Şehir"
        name="city"
        rules={[{ required: true, message: "Şehir zorunludur!" }]}
      >
        <Input />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit">
          {addressData ? "Güncelle" : "Ekle"}
        </Button>
      </Form.Item>
    </Form>
  );

  return (
    <section className="account-dashboard">
      <div className="container">
        <header className="account-dashboard-header">
          <nav className="crumbs" aria-label="Sayfa konumu">
            <Link to="/">Ana sayfa</Link>
            <span aria-hidden="true">/</span>
            <span className="crumbs-current">Hesabım</span>
          </nav>
          <h1 className="page-title">
            {userInfo ? `Merhaba, ${userInfo.username}` : "Hesabım"}
          </h1>
          <p>
            Profil, adres ve sipariş bilgilerinizi buradan yönetebilirsiniz.
          </p>
        </header>
        <Collapse
          className="account-collapse"
          expandIconPosition="end"
          activeKey={[activeKey]}
          accordion
          onChange={(key) => setActiveKey(Array.isArray(key) ? key[0] : key)}
          items={[
            {
              key: "profile",
              label: "Profil Bilgilerim",
              children: profileFormJsx,
              forceRender: true,
            },
            {
              key: "address",
              label: "Adres Bilgilerim",
              children: addressFormJsx,
              forceRender: true,
            },
            {
              key: "orders",
              label: "Siparişlerim",
              children: (
                <div className="orders-table-container">
                  <Table
                    dataSource={orders}
                    loading={ordersLoading}
                    locale={{ emptyText: "Henüz siparişiniz yok." }}
                    columns={[
                      {
                        title: "Sipariş No",
                        dataIndex: "_id",
                        key: "_id",
                        render: (id) => `#${id.slice(-6)}`,
                      },
                      {
                        title: "Tarih",
                        dataIndex: "createdAt",
                        key: "createdAt",
                        render: (d) => new Date(d).toLocaleDateString("tr-TR"),
                      },
                      {
                        title: "Tutar",
                        dataIndex: "total",
                        key: "total",
                        render: (t) => formatPrice(t),
                        responsive: ["sm"],
                      },
                      {
                        title: "Durum",
                        dataIndex: "status",
                        key: "status",
                        render: (s) => (
                          <Tag color={STATUS_COLORS[s] || "default"}>
                            {s || "Sipariş Alındı"}
                          </Tag>
                        ),
                      },
                      {
                        title: "Sipariş Hakkında",
                        key: "actions",
                        render: (_, record) => (
                          <Button
                            type="link"
                            onClick={() => setModalOrder(record)}
                          >
                            Detaylar
                          </Button>
                        ),
                        responsive: ["md"], // sadece webde göster
                      },
                    ]}
                    rowKey={(rec) => rec._id}
                    pagination={{ pageSize: 5 }}
                    onRow={(record) => ({
                      onClick: () => {
                        if (window.innerWidth < 768) {
                          setModalOrder(record); // mobilde satır tıklayınca aç
                        }
                      },
                    })}
                  />
                </div>
              ),
            },
          ]}
        />
      </div>
      <OrderDetailsModal
        visible={!!modalOrder}
        onClose={() => setModalOrder(null)}
        order={modalOrder}
      />
    </section>
  );
};

export default UserAccountPage;
