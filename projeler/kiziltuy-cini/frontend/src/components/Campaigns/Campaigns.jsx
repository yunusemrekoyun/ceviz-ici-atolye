import { useEffect, useState } from "react";
import CampaignItem from "./CampaignItem";
import "./Campaigns.css";

const Campaigns = () => {
  const [campaigns, setCampaigns] = useState([]);
  // İlk sayfa, istersen ileride state’e taşıyıp “Daha fazla” yapabilirsin
  const page = 1;
  // Bir sayfada kaç kampanya gelsin? (10,20…100)
  const limit = 100;

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const res = await fetch(
          `${
            import.meta.env.VITE_API_BASE_URL
          }/api/campaigns?page=${page}&limit=${limit}`
        );
        const result = await res.json();
        // artık result = { total, page, totalPages, campaigns: […] }
        setCampaigns(result.campaigns);
      } catch (err) {
        console.error("Kampanyalar alınamadı:", err);
      }
    };

    fetchCampaigns();
  }, []); // page/limit değişmiyorsa boş bağlılık listesi

  // Her 2’li kampanyayı bir arada göstermek için
  const chunked = campaigns.reduce((acc, _, i) => {
    if (i % 2 === 0) acc.push(campaigns.slice(i, i + 2));
    return acc;
  }, []);

  return (
    <section className="campaigns">
      <div className="container">
        {chunked.map((pair, index) => (
          <div className="campaigns-wrapper" key={index}>
            {pair.map((item) => (
              <CampaignItem key={item._id} campaign={item} />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
};

export default Campaigns;
