import PropTypes from "prop-types";
import { Link } from "react-router-dom"; // ← Link eklendi
import "./CampaignItem.css";

const CampaignItem = ({ campaign }) => {
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  return (
    <Link
      to={`/shop?campaign=${campaign._id}`} // ← kampanya parametreli link
      className="campaign-item"
      style={{
        backgroundImage: `url(${apiUrl}/api/campaigns/${campaign._id}/image)`,
      }}
    >
      <h3 className="campaign-title">{campaign.title}</h3>
      <p className="campaign-desc">{campaign.description}</p>
      <span className="btn btn-primary">
        Ürünleri Görüntüle <i className="bi bi-arrow-right"></i>
      </span>
    </Link>
  );
};

CampaignItem.propTypes = {
  campaign: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    products: PropTypes.array,
  }).isRequired,
};

export default CampaignItem;
