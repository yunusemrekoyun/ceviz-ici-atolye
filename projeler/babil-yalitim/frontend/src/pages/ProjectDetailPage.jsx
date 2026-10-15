// src/pages/ProjectDetailPage.jsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import NavbarPage from "../components/Navbar/NavbarPage";
import Footer from "../components/Footer/Footer";
import ProjectDetail from "../components/ProjeGrid/ProjectDetail";
import Breadcrumb from "../components/ui/Breadcrumb";
import api from "../api";
import { useLocale } from "../i18n/LocaleContext";

const ProjectDetailPage = () => {
  const { id } = useParams();
  const { locale } = useLocale();
  const [projectTitle, setProjectTitle] = useState("");

  useEffect(() => {
    if (!id) return;
    api.get(`/projects/${id}`, { params: { locale } }).then(({ data }) => {
      setProjectTitle(data?.title || "");
    });
  }, [id, locale]);

  return (
    <>
      <NavbarPage />

      <section className="max-w-7xl mx-auto px-4 md:px-8 pt-6">
        <Breadcrumb
          titleMap={{
            "project-detail": locale === "en" ? "Projects" : "Projelerimiz",
            projects: locale === "en" ? "Projects" : "Projelerimiz",
            [id]: projectTitle || (locale === "en" ? "Loading..." : "Yükleniyor..."),
          }}
          nonLinkLabels={[locale === "en" ? "Projects" : "Projelerimiz"]}
        />
      </section>

      <ProjectDetail />
      <Footer />
    </>
  );
};

export default ProjectDetailPage;
