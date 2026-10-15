import { Button, Form, Input, Select, Spin, Upload, message } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import imageCompression from "browser-image-compression";

const UpdateCategoryPage = () => {
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [form] = Form.useForm();
  const { id: categoryId } = useParams();
  const navigate = useNavigate();
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    const fetchCategory = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${apiUrl}/api/categories/${categoryId}`);
        if (!res.ok) throw new Error("Kategori bulunamadı");
        const data = await res.json();
        form.setFieldsValue({
          name: data.name,
          subcategories: Array.isArray(data.subcategories)
            ? data.subcategories.map((s) => s.toString())
            : [],
        });
        setFileList([
          {
            uid: data._id,
            name: "Mevcut Görsel",
            status: "done",
            url: `${apiUrl}/api/categories/${data._id}/image`,
            thumbUrl: `${apiUrl}/api/categories/${data._id}/image`,
          },
        ]);
      } catch (err) {
        message.error("Veri getirme hatası");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchCategory();
  }, [apiUrl, categoryId, form]);

  const handleUploadChange = ({ fileList }) => setFileList(fileList);

  const onFinish = async ({ name, subcategories }) => {
    setLoading(true);
    try {
      const trimmedSubs = (subcategories || []).map((s) => s.trim());
      const uniqueSubs = Array.from(new Set(trimmedSubs));

      const formData = new FormData();
      formData.append("name", name);
      formData.append("subcategories", JSON.stringify(uniqueSubs));

      const file = fileList[0]?.originFileObj;
      if (file) {
        const compressed = await imageCompression(file, {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 1024,
          useWebWorker: true,
        });
        formData.append("img", compressed);
      }

      const res = await fetch(`${apiUrl}/api/categories/${categoryId}`, {
        method: "PUT",
        body: formData,
      });

      if (res.ok) {
        message.success("Kategori başarıyla güncellendi.");
        navigate("/admin/categories");
      } else {
        const result = await res.json();
        message.error(result.error || "Güncelleme başarısız.");
      }
    } catch (err) {
      console.error(err);
      message.error("Sunucu hatası.");
    } finally {
      setLoading(false);
    }
  };

  const validateNoDuplicates = (_, value) => {
    const trimmedValues = (value || []).map((s) => s.trim().toLowerCase());
    const unique = new Set(trimmedValues);
    if (unique.size !== trimmedValues.length) {
      return Promise.reject(
        new Error("Aynı alt kategoriden iki tane giremezsiniz.")
      );
    }
    return Promise.resolve();
  };

  return (
    <Spin spinning={loading}>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        style={{ maxWidth: 400 }}
      >
        <Form.Item
          label="Kategori İsmi"
          name="name"
          rules={[{ required: true, message: "Kategori adı zorunlu" }]}
        >
          <Input />
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

        <Form.Item label="Kategori Görseli">
          <Upload
            listType="picture"
            fileList={fileList}
            beforeUpload={() => false}
            onChange={handleUploadChange}
            accept="image/*"
            maxCount={1}
          >
            <Button icon={<UploadOutlined />}>Görsel Seç / Değiştir</Button>
          </Upload>
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit">
            Güncelle
          </Button>
          <Button onClick={() => navigate(-1)}>İptal</Button>
        </Form.Item>
      </Form>
    </Spin>
  );
};

export default UpdateCategoryPage;
