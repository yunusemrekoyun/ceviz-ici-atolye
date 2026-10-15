// src/pages/AboutPage.jsx
import React from "react";
import BreadCrumb from "../components/breadCrumb/BreadCrumb";
import OurVision from "../components/about/OurVision";
import OurMission from "../components/about/OurMission";
import History from "../components/about/History";
import Categories from "../components/categories/Categories";
import Services from "../components/services/Services";
import { useSiteContent } from "../context/siteContent";
import usePageMeta from "../hooks/usePageMeta";

const AboutPage = () => {
  usePageMeta({ title: "Hakkımızda" });
  const content = useSiteContent();
  return (
  <>
    <BreadCrumb />
    <OurVision content={content?.about?.vision} />
    <OurMission content={content?.about?.mission} />
    <History content={content?.about?.history} />
    <Categories />
    <Services />
  </>
  );
};

export default AboutPage;
