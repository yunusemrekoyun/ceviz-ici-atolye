// src/pages/UpdateProductPage.jsx
import {
  Button,
  Form,
  Input,
  InputNumber,
  Select,
  Spin,
  Upload,
  message,
  Space,
} from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import imageCompression from "browser-image-compression";

const UpdateProductPage = () => {
  /* ---------------- STATE ---------------- */
  const [loading, setLoading] = useState(false);
  const [priceLoading, setPriceLoading] = useState(false); // ◀︎ yeni
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [mainImages, setMainImages] = useState([]);
  const [childImages1, setChildImages1] = useState([]);
  const [childImages2, setChildImages2] = useState([]);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { id: productId } = useParams();
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  /* ---------------- DATA FETCH ---------------- */
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [catRes, prodRes] = await Promise.all([
          fetch(`${apiUrl}/api/categories`),
          fetch(`${apiUrl}/api/products/${productId}`),
        ]);
        if (!catRes.ok || !prodRes.ok) throw new Error();
        const [cats, prod] = await Promise.all([catRes.json(), prodRes.json()]);
        setCategories(cats);

        const selected = cats.find((cat) => cat._id === prod.category._id);
        setSubcategories(selected?.subcategories || []);

        form.setFieldsValue({
          name: prod.name,
          category: prod.category._id,
          subcategory: prod.subcategory,
          buyLink: prod.buyLink,
          current: prod.price.current,
          discount: prod.price.discount,
          opt1: (prod.opt1 || []).join("\n"),
          opt2: (prod.opt2 || []).join("\n"),
          mainDescription: prod.mainDescription,
          childDescription1: prod.childDescription1,
          childDescription2: prod.childDescription2,
        });

        const buildFileList = (images, type) =>
          images.map((_, i) => ({
            uid: `${type}-${i}`,
            name: `${type} ${i + 1}`,
            status: "done",
            url: `${apiUrl}/api/products/${prod._id}/image/${type}/${i}`,
            thumbUrl: `${apiUrl}/api/products/${prod._id}/image/${type}/${i}`,
          }));

        setMainImages(buildFileList(prod.mainImages, "mainImages"));
        setChildImages1(buildFileList(prod.childImages1, "childImages1"));
        setChildImages2(buildFileList(prod.childImages2, "childImages2"));
      } catch (err) {
        console.error(err);
        message.error("Veri yüklenemedi.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [apiUrl, productId, form]);

  /* ---------------- KATEGORİ DEĞİŞİMİ ---------------- */
  const handleCategoryChange = (categoryId) => {
    const selected = categories.find((cat) => cat._id === categoryId);
    setSubcategories(selected?.subcategories || []);
    form.setFieldsValue({ subcategory: undefined });
  };

  /* ---------------- TRENDYOL FİYATI ÇEK ---------------- */
  const handleFetchPrice = async () => {
    // 1) Formdaki link(ler)i al
    const buyLinks = form.getFieldValue("buyLink") || [];
    const url =
      buyLinks
        .map((l) => l && l.trim())
        .find((l) => /^https?:\/\/.*trendyol\.com/.test(l)) || null;

    if (!url) {
      return message.warning("Önce geçerli bir Trendyol linki girin.");
    }

    try {
      setPriceLoading(true);
      const res = await fetch(`${apiUrl}/api/product-price/fetch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      let errMsg = "Fiyat alınamadı";
      if (!res.ok) {
        try {
          const data = await res.json();
          errMsg = data.error || errMsg;
        } catch (_) {
          // intentionally ignored
        }
        throw new Error(errMsg);
      }

      const { price } = await res.json(); // { price: ... }
      form.setFieldsValue({ current: price });
      message.success(`Fiyat alındı: ₺${price}`);
    } catch (err) {
      message.error(err.message);
    } finally {
      setPriceLoading(false);
    }
  };

  /* ---------------- UPLOAD HELPERS ---------------- */
  const handleUploadChange =
    (setter) =>
    ({ fileList }) =>
      setter(fileList);

  const compressAndAppend = async (images, name, formData) => {
    for (const file of images) {
      if (file.originFileObj) {
        const compressed = await imageCompression(file.originFileObj, {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 1024,
          useWebWorker: true,
        });
        formData.append(name, compressed);
      }
    }
  };

  /* ---------------- SUBMIT ---------------- */
  const onFinish = async (values) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("name", values.name);
      formData.append("category", values.category);
      formData.append("subcategory", values.subcategory || "");
      formData.append("buyLink", JSON.stringify(values.buyLink || []));
      formData.append(
        "price",
        JSON.stringify({ current: values.current, discount: values.discount })
      );
      formData.append("opt1", JSON.stringify((values.opt1 || "").split("\n")));
      formData.append("opt2", JSON.stringify((values.opt2 || "").split("\n")));
      formData.append("mainDescription", values.mainDescription || "");
      formData.append("childDescription1", values.childDescription1 || "");
      formData.append("childDescription2", values.childDescription2 || "");

      await compressAndAppend(mainImages, "mainImages", formData);
      await compressAndAppend(childImages1, "childImages1", formData);
      await compressAndAppend(childImages2, "childImages2", formData);

      const res = await fetch(`${apiUrl}/api/products/${productId}`, {
        method: "PUT",
        body: formData,
      });

      if (res.ok) {
        message.success("Ürün güncellendi.");
        navigate("/admin/products");
      } else {
        const result = await res.json();
        message.error(result.error || "Güncelleme hatası.");
      }
    } catch (err) {
      console.error(err);
      message.error("Sunucu hatası.");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- UI ---------------- */
  return (
    <Spin spinning={loading}>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        style={{ maxWidth: 600 }}
      >
        <Form.Item label="Ürün İsmi" name="name" rules={[{ required: true }]}>
          <Input />
        </Form.Item>

        <Form.Item
          label="Kategori"
          name="category"
          rules={[{ required: true }]}
        >
          <Select placeholder="Kategori seçin" onChange={handleCategoryChange}>
            {categories.map((c) => (
              <Select.Option key={c._id} value={c._id}>
                {c.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item label="Alt Kategori" name="subcategory">
          <Select
            placeholder={
              subcategories.length > 0
                ? "Alt kategori seçin"
                : "Alt kategori bulunamadı"
            }
            disabled={subcategories.length === 0}
          >
            {subcategories.map((sub, i) => (
              <Select.Option key={i} value={sub}>
                {sub}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        {/* Satın alma linkleri */}
        <Form.Item label="Satın Alma Linkleri" name="buyLink">
          <Select
            mode="tags"
            tokenSeparators={[",", "\n"]}
            placeholder="Her linkten sonra Enter'a basın"
          />
        </Form.Item>

        {/* Fiyat + buton */}
        <Form.Item label="Fiyat">
          <Space align="baseline" wrap>
            <Form.Item name="current" noStyle>
              <InputNumber placeholder="₺" style={{ width: 140 }} />
            </Form.Item>
            <Form.Item name="discount" noStyle>
              <InputNumber
                placeholder="%"
                formatter={(v) => (v ? `${v}%` : "")}
                parser={(v) => v.replace("%", "")}
                style={{ width: 120 }}
              />
            </Form.Item>
            <Button
              loading={priceLoading}
              onClick={handleFetchPrice}
              type="dashed"
            >
              Fiyatı Çek
            </Button>
          </Space>
        </Form.Item>

        {/* Açıklamalar */}
        <Form.Item label="Açıklama" name="mainDescription">
          <Input.TextArea />
        </Form.Item>
        <Form.Item label="Alt Açıklama 1" name="childDescription1">
          <Input.TextArea />
        </Form.Item>
        <Form.Item label="Alt Açıklama 2" name="childDescription2">
          <Input.TextArea />
        </Form.Item>

        {/* Görseller */}
        <Form.Item label="Ana Görseller">
          <Upload
            listType="picture-card"
            fileList={mainImages}
            beforeUpload={() => false}
            onChange={handleUploadChange(setMainImages)}
            multiple
          >
            {mainImages.length < 5 && <UploadOutlined />}
          </Upload>
        </Form.Item>
        <Form.Item label="Alt Görseller 1">
          <Upload
            listType="picture-card"
            fileList={childImages1}
            beforeUpload={() => false}
            onChange={handleUploadChange(setChildImages1)}
            multiple
          >
            {childImages1.length < 5 && <UploadOutlined />}
          </Upload>
        </Form.Item>
        <Form.Item label="Alt Görseller 2">
          <Upload
            listType="picture-card"
            fileList={childImages2}
            beforeUpload={() => false}
            onChange={handleUploadChange(setChildImages2)}
            multiple
          >
            {childImages2.length < 5 && <UploadOutlined />}
          </Upload>
        </Form.Item>

        {/* Actions */}
        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit">
              Güncelle
            </Button>
            <Button onClick={() => navigate(-1)}>İptal</Button>
          </Space>
        </Form.Item>
      </Form>
    </Spin>
  );
};

export default UpdateProductPage;
