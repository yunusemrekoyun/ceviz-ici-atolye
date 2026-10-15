/********************************************************
 * /src/components/Orders/OrderDetailModal.jsx
 ********************************************************/
import "./OrderDetailModal.css";
import { Modal, Table } from "antd";
import PropTypes from "prop-types";
import { formatPrice } from "../../utils/cart";

const OrderDetailModal = ({ visible, onClose, order }) => {
  if (!order) return null;

  const columns = [
    { title: "Ürün Adı", dataIndex: "name", key: "name" },
    { title: "Marka", dataIndex: "brand", key: "brand" },
    { title: "Kategori", dataIndex: "category", key: "category" },
    { title: "Renk", dataIndex: "color", key: "color" },
    { title: "Boyut", dataIndex: "size", key: "size" },
    { title: "Adet", dataIndex: "quantity", key: "quantity" },
    {
      title: "Birim Fiyat",
      dataIndex: "price",
      key: "price",
      render: (p) => formatPrice(p),
    },
    {
      title: "Ara Toplam",
      key: "subtotal",
      render: (_, item) => formatPrice(item.price * item.quantity),
    },
  ];

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={null}
      title={`Sipariş Detay #${order._id.slice(-6)}`}
      width={700}
      className="order-detail-modal"
    >
      <p>
        <strong>Gönderim Adresi:</strong> {order.address}
        {order.district ? `, ${order.district}` : ""}, {order.city}
      </p>
      <p>
        <strong>Alıcı:</strong> {order.name} ({order.phone})
      </p>

      <div className="order-detail-table">
        <Table
          dataSource={order.items}
          columns={columns}
          pagination={false}
          rowKey={(rec) =>
            `${rec.productId}-${rec.color || ""}-${rec.size || ""}`
          }
          scroll={{ x: "max-content" }}
        />
      </div>

      <div style={{ textAlign: "right", marginTop: 16, lineHeight: 1.8 }}>
        {order.subtotal != null && (
          <div>Ara Toplam: {formatPrice(order.subtotal)}</div>
        )}
        {order.couponDiscount > 0 && (
          <div style={{ color: "green" }}>
            Kupon ({order.couponCode}): −{formatPrice(order.couponDiscount)}
          </div>
        )}
        {order.shippingFee != null && (
          <div>
            Kargo:{" "}
            {order.shippingFee > 0
              ? formatPrice(order.shippingFee)
              : "Ücretsiz"}
          </div>
        )}
        <strong>Toplam: {formatPrice(order.total)}</strong>
      </div>
    </Modal>
  );
};

OrderDetailModal.propTypes = {
  visible: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  order: PropTypes.shape({
    _id: PropTypes.string,
    address: PropTypes.string,
    city: PropTypes.string,
    district: PropTypes.string,
    name: PropTypes.string,
    phone: PropTypes.string,
    items: PropTypes.arrayOf(PropTypes.object),
    subtotal: PropTypes.number,
    couponCode: PropTypes.string,
    couponDiscount: PropTypes.number,
    shippingFee: PropTypes.number,
    total: PropTypes.number,
  }),
};

export default OrderDetailModal;
