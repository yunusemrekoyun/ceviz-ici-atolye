import Logo from "../../assets/logo.png";
import { Link } from "react-router-dom";
import { Facebook, Instagram, Mail, Phone, MapPin } from "lucide-react";
import {
  CONTACT_ADDRESS,
  CONTACT_EMAIL,
  CONTACT_PHONE_LINK,
} from "../../config/site";
import { getAboutContent } from "../../content/aboutContent";
import { useLocale } from "../../i18n/LocaleContext.jsx";
import { localizePath } from "../../i18n/routing.js";

const Footer = () => {
  const { locale } = useLocale();
  const aboutContent = getAboutContent(locale);
  const copy =
    locale === "en"
      ? {
          siteMap: "Site Map",
          about: "About",
          projects: "Projects",
          blog: "Blog",
          contact: "Contact",
          contactTitle: "Contact",
          followUs: "Follow Us",
          rightsReserved: "All rights reserved.",
        }
      : {
          siteMap: "Site Haritası",
          about: "Hakkımızda",
          projects: "Projeler",
          blog: "Blog",
          contact: "İletişim",
          contactTitle: "İletişim",
          followUs: "Bizi Takip Edin",
          rightsReserved: "Tüm hakları saklıdır.",
        };

  return (
    <footer className="bg-buzbeyazseffaf text-secondaryColor border-t border-secondaryColor px-4 pt-12 pb-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 gap-8 md:grid-cols-4 md:gap-10">
        {/* Logo & Kısa Açıklama */}
        <div className="flex flex-col gap-4">
          <img src={Logo} alt="Logo" className="w-36 mb-2" />
          <p className="text-secondaryColor text-sm">{aboutContent.footerText}</p>
        </div>

        {/* Site Haritası */}
        <div>
          <h4 className="text-lg font-semibold mb-4 text-quaternaryColor">
            {copy.siteMap}
          </h4>
          <ul className="space-y-2">
            <li>
              <Link
                to={localizePath("/about", locale)}
                className="text-secondaryColor hover:text-quaternaryColor transition"
              >
                {copy.about}
              </Link>
            </li>
            <li>
              <Link
                to={localizePath("/projects", locale)}
                className="text-secondaryColor hover:text-quaternaryColor transition"
              >
                {copy.projects}
              </Link>
            </li>
            <li>
              <Link
                to={localizePath("/blog", locale)}
                className="text-secondaryColor hover:text-quaternaryColor transition"
              >
                {copy.blog}
              </Link>
            </li>
            <li>
              <Link
                to={localizePath("/iletisim", locale)}
                className="text-secondaryColor hover:text-quaternaryColor transition"
              >
                {copy.contact}
              </Link>
            </li>
          </ul>
        </div>

        {/* İletişim Bilgileri */}
        <div>
          <h4 className="text-lg font-semibold mb-4 text-quaternaryColor">
            {copy.contactTitle}
          </h4>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2">
              <MapPin
                size={18}
                className="mt-0.5 shrink-0 text-secondaryColor"
              />{" "}
              {CONTACT_ADDRESS}
            </li>
            <li className="flex items-center gap-2">
              <Phone size={18} className="text-secondaryColor" />{" "}
              <a
                href={`tel:${CONTACT_PHONE_LINK}`}
                className="hover:text-quaternaryColor transition"
              >
                0 274 223 43 61
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Mail size={18} className="text-secondaryColor" />{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="hover:text-quaternaryColor transition"
              >
                {CONTACT_EMAIL}
              </a>
            </li>
          </ul>
        </div>

        {/* Sosyal Medya */}
        <div>
          <h4 className="text-lg font-semibold mb-4 text-quaternaryColor">
            {copy.followUs}
          </h4>
          <div className="flex gap-4">
            <a
              href="https://www.facebook.com/babilyalitim/"
              aria-label="Facebook"
              className="hover:text-quaternaryColor transition"
            >
              <Facebook size={28} />
            </a>
            <a
              href="https://www.instagram.com/babil_yalitim/"
              aria-label="Instagram"
              className="hover:text-quaternaryColor transition"
            >
              <Instagram size={28} />
            </a>
          </div>
        </div>
      </div>
      <div className="mt-10 border-t border-secondaryColor pt-6 text-center text-xs text-secondaryColor">
        © {new Date().getFullYear()} Babil Yalıtım. {copy.rightsReserved}
      </div>
    </footer>
  );
};

export default Footer;
