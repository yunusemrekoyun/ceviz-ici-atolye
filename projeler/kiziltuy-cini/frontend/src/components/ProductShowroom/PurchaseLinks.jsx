// 📁 components/ProductShowroom/PurchaseLinks.jsx
const PurchaseLinks = () => {
  return (
    <div className="purchase-links">
      <p>Bu ürünü aşağıdaki platformlardan satın alabilirsiniz:</p>
      <a href="https://www.trendyol.com" target="_blank" rel="noreferrer">
        <button className="buy-btn">Trendyol&apos;da Görüntüle</button>
      </a>
      <a href="https://www.etsy.com" target="_blank" rel="noreferrer">
        <button className="buy-btn">Etsy&apos;de Görüntüle</button>
      </a>
    </div>
  );
};

export default PurchaseLinks;
