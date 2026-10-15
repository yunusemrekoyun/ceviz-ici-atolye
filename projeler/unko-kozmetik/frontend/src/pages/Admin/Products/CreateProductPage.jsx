import {
  Button,
  Form,
  Input,
  InputNumber,
  Select,
  Upload,
  message,
} from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import imageCompression from "browser-image-compression";
import { fetchWithAuth } from "../../../components/Auth/fetchWithAuth";
import { readError } from "../../../config/api";
const { Option } = Select;

const CreateProductPage = () => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  const [categories, setCategories] = useState([]);
  const [brandOptions, setBrandOptions] = useState([]);
  const [colors, setColors] = useState([]);
  const [sizes, setSizes] = useState([]);

  useEffect(() => {
    fetch(`${apiUrl}/api/categories`)
      .then((res) => res.json())
      .then((response) => setCategories(response.data))
      .catch((err) => console.error("Ürün kategorileri alınamadı:", err));
  }, [apiUrl]);

  const compressImage = async (file) => {
    const options = {
      maxSizeMB: 0.2,
      maxWidthOrHeight: 1024,
      useWebWorker: true,
    };
    try {
      return await imageCompression(file, options);
    } catch {
      return file;
    }
  };

  const onCategoryChange = (value) => {
    const cat = categories.find((c) => c._id === value);
    setBrandOptions(cat?.brands || []);
    form.setFieldsValue({ brand: undefined });
  };

  const onFinish = async (values) => {
    if (!values.img || values.img.length === 0) {
      return message.error("Ürün görsellerini seçin!");
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("name", values.name);
      formData.append("category", values.category);
      formData.append("brand", values.brand);
      formData.append("current", values.current);
      formData.append("discount", values.discount ?? 0);
      formData.append("description", values.description);
      if (colors.length > 0) formData.append("colors", colors.join(","));
      if (sizes.length > 0) formData.append("sizes", sizes.join(","));

      for (const fileObj of values.img) {
        const compressed = await compressImage(fileObj.originFileObj);
        formData.append("img", compressed, fileObj.name);
      }

      // FormData olduğu için Content-Type'ı tarayıcı belirler
      const res = await fetchWithAuth(`${apiUrl}/api/products`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok)
        throw new Error(
          await readError(res, "Ürün oluşturulurken hata oluştu.")
        );

      message.success("Ürün başarıyla oluşturuldu.");
      form.resetFields();
      setColors([]);
      setSizes([]);
      navigate("/admin/products");
    } catch (err) {
      message.error(err.message || "Ürün oluşturma sırasında bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onFinish}
      style={{ maxWidth: 800 }}
    >
      <Form.Item
        label="Ürün İsmi"
        name="name"
        rules={[{ required: true, message: "Ürün ismi gerekli!" }]}
      >
        <Input />
      </Form.Item>

      <Form.Item
        label="Ürün Kategorisi"
        name="category"
        rules={[{ required: true, message: "Ürün kategorisi seçin!" }]}
      >
        <Select placeholder="Kategori seçin" onChange={onCategoryChange}>
          {categories.map((c) => (
            <Option key={c._id} value={c._id}>
              {c.name}
            </Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item
        label="Marka"
        name="brand"
        rules={[{ required: true, message: "Marka seçin!" }]}
      >
        <Select placeholder="Marka seçin">
          {brandOptions.map((b) => (
            <Option key={b} value={b}>
              {b}
            </Option>
          ))}
        </Select>
      </Form.Item>

      <Form.Item
        label="Fiyat (₺)"
        name="current"
        rules={[{ required: true, message: "Fiyat gerekli!" }]}
      >
        <InputNumber min={0.01} step={0.01} style={{ width: "100%" }} />
      </Form.Item>

      <Form.Item label="İndirim Oranı (%)" name="discount">
        <InputNumber min={0} max={100} style={{ width: "100%" }} />
      </Form.Item>

      <Form.Item
        label="Ürün Açıklaması"
        name="description"
        rules={[{ required: true, message: "Açıklama gerekli!" }]}
      >
        <Input.TextArea rows={4} />
      </Form.Item>

      <Form.Item label="Renkler" name="colors">
        <Select
          mode="tags"
          placeholder="Renk ekle (örn: kırmızı, siyah)"
          value={colors}
          onChange={(newColors) => setColors(newColors)}
        />
      </Form.Item>

      <Form.Item label="Boyutlar" name="sizes">
        <Select
          mode="tags"
          placeholder="Boyut ekle (örn: 250 ml, 500 ml)"
          value={sizes}
          onChange={(newSizes) => setSizes(newSizes)}
        />
      </Form.Item>

      <Form.Item
        label="Ürün Görselleri"
        name="img"
        valuePropName="fileList"
        getValueFromEvent={(e) => e.fileList}
        rules={[{ required: true, message: "En az bir görsel seçin!" }]}
        extra="En fazla 6 görsel (JPG, PNG, WEBP). Görseller yüklenmeden önce sıkıştırılır."
      >
        <Upload
          listType="picture"
          multiple
          maxCount={6}
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
          beforeUpload={() => false}
        >
          <Button icon={<UploadOutlined />}>Dosya Seç</Button>
        </Upload>
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading}>
          Ürünü Oluştur
        </Button>
      </Form.Item>
    </Form>
  );
};

export default CreateProductPage;
