import PropTypes from "prop-types";
import { Button, Form, Input, InputNumber } from "antd";

// Kupon oluşturma ve güncelleme sayfalarında ortak form
const CouponForm = ({ form, onFinish, submitText }) => (
  <Form
    form={form}
    name="coupon"
    layout="vertical"
    autoComplete="off"
    onFinish={onFinish}
    style={{ maxWidth: 500 }}
  >
    <Form.Item
      label="Kupon Kodu"
      name="code"
      normalize={(value) => (value || "").toUpperCase().replace(/\s/g, "")}
      rules={[
        { required: true, message: "Lütfen bir kupon kodu girin!" },
        {
          pattern: /^[A-Z0-9_-]{3,30}$/,
          message:
            "3-30 karakter; harf (Türkçe karakter hariç), rakam, - ve _ kullanılabilir.",
        },
      ]}
    >
      <Input placeholder="Örn: HOSGELDIN10" />
    </Form.Item>

    <Form.Item
      label="Kupon İndirim Oranı (%)"
      name="discountPercent"
      rules={[
        { required: true, message: "Lütfen bir kupon indirim oranı girin!" },
      ]}
    >
      <InputNumber min={1} max={100} style={{ width: "100%" }} />
    </Form.Item>

    <Button type="primary" htmlType="submit">
      {submitText}
    </Button>
  </Form>
);

CouponForm.propTypes = {
  form: PropTypes.object.isRequired,
  onFinish: PropTypes.func.isRequired,
  submitText: PropTypes.string.isRequired,
};

export default CouponForm;
