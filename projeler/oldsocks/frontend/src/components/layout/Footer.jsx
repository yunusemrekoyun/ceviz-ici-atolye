// src/components/Footer.jsx
import { Link } from "react-router-dom";
import { setConsent } from "../../utils/consent";
import { FaFacebookF, FaInstagram } from "react-icons/fa";
import { useSiteContent } from "../../context/siteContent";

const Footer = () => {
  const content = useSiteContent();
  const footer = content?.footer;
  const contact = content?.contact;
  return (
  <footer className="bg-dark1 text-gray-300 pt-12 pb-16 md:pb-0">
    <div className="container mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 px-6">
      {/* Hakkımızda */}
      <div>
        <h3 className="text-white font-semibold mb-4">OLDSOCKS</h3>
        <p className="text-sm whitespace-pre-line">{footer?.description ?? "Kaliteyi ve tarzı bir araya getiren OLDSOCKS, her adımda konforu sunmayı hedefler. Siz de stilinize yön vermek istiyorsanız doğru yerdesiniz."}</p>
      </div>

      {/* Site Haritası */}
      <div>
        <h4 className="text-white font-semibold mb-3">Site Haritası</h4>
        <div className="flex justify-between text-sm">
          <ul className="space-y-2">
            <li>
              <Link to="/">Ana Sayfa</Link>
            </li>
            <li>
              <Link to="/shop">Mağaza</Link>
            </li>
            <li>
              <Link to="/about">Hakkımızda</Link>
            </li>
            <li>
              <Link to="/blog">Blog</Link>
            </li>
          </ul>
          {/* Burada sadece text-right'ı kaldırdık */}
          <ul className="space-y-2">
            <li>
              <Link to="/siparis-takip">Sipariş Takibi</Link>
            </li>
            <li>
              <Link to="/agreement">Satış Sözleşmesi</Link>
            </li>
            <li>
              <Link to="/kvkk">KVKK Aydınlatma Metni</Link>
            </li>
            <li>
              <button type="button" onClick={() => setConsent(null)} className="text-left hover:underline">
                Çerez Tercihleri
              </button>
            </li>
          </ul>
        </div>
      </div>

      {/* Sosyal Medya */}
      <div>
        <h4 className="text-white font-semibold mb-3">Bizi Takip Edin</h4>
        <div className="flex space-x-4">
          {(footer?.facebookUrl ?? "https://www.facebook.com/Oldsockscollection/") && <a
            href={footer?.facebookUrl ?? "https://www.facebook.com/Oldsockscollection/"}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Oldsocks Facebook hesabı"
          >
            <FaFacebookF className="hover:text-purple-500 cursor-pointer" />
          </a>}
          {(footer?.instagramUrl ?? "https://www.instagram.com/oldscks/") && <a
            href={footer?.instagramUrl ?? "https://www.instagram.com/oldscks/"}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Oldsocks Instagram hesabı"
          >
            <FaInstagram className="hover:text-purple-500 cursor-pointer" />
          </a>}
        </div>
      </div>

      {/* İletişim */}
      <div>
        <h4 className="text-white font-semibold mb-3">İletişim</h4>
        <p className="text-sm">{contact?.phone ?? "+90 541 428 29 89"}</p>
        <p className="text-sm">{contact?.email ?? "oldscks@gmail.com"}</p>
        <p className="text-sm">{footer?.address ?? "Alipaşa mahallesi üçbey sokak no7/A Kütahya Merkez"}</p>
      </div>
    </div>

    <div className="border-t border-gray-800 mt-8 py-4 text-center text-sm">
      © {new Date().getFullYear()} OLDSOCKS. Tüm hakları saklıdır.
    </div>
  </footer>
  );
};

export default Footer;
