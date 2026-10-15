import "./CampaignItem.css"

const CampaignItem = () => {
  return (
    <div className="campaign-item">
      <h3 className="campaign-title">
        Çini Kampanyası <br />
        Çini Kampanyası <br />
        Keşfet
      </h3>
      <p className="campaign-desc">
Kamoanya detayı
      </p>
      <a href="#" className="btn btn-primary">
        Hepsini Gör
        <i className="bi bi-arrow-right"></i>
      </a>
    </div>
  );
};

export default CampaignItem;
