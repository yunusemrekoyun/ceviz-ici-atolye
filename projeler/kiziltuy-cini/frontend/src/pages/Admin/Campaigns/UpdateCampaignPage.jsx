import { Button, Form, Input, Select, Spin, Upload, message } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import imageCompression from "browser-image-compression";

const UpdateCampaignPage = () => {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [form] = Form.useForm();
  const apiUrl = import.meta.env.VITE_API_BASE_URL;
  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Ürünler + kampanya verisi
        const [prodRes, campRes] = await Promise.all([
          fetch(`${apiUrl}/api/products?page=1&limit=100`),
          fetch(`${apiUrl}/api/campaigns/${id}`),
        ]);
        if (!prodRes.ok || !campRes.ok) {
          message.error("Veri getirme hatası");
          return;
        }
        const [prodResult, campData] = await Promise.all([
          prodRes.json(),
          campRes.json(),
        ]);
        // prodResult ya dizi ya objedir
        const prodList = Array.isArray(prodResult)
          ? prodResult
          : Array.isArray(prodResult.products)
          ? prodResult.products
          : [];

        setProducts(prodList);

        // form alanlarını set et
        form.setFieldsValue({
          title: campData.title,
          description: campData.description,
          selectedProducts: campData.products.map((p) => p._id),
          image: campData.background
            ? [
                {
                  uid: "-1",
                  name: "Mevcut Görsel",
                  status: "done",
                  url: `${apiUrl}/api/campaigns/${campData._id}/image`,
                  thumbUrl: `${apiUrl}/api/campaigns/${campData._id}/image`,
                },
              ]
            : [],
        });
      } catch (err) {
        console.error("Hata:", err);
        message.error("Sunucu hatası");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [apiUrl, form, id]);

  const handleUpdate = async (values) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("title", values.title);
      formData.append("description", values.description);
      formData.append("products", JSON.stringify(values.selectedProducts));

      const fileList = values.image;
      const file = fileList?.[0]?.originFileObj;
      if (file) {
        const compressed = await imageCompression(file, {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 1024,
          useWebWorker: true,
        });
        formData.append("background", compressed);
      }

      const res = await fetch(`${apiUrl}/api/campaigns/${id}`, {
        method: "PUT",
        body: formData,
      });
      if (res.ok) {
        message.success("Kampanya başarıyla güncellendi");
        navigate("/admin/campaigns");
      } else {
        message.error("Güncelleme başarısız oldu");
      }
    } catch (err) {
      console.error(err);
      message.error("Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Spin spinning={loading}>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleUpdate}
        style={{ maxWidth: 600 }}
      >
        <Form.Item
          label="Kampanya Başlığı"
          name="title"
          rules={[{ required: true, message: "Başlık girin" }]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          label="Kampanya Açıklaması"
          name="description"
          rules={[{ required: true, message: "Açıklama girin" }]}
        >
          <Input.TextArea rows={4} />
        </Form.Item>

        <Form.Item
          label="Görsel (Yeniden yüklemek için)"
          name="image"
          valuePropName="fileList"
          getValueFromEvent={(e) => e && e.fileList}
        >
          <Upload
            listType="picture"
            maxCount={1}
            beforeUpload={() => false}
            accept="image/*"
          >
            <Button icon={<UploadOutlined />}>Görsel Yükle</Button>
          </Upload>
        </Form.Item>

        <Form.Item
          label="İlgili Ürünler"
          name="selectedProducts"
          rules={[{ required: true, message: "Ürün seçin" }]}
        >
          <Select mode="multiple" placeholder="Ürün seçin">
            {products.map((p) => (
              <Select.Option key={p._id} value={p._id}>
                {p.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Button type="primary" htmlType="submit">
          Güncelle
        </Button>
      </Form>
    </Spin>
  );
};

export default UpdateCampaignPage;
