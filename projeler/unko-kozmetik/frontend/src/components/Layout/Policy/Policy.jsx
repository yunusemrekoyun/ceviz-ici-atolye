import "./Policy.css";

const ITEMS = [
  {
    icon: "bi-truck",
    title: "Ücretsiz kargo",
    text: "1750 ₺ ve üzeri siparişlerde",
  },
  { icon: "bi-headset", title: "7/24 destek", text: "Telefon ve e-posta ile" },
  {
    icon: "bi-arrow-counterclockwise",
    title: "14 gün iade",
    text: "Açılmamış ürünlerde",
  },
  {
    icon: "bi-shield-lock",
    title: "Güvenli ödeme",
    text: "SSL ile korunan ödeme",
  },
];

const Policy = () => {
  return (
    <section className="policy" aria-label="Alışveriş avantajları">
      <div className="container">
        <ul className="policy-list">
          {ITEMS.map((item) => (
            <li className="policy-item" key={item.title}>
              <i className={`bi ${item.icon}`} aria-hidden="true" />
              <div className="policy-texts">
                <strong>{item.title}</strong>
                <span>{item.text}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default Policy;
