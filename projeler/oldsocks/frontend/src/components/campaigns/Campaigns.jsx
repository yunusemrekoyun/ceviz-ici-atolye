// src/components/Campaigns.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CampaignItem from "./CampaignItem";
import publicApi from "../../../publicApi";

export default function Campaigns() {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    publicApi
      .get("/mini-campaigns")
      .then(({ data }) => setSlots(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSlotClick = async (slot) => {
    try {
      const { data } = await publicApi.get(`/mini-campaigns/active?slot=${slot}`);
      // ShopPage'e yönlendir:
      navigate("/shop", {
        state: {
          miniCampaignItems: data.items,
          miniCampaignTitle: data.title,
        },
      });
    } catch (err) {
      console.error(err);
    }
  };

  const slot1 = slots.find((c) => c.slot === 1);
  const slot2 = slots.find((c) => c.slot === 2);
  // Kampanya yoksa (veya yüklenirken) sayfada boş alan bırakma.
  if (loading || (!slot1 && !slot2)) return null;

  return (
    <section className="container mx-auto px-4 py-12">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[slot1, slot2].map(
          (c) =>
            c && (
              <CampaignItem
                key={c._id}
                image={c.imageUrl}
                title={c.title}
                onClick={() => handleSlotClick(c.slot)}
              />
            )
        )}
      </div>
    </section>
  );
}
