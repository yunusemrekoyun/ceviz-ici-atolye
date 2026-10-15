import { useCallback, useEffect, useState } from "react";
import {
  Table,
  Select,
  InputNumber,
  Button,
  Spin,
  message,
  Modal,
  Checkbox,
} from "antd";
import { fetchWithAuth } from "../../../components/Auth/fetchWithAuth";
import { imageUrl, readError } from "../../../config/api";
import { discountedPrice, formatPrice } from "../../../utils/cart";
import "./DiscountPage.css";

const { Option } = Select;

const DiscountPage = () => {
  const [categories, setCategories] = useState([]);
  const [brandOptions, setBrandOptions] = useState([]);
  const [discounted, setDiscounted] = useState([]);
  const [loading, setLoading] = useState(false);

  const [selCat, setSelCat] = useState(null);
  const [selBrands, setSelBrands] = useState(["all"]);
  const [discValue, setDiscValue] = useState(0);
  const [updateAll, setUpdateAll] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  const fetchDiscounted = useCallback(async () => {
    const res = await fetchWithAuth(`${apiUrl}/api/discounts/products`);
    if (!res.ok)
      throw new Error(await readError(res, "İndirimli ürünler alınamadı."));
    const json = await res.json();
    setDiscounted(json.data || []);
  }, [apiUrl]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const catRes = await fetch(`${apiUrl}/api/categories`);
        if (!catRes.ok) throw new Error("Kategoriler alınamadı.");
        const catData = await catRes.json();
        setCategories(catData.data || []);
        await fetchDiscounted();
      } catch (err) {
        message.error(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [apiUrl, fetchDiscounted]);

  useEffect(() => {
    if (modalVisible) {
      setSelCat(null);
      setSelBrands(["all"]);
      setDiscValue(0);
      setUpdateAll(false);
    }
  }, [modalVisible]);

  const onCatChange = (catId) => {
    setSelCat(catId);
    const cat = categories.find((c) => c._id === catId);
    setBrandOptions(cat?.brands || []);
    setSelBrands(["all"]);
  };

  const applyDiscount = async () => {
    if (!selCat) {
      message.warning("Önce kategori seçin.");
      return;
    }

    setLoading(true);
    try {
      const checkBody = { categoryId: selCat };
      if (!selBrands.includes("all")) {
        checkBody.brandIds = Array.isArray(selBrands)
          ? selBrands.map((b) => b.toLowerCase())
          : [selBrands.toLowerCase()];
      }

      const checkRes = await fetchWithAuth(`${apiUrl}/api/discounts/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(checkBody),
      });

      if (!checkRes.ok)
        throw new Error(
          await readError(checkRes, "İndirim kontrolü yapılamadı.")
        );
      const checkData = await checkRes.json();

      const hasExistingDiscount = checkData?.data?.hasDiscountedProducts;
      if (hasExistingDiscount && !updateAll) {
        message.warning(
          "Seçilen kategoride/markalarda zaten indirimli ürünler var. Mevcut indirimleri değiştirmek için kutucuğu işaretlemelisiniz."
        );
        setLoading(false);
        return;
      }

      // Artık buradaysak ya hiç eski indirim yok ya da kutu işaretli
      const body = {
        categoryId: selCat,
        discount: discValue,
        updateAll,
      };
      if (!selBrands.includes("all")) {
        body.brandIds = Array.isArray(selBrands)
          ? selBrands.map((b) => b.toLowerCase())
          : [selBrands.toLowerCase()];
      }

      const res = await fetchWithAuth(`${apiUrl}/api/discounts/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok)
        throw new Error(await readError(res, "İndirim uygulanamadı."));
      const result = await res.json();

      message.success(result.message || "İndirim başarıyla güncellendi.");
      setModalVisible(false);

      // İndirim sonrası güncel verileri çekiyoruz
      await fetchDiscounted();
    } catch (err) {
      message.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDiscount = async (productId) => {
    Modal.confirm({
      title: "İndirimi Kaldır",
      content: "Bu ürünün indirimini kaldırmak istediğinize emin misiniz?",
      okText: "Evet",
      cancelText: "İptal",
      async onOk() {
        setLoading(true);
        try {
          const res = await fetchWithAuth(
            `${apiUrl}/api/discounts/${productId}`,
            {
              method: "DELETE",
            }
          );
          if (!res.ok)
            throw new Error(await readError(res, "İndirim kaldırılamadı."));

          message.success("İndirim kaldırıldı.");
          await fetchDiscounted();
        } catch (err) {
          message.error(err.message);
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const columns = [
    {
      title: "Ürün",
      dataIndex: "name",
      key: "name",
      render: (name, record) => (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {record.img && (
            <img
              src={imageUrl(record.img)}
              alt={name}
              width={48}
              height={48}
              style={{ objectFit: "cover" }}
            />
          )}
          <b>{name}</b>
        </div>
      ),
    },
    {
      title: "Fiyat",
      key: "price",
      render: (_, record) => (
        <span>
          <s style={{ color: "#999", marginRight: 6 }}>
            {formatPrice(record.price?.current)}
          </s>
          {formatPrice(discountedPrice(record.price))}
        </span>
      ),
    },
    {
      title: "Kategori",
      dataIndex: "category",
      key: "category",
      render: (c) => c?.name || c,
    },
    {
      title: "Marka",
      dataIndex: "brand",
      key: "brand",
      render: (brand) => brand?.toUpperCase(),
    },
    {
      title: "İndirim",
      dataIndex: ["price", "discount"],
      key: "discount",
      render: (discount) => `%${discount}`,
    },
    {
      title: "İşlem",
      key: "action",
      render: (_, record) => (
        <Button danger onClick={() => handleDeleteDiscount(record._id)}>
          İndirimi Kaldır
        </Button>
      ),
    },
  ];

  return (
    <Spin spinning={loading}>
      <Button
        type="primary"
        className="discount-btn"
        onClick={() => setModalVisible(true)}
      >
        İndirim Üret
      </Button>

      <Modal
        title="Kategori/Marka Bazlı İndirim Oluştur"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        maskClosable
      >
        <div className="discount-form">
          <Select
            placeholder="Kategori seç"
            value={selCat}
            onChange={onCatChange}
            className="select"
          >
            {categories.map((c) => (
              <Option key={c._id} value={c._id}>
                {c.name}
              </Option>
            ))}
          </Select>

          <Select
            mode="multiple"
            placeholder="Marka seç (all=Tüm)"
            value={selBrands}
            onChange={setSelBrands}
            className="select"
            style={{ minWidth: 150 }}
          >
            <Option key="all" value="all">
              Tüm Markalar
            </Option>
            {brandOptions.map((b) => (
              <Option key={b} value={b}>
                {b}
              </Option>
            ))}
          </Select>

          <InputNumber
            min={0}
            max={100}
            placeholder="İndirim %"
            value={discValue}
            onChange={setDiscValue}
            className="input-number"
          />

          <Checkbox
            checked={updateAll}
            onChange={(e) => setUpdateAll(e.target.checked)}
            style={{ marginTop: "10px" }}
          >
            Mevcut İndirimleri Değiştir
          </Checkbox>

          <Button
            type="primary"
            onClick={applyDiscount}
            style={{ marginTop: "10px" }}
          >
            Uygula
          </Button>
        </div>
      </Modal>

      <div
        className="page-container"
        style={{ overflow: "auto", height: "calc(100vh - 100px)" }}
      >
        <Table
          rowKey="_id"
          dataSource={discounted}
          columns={columns}
          pagination={{ pageSize: 10 }}
          className="discount-table"
          scroll={{ x: "100%", y: "calc(100vh - 200px)" }} // Hem yatay hem dikey kayma ekledik
        />
      </div>
    </Spin>
  );
};

export default DiscountPage;
