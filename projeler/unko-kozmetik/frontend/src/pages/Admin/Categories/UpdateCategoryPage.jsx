/*
 * frontend/src/pages/Admin/Categories/UpdateCategoryPage.jsx
 */
import { Button, Form, Input, Select, message, Spin } from "antd";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchWithAuth } from "../../../components/Auth/fetchWithAuth";
import { readError } from "../../../config/api";
import useCategories, {
  invalidateCategories,
} from "../../../hooks/useCategories";
import GroupInput from "./GroupInput";

const UpdateCategoryPage = () => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const { id: categoryId } = useParams();
  const navigate = useNavigate();
  const { categories } = useCategories();
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    const fetchCategory = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${apiUrl}/api/categories/${categoryId}`);
        if (!res.ok) throw new Error();
        const response = await res.json();
        form.setFieldsValue({
          name: response.data.name,
          group: response.data.group,
          brands: response.data.brands,
        });
      } catch {
        message.error("Kategori yükleme hatası.");
      } finally {
        setLoading(false);
      }
    };
    fetchCategory();
  }, [apiUrl, categoryId, form]);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(
        `${apiUrl}/api/categories/${categoryId}`,
        {
          method: "PUT",
          body: JSON.stringify({ ...values, group: values.group || "" }),
        }
      );
      if (!res.ok)
        throw new Error(await readError(res, "Güncelleme başarısız."));

      invalidateCategories();
      message.success("Kategori güncellendi.");
      navigate("/admin/categories");
    } catch (err) {
      message.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Spin spinning={loading}>
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
          <Input />
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
          rules={[{ required: true, message: "En az bir marka girin!" }]}
        >
          <Select
            mode="tags"
            placeholder="Marka ekle"
            tokenSeparators={[","]}
          />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit">
            Güncelle
          </Button>
        </Form.Item>
      </Form>
    </Spin>
  );
};

export default UpdateCategoryPage;
