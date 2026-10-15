import { Button, Form, Input, Select, Spin, Upload, message } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import imageCompression from "browser-image-compression";

const CreateCampaignPage = () => {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState([]);
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${apiUrl}/api/products?page=1&limit=100`);
        if (!response.ok) throw new Error("Ürünler yüklenemedi.");
        const result = await response.json();
        // result ya doğrudan dizi, ya { products: [...] }
        const list = Array.isArray(result)
          ? result
          : Array.isArray(result.products)
          ? result.products
          : [];
        setProducts(list);
      } catch (error) {
        message.error(error.message || "Ürünler yüklenemedi.");
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [apiUrl]);

  const handleUpload = ({ fileList }) => {
    setFileList(fileList);
  };

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("title", values.title);
      formData.append("description", values.description);
      formData.append("products", JSON.stringify(values.products));

      if (fileList[0]?.originFileObj) {
        const compressedFile = await imageCompression(
          fileList[0].originFileObj,
          { maxSizeMB: 0.5, maxWidthOrHeight: 1024, useWebWorker: true }
        );
        formData.append("background", compressedFile);
      }

      const response = await fetch(`${apiUrl}/api/campaigns`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        message.success("Kampanya başarıyla oluşturuldu.");
        form.resetFields();
        setFileList([]);
      } else {
        const err = await response.json();
        message.error(err.error || "Kampanya oluşturulamadı.");
      }
    } catch (error) {
      console.error(error);
      message.error("Sunucu hatası oluştu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Spin spinning={loading}>
      <Form
        layout="vertical"
        form={form}
        onFinish={onFinish}
        style={{ maxWidth: 600 }}
      >
        <Form.Item
          label="Kampanya Başlığı"
          name="title"
          rules={[{ required: true, message: "Başlık zorunludur" }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          label="Açıklama"
          name="description"
          rules={[{ required: true, message: "Açıklama giriniz" }]}
        >
          <Input.TextArea autoSize={{ minRows: 4 }} />
        </Form.Item>

        <Form.Item
          label="Arka Plan Görseli"
          rules={[{ required: true, message: "Görsel zorunludur" }]}
        >
          <Upload
            listType="picture"
            fileList={fileList}
            beforeUpload={() => false}
            onChange={handleUpload}
            accept="image/*"
            maxCount={1}
          >
            <Button icon={<UploadOutlined />}>Görsel Yükle</Button>
          </Upload>
        </Form.Item>

        <Form.Item
          label="Kapsanan Ürünler"
          name="products"
          rules={[{ required: true, message: "Lütfen en az 1 ürün seçin" }]}
        >
          <Select mode="multiple" placeholder="Ürünleri seçin">
            {products.map((product) => (
              <Select.Option key={product._id} value={product._id}>
                {product.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Button type="primary" htmlType="submit">
          Oluştur
        </Button>
      </Form>
    </Spin>
  );
};

export default CreateCampaignPage;
