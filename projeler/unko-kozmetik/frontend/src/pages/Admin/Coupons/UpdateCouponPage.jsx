import { Form, Spin, message } from "antd";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchWithAuth } from "../../../components/Auth/fetchWithAuth";
import { readError } from "../../../config/api";
import CouponForm from "./CouponForm";

const UpdateCouponPage = () => {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const { id: couponId } = useParams();
  const navigate = useNavigate();
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    const fetchCoupon = async () => {
      setLoading(true);
      try {
        const response = await fetchWithAuth(
          `${apiUrl}/api/coupons/${couponId}`
        );
        if (!response.ok)
          throw new Error(await readError(response, "Kupon bulunamadı."));
        const { data } = await response.json();
        form.setFieldsValue({
          code: data.code,
          discountPercent: data.discountPercent,
        });
      } catch (error) {
        message.error(error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchCoupon();
  }, [apiUrl, couponId, form]);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const response = await fetchWithAuth(
        `${apiUrl}/api/coupons/${couponId}`,
        {
          method: "PUT",
          body: JSON.stringify(values),
        }
      );
      if (!response.ok) {
        throw new Error(
          await readError(response, "Kupon güncellenirken bir hata oluştu.")
        );
      }
      message.success("Kupon başarıyla güncellendi.");
      navigate("/admin/coupons");
    } catch (error) {
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Spin spinning={loading}>
      <CouponForm form={form} onFinish={onFinish} submitText="Güncelle" />
    </Spin>
  );
};

export default UpdateCouponPage;
