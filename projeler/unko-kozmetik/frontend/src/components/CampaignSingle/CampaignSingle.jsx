import { Link } from "react-router-dom";
import "./CampaignSingle.css";

const CampaignSingle = () => {
  return (
    <section className="campaign">
      <div className="container">
        <div className="campaign-card">
          <img
            src="/img/site/banner-campaign.jpg"
            alt="Kuaför, fırça ve fön makinesiyle müşterisinin saçına şekil veriyor"
            loading="lazy"
          />
          <div className="campaign-content">
            <span className="eyebrow">Sezon fırsatları</span>
            <h2>Profesyonel bakım, indirimli fiyatlarla</h2>
            <p>
              Saç bakımından şekillendirme cihazlarına seçili ürünlerde sezon
              fiyatları. Stoklarla sınırlıdır.
            </p>
            <Link to="/shop?discounted=true" className="btn btn-light btn-lg">
              İndirimleri gör <i className="bi bi-arrow-right" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CampaignSingle;
