/*
 * frontend/src/pages/Admin/Categories/CreateCategoryPage.jsx
 */
import { Button, Form, Input, Select, message } from "antd";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchWithAuth } from "../../../components/Auth/fetchWithAuth";
import { readError } from "../../../config/api";
import useCategories, {
  invalidateCategories,
} from "../../../hooks/useCategories";
import GroupInput from "./GroupInput";

const CreateCategoryPage = () => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { categories } = useCategories();
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${apiUrl}/api/categories`, {
        method: "POST",
        body: JSON.stringify({
          name: values.name,
          group: values.group || "",
          brands: values.brands || [],
        }),
      });
      if (!res.ok)
        throw new Error(await readError(res, "Kategori oluşturulamadı."));

      invalidateCategories();
      message.success("Kategori başarıyla oluşturuldu.");
      form.resetFields();
      navigate("/admin/categories");
    } catch (error) {
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onFinish}
      initialValues={{ brands: [] }}
      style={{ maxWidth: 800 }}
    >
      <Form.Item
        label="Kategori İsmi"
        name="name"
        rules={[{ required: true, message: "Lütfen kategori adını girin!" }]}
      >
        <Input placeholder="Örn: Şampuan" />
      </Form.Item>

      <Form.Item
        label="Menü Grubu"
        name="group"
        tooltip="Üst menüdeki 'Mağaza' açılır menüsünde kategorinin altında listeleneceği başlık"
      >
        <GroupInput categories={categories} />
      </Form.Item>

      <Form.Item
        label="Markalar"
        name="brands"
        tooltip="Bu kategoriye ait markaları girin"
        rules={[{ required: true, message: "En az bir marka girin!" }]}
      >
        <Select mode="tags" placeholder="Marka ekle" tokenSeparators={[","]} />
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading}>
          Oluştur
        </Button>
      </Form.Item>
    </Form>
  );
};

export default CreateCategoryPage;
