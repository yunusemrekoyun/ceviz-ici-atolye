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
import imageCompression from "browser-image-compression";

const CreateProductPage = () => {
  const [loading, setLoading] = useState(false);
  const [priceLoading, setPriceLoading] = useState(false); // ◀︎ yeni
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [mainImages, setMainImages] = useState([]);
  const [childImages1, setChildImages1] = useState([]);
  const [childImages2, setChildImages2] = useState([]);
  const [form] = Form.useForm();
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  /* ---------------- KATEGORİLER ---------------- */
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/categories`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setCategories(data);
      } catch {
        message.error("Kategoriler yüklenemedi.");
      }
    };
    fetchCategories();
  }, [apiUrl]);

  const handleCategoryChange = (categoryId) => {
    const selected = categories.find((cat) => cat._id === categoryId);
    if (selected?.subcategories?.length > 0) {
      setSubcategories(selected.subcategories);
    } else {
      setSubcategories([]);
      message.info("Bu kategorinin alt kategorisi bulunamadı.");
    }
    form.setFieldsValue({ subcategory: undefined });
  };

  /* ---------------- TRENDYOL FİYATI ÇEK ---------------- */
  const handleFetchPrice = async () => {
    const buyLinks = form.getFieldValue("buyLink") || [];
    if (buyLinks.length === 0) {
      return message.warning("Önce Trendyol linki girin.");
    }
    const url = buyLinks.find((l) => l.includes("trendyol.com")) || buyLinks[0];

    try {
      setPriceLoading(true);
      const res = await fetch(`${apiUrl}/api/product-price/fetch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Fiyat alınamadı");
      }
      const { price } = await res.json();
      form.setFieldsValue({ current: price });
      message.success(`Fiyat alındı: ₺${price}`);
    } catch (err) {
      console.error(err);
      message.error(err.message || "Fiyat alınamadı.");
    } finally {
      setPriceLoading(false);
    }
  };

  /* ---------------- GÖRSEL SIKIŞTIRMA ---------------- */
  const compressAndAppend = async (images, fieldName, formData) => {
    for (const fileWrapper of images) {
      const file = fileWrapper.originFileObj;
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1024,
        useWebWorker: true,
      });
      formData.append(fieldName, compressed);
    }
  };

  /* ---------------- SUBMIT ---------------- */
  const onFinish = async (values) => {
    if (mainImages.length === 0) {
      return message.error("En az 1 ana görsel gereklidir.");
    }
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

      const res = await fetch(`${apiUrl}/api/products`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        message.success("Ürün oluşturuldu.");
        form.resetFields();
        setMainImages([]);
        setChildImages1([]);
        setChildImages2([]);
        setSubcategories([]);
      } else {
        const result = await res.json();
        message.error(result.error || "Ürün oluşturulamadı.");
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
        {/* Ürün adı ––– */}
        <Form.Item
          label="Ürün İsmi"
          name="name"
          rules={[{ required: true, message: "Ürün adı zorunlu" }]}
        >
          <Input />
        </Form.Item>

        {/* Kategori ––– */}
        <Form.Item
          label="Kategori"
          name="category"
          rules={[{ required: true, message: "Kategori seçin" }]}
        >
          <Select placeholder="Kategori seçin" onChange={handleCategoryChange}>
            {categories.map((c) => (
              <Select.Option key={c._id} value={c._id}>
                {c.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        {/* Alt kategori ––– */}
        <Form.Item label="Alt Kategori" name="subcategory">
          <Select
            placeholder={
              subcategories.length > 0
                ? "Alt kategori seçin"
                : "Alt kategori bulunamadı"
            }
            disabled={subcategories.length === 0}
          >
            {subcategories.map((sub, index) => (
              <Select.Option key={index} value={sub}>
                {sub}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        {/* Satın alma linkleri ––– */}
        <Form.Item label="Satın Alma Linkleri" name="buyLink">
          <Select
            mode="tags"
            tokenSeparators={[",", "\n"]}
            placeholder="Her linkten sonra Enter'a basın"
          />
        </Form.Item>

        {/* Fiyat + Fiyatı Çek Butonu ––– */}
        <Form.Item label="Fiyat">
          <Space align="baseline" wrap>
            <Form.Item
              name="current"
              noStyle
              rules={[
                {
                  required: true,
                  message: "Fiyat zorunlu",
                  type: "number",
                  transform: (v) => (v === "" ? undefined : v),
                },
              ]}
            >
              <InputNumber placeholder="₺" style={{ width: 140 }} />
            </Form.Item>
            <Form.Item name="discount" noStyle>
              <InputNumber
                placeholder="%"
                style={{ width: 120 }}
                formatter={(v) => (v ? `${v}%` : "")}
                parser={(v) => v.replace("%", "")}
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

        {/* Açıklamalar ––– */}
        <Form.Item label="Ana Açıklama" name="mainDescription">
          <Input.TextArea autoSize={{ minRows: 2 }} />
        </Form.Item>
        <Form.Item label="Alt Açıklama 1" name="childDescription1">
          <Input.TextArea autoSize={{ minRows: 2 }} />
        </Form.Item>
        <Form.Item label="Alt Açıklama 2" name="childDescription2">
          <Input.TextArea autoSize={{ minRows: 2 }} />
        </Form.Item>

        {/* Görseller ––– */}
        <Form.Item label="Ana Görseller">
          <Upload
            listType="picture-card"
            fileList={mainImages}
            beforeUpload={() => false}
            onChange={({ fileList }) => setMainImages(fileList)}
            accept="image/*"
            multiple
          >
            {mainImages.length < 5 && (
              <div>
                <UploadOutlined />
                <div>Yükle</div>
              </div>
            )}
          </Upload>
        </Form.Item>

        <Form.Item label="Alt Görseller 1">
          <Upload
            listType="picture-card"
            fileList={childImages1}
            beforeUpload={() => false}
            onChange={({ fileList }) => setChildImages1(fileList)}
            accept="image/*"
            multiple
          >
            {childImages1.length < 5 && (
              <div>
                <UploadOutlined />
                <div>Yükle</div>
              </div>
            )}
          </Upload>
        </Form.Item>

        <Form.Item label="Alt Görseller 2">
          <Upload
            listType="picture-card"
            fileList={childImages2}
            beforeUpload={() => false}
            onChange={({ fileList }) => setChildImages2(fileList)}
            accept="image/*"
            multiple
          >
            {childImages2.length < 5 && (
              <div>
                <UploadOutlined />
                <div>Yükle</div>
              </div>
            )}
          </Upload>
        </Form.Item>

        {/* Submit ––– */}
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>
            Oluştur
          </Button>
        </Form.Item>
      </Form>
    </Spin>
  );
};

export default CreateProductPage;
