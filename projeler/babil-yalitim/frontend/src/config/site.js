export const SITE_NAME =
  import.meta.env.VITE_SITE_NAME || "Babil Yalitim ve Izolasyon";
export const SITE_TITLE = import.meta.env.VITE_SITE_TITLE || SITE_NAME;
export const SITE_DESCRIPTION =
  import.meta.env.VITE_SITE_DESCRIPTION ||
  "Babil Yalitim, su yalitimi ve yapi koruma sistemlerinde dogru malzeme, dogru uygulama ve uzman iscilikle kalici cozumler sunar.";

export const CONTACT_PHONE_DISPLAY =
  import.meta.env.VITE_CONTACT_PHONE_DISPLAY || "+90 555 123 45 67";
export const CONTACT_PHONE_LINK =
  import.meta.env.VITE_CONTACT_PHONE_LINK || "+905551234567";
export const CONTACT_PHONE_DISPLAY_2 =
  import.meta.env.VITE_CONTACT_PHONE_DISPLAY_2 || "+90 532 674 01 61";
export const CONTACT_PHONE_LINK_2 =
  import.meta.env.VITE_CONTACT_PHONE_LINK_2 || "+905326740161";
export const CONTACT_PHONES = [
  {
    display: CONTACT_PHONE_DISPLAY,
    link: CONTACT_PHONE_LINK,
  },
  CONTACT_PHONE_DISPLAY_2 && CONTACT_PHONE_LINK_2
    ? {
        display: CONTACT_PHONE_DISPLAY_2,
        link: CONTACT_PHONE_LINK_2,
      }
    : null,
].filter(Boolean);
export const CONTACT_EMAIL =
  import.meta.env.VITE_CONTACT_EMAIL || "babilyalitim@gmail.com";
export const CONTACT_ADDRESS =
  import.meta.env.VITE_CONTACT_ADDRESS || "Canakkale, Turkiye";
export const CONTACT_HOURS =
  import.meta.env.VITE_CONTACT_HOURS || "Hafta ici 09:00 - 18:00";
export const CONTACT_MAP_URL =
  import.meta.env.VITE_CONTACT_MAP_URL ||
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3048.339230087954!2d26.404188!3d40.155187!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x14b06f7784efdbf3%3A0x3b3de47d5d77e56e!2sAtat%C3%BCrk%20Mah.%20%C4%B0n%C5%9Faat%20Cad.%20No%3A1%2C%20%C3%87anakkale!5e0!3m2!1str!2str!4v1690300123456";
