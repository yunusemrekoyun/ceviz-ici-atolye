import { useLocation, useParams } from "react-router-dom";
import NavbarPage from "../components/Navbar/NavbarPage";
import Footer from "../components/Footer/Footer";
import Breadcrumb from "../components/ui/Breadcrumb";
import SubServiceDetails from "../components/Service/SubServiceDetails";
import { useLocale } from "../i18n/LocaleContext";
import { localizePath } from "../i18n/routing.js";

const SubServiceDetailsPage = () => {
  const location = useLocation();
  const { serviceId } = useParams();
  const { locale } = useLocale();
  const parentTitle = location.state?.parentTitle || (locale === "en" ? "Service" : "Hizmet");
  const subServiceTitle =
    location.state?.subServiceTitle || (locale === "en" ? "Sub-service" : "Alt Hizmet");

  return (
    <>
      <NavbarPage />
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-6">
        <Breadcrumb
          items={[
            { label: locale === "en" ? "Home" : "Ana Sayfa", href: localizePath("/", locale) },
            { label: locale === "en" ? "Services" : "Hizmetler", href: localizePath("/services", locale) },
            { label: parentTitle, href: localizePath(`/services/${serviceId}`, locale) },
            { label: subServiceTitle },
          ]}
        />
      </div>
      <SubServiceDetails />
      <Footer />
    </>
  );
};

export default SubServiceDetailsPage;
