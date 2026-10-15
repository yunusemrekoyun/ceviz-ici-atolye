import { Form, Spin, message } from "antd";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchWithAuth } from "../../../components/Auth/fetchWithAuth";
import { readError } from "../../../config/api";
import CouponForm from "./CouponForm";

const CreateCouponPage = () => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const response = await fetchWithAuth(`${apiUrl}/api/coupons`, {
        method: "POST",
        body: JSON.stringify(values),
      });
      if (!response.ok) {
        throw new Error(
          await readError(response, "Kupon oluşturulurken bir hata oluştu.")
        );
      }
      message.success("Kupon başarıyla oluşturuldu.");
      navigate("/admin/coupons");
    } catch (error) {
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Spin spinning={loading}>
      <CouponForm form={form} onFinish={onFinish} submitText="Oluştur" />
    </Spin>
  );
};

export default CreateCouponPage;
