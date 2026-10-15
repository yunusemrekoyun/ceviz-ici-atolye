// ServiceDetailsPage.jsx
import NavbarPage from "../components/Navbar/NavbarPage";
import Footer from "../components/Footer/Footer";
import Breadcrumb from "../components/ui/Breadcrumb";
import ServiceDetails from "../components/Service/ServiceDetails";
import { useLocation } from "react-router-dom";
import { useLocale } from "../i18n/LocaleContext";
import { localizePath } from "../i18n/routing.js";

const ServiceDetailsPage = () => {
  const location = useLocation();
  const { locale } = useLocale();
  const title = location.state?.title || "";

  return (
    <>
      <NavbarPage />
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-6">
        <Breadcrumb
          items={[
            { label: locale === "en" ? "Home" : "Ana Sayfa", href: localizePath("/", locale) },
            { label: locale === "en" ? "Services" : "Hizmetler", href: localizePath("/services", locale) },
            { label: title || (locale === "en" ? "Service Detail" : "Hizmet Detayı") },
          ]}
        />
      </div>
      <ServiceDetails />
      <Footer />
    </>
  );
};

export default ServiceDetailsPage;
