import React from "react";
import Hero from "../components/hero/Hero";
import Categories from "../components/categories/Categories";
import SecondHero from "../components/hero/SecondHero"; // İkinci hero bileşenini ekle
import Campaigns from "../components/campaigns/Campaigns";
import Services from "../components/services/Services";
import HomeProductSection from "../components/products/HomeProductSection";
import { normalizeSectionOrder, useStorefrontSettings } from "../context/storefrontSettings";
import usePageMeta from "../hooks/usePageMeta";

const HomePage = () => {
  usePageMeta({});
  const { sectionOrder, sections } = useStorefrontSettings();
  const order = normalizeSectionOrder(sectionOrder);
  const productSection = (key) => sections?.[key]?.visible === false
    ? null
    : <HomeProductSection key={key} sectionKey={key} />;

  return <>
    {/* Sayfanın ana başlığı (ekran okuyucular ve arama motorları için; görünmez). */}
    <h1 className="sr-only">OLDSOCKS online mağaza</h1>
    <Hero />
    <Categories />
    {productSection(order[0])}
    {productSection(order[1])}
    <SecondHero />
    {productSection(order[2])}
    <Campaigns />
    <Services />
  </>;
};

export default HomePage;
