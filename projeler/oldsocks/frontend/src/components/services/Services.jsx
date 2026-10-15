// src/components/Services.jsx
import React, { useEffect, useState } from "react";
import { FaShippingFast, FaShieldAlt, FaHeadset } from "react-icons/fa";
import publicApi from "../../../publicApi";
import { formatTry } from "../../utils/currency";

const baseServices = [
  {
    id: 1,
    icon: <FaShippingFast className="h-9 w-9 text-primary" />,
    title: "Hızlı Kargo",
    subtitle: "Siparişleriniz en kısa sürede kapınızda",
  },
  {
    id: 2,
    icon: <FaShieldAlt className="h-9 w-9 text-primary" />,
    title: "Güvenli Alışveriş",
    subtitle: "Tüm işlemleriniz %100 güvence altında",
  },
  {
    id: 3,
    icon: <FaHeadset className="h-9 w-9 text-primary" />,
    title: "Güvenilir Destek",
    subtitle: "Satış öncesi ve sonrası yanınızdayız",
  },
];

const Services = () => {
  const [services, setServices] = useState(baseServices);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await publicApi.get("/shipping");
        if (!alive) return;
        const list = Array.isArray(data) ? data : [];

        // sadece ilk kargo methodunu baz alalım
        const method = list[0];
        if (method?.freeShippingThreshold != null) {
          setServices([
            {
              id: "free-shipping",
              icon: <FaShippingFast className="h-9 w-9 text-primary" />,
              title: `${method.name}`,
              subtitle: `${formatTry(method.freeShippingThreshold, {
                fractionDigits: 0,
              })} üzeri alışverişlerde kargo ücretsiz`,
            },
            ...baseServices.filter((s) => s.id !== 1), // mevcut "Hızlı Kargo" yerine bunu koy
          ]);
        } else {
          setServices(baseServices);
        }
      } catch (e) {
        console.error("services shipping error:", e);
        setServices(baseServices);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <section className="bg-light1 py-8 sm:py-16">
      <div className="container mx-auto px-4">
        {/* Mobilde kompakt satırlar (simge solda), geniş ekranda kartlar. */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {services.map(({ id, icon, title, subtitle }) => (
            <div
              key={id}
              className="group flex items-center gap-4 rounded-xl border border-light2 bg-white p-4 text-left shadow-sm transition-all duration-300 hover:border-primary hover:bg-light1 hover:shadow-xl sm:flex-col sm:gap-0 sm:p-8 sm:text-center sm:shadow-md"
            >
              <div className="shrink-0 transform transition-transform duration-300 group-hover:scale-110 sm:mb-5">
                {icon}
              </div>
              <div>
                <h4 className="text-base font-semibold text-dark1 group-hover:text-primary sm:text-lg">
                  {title}
                </h4>
                <p className="mt-1 text-sm leading-relaxed text-dark2 sm:mt-2">
                  {subtitle}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;
