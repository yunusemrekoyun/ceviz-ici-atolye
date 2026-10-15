import { Button, Form, Input, Select, Spin, Upload, message } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { useState } from "react";
import imageCompression from "browser-image-compression";

const CreateCategoryPage = () => {
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [form] = Form.useForm();
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  const handleUploadChange = ({ fileList }) => {
    setFileList(fileList);
  };

  const onFinish = async ({ name, subcategories }) => {
    if (fileList.length === 0) {
      message.error("Lütfen bir görsel seçin.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("name", name);

      const trimmedSubs = (subcategories || []).map((s) => s.trim());
      const uniqueSubs = Array.from(new Set(trimmedSubs));
      formData.append("subcategories", JSON.stringify(uniqueSubs));

      const file = fileList[0].originFileObj;
      const compressedFile = await imageCompression(file, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1024,
        useWebWorker: true,
      });
      formData.append("img", compressedFile, file.name);

      const response = await fetch(`${apiUrl}/api/categories`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        message.success("Kategori başarıyla oluşturuldu.");
        form.resetFields();
        setFileList([]);
      } else {
        const result = await response.json();
        message.error(result.error || "Kategori oluşturulamadı.");
      }
    } catch (error) {
      console.error("Kategori oluşturma hatası:", error);
      message.error("Sunucu hatası oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const validateNoDuplicates = (_, value) => {
    const trimmed = (value || []).map((v) => v.trim().toLowerCase());
    const unique = new Set(trimmed);
    if (unique.size !== trimmed.length) {
      return Promise.reject(
        new Error("Aynı alt kategoriden iki tane giremezsiniz.")
      );
    }
    return Promise.resolve();
  };

  return (
    <Spin spinning={loading}>
      <Form
        name="create-category"
        layout="vertical"
        form={form}
        onFinish={onFinish}
        style={{ maxWidth: 400 }}
      >
        <Form.Item
          label="Kategori İsmi"
          name="name"
          rules={[{ required: true, message: "Lütfen kategori adını girin!" }]}
        >
          <Input placeholder="Örneğin: Çini Desenleri" />
        </Form.Item>

        <Form.Item
          label="Alt Kategoriler"
          name="subcategories"
          rules={[{ validator: validateNoDuplicates }]}
          tooltip="Enter’a basarak ekleyin; × ile silin"
        >
          <Select
            mode="tags"
            style={{ width: "100%" }}
            placeholder="Alt kategori girin"
            tokenSeparators={[","]}
          />
        </Form.Item>

        <Form.Item label="Kategori Görseli" required>
          <Upload
            listType="picture"
            fileList={fileList}
            beforeUpload={() => false}
            onChange={handleUploadChange}
            accept="image/*"
            maxCount={1}
          >
            <Button icon={<UploadOutlined />}>Görsel Seç</Button>
          </Upload>
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit">
            Oluştur
          </Button>
        </Form.Item>
      </Form>
    </Spin>
  );
};

export default CreateCategoryPage;
