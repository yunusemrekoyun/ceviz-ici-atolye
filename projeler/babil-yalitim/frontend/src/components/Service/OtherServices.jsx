import PropTypes from "prop-types";
import { useEffect, useState } from "react";
import OtherServiceItem from "./OtherServiceItem";
import { motion } from "framer-motion";
import { fetchServicesCached } from "../../utils/servicesCache";
import { useLocale } from "../../i18n/LocaleContext";

const OtherServices = ({ currentId, services: servicesProp = null, loading = false }) => {
  const { locale } = useLocale();
  const [services, setServices] = useState([]);

  useEffect(() => {
    if (Array.isArray(servicesProp)) {
      setServices(servicesProp.filter((s) => s._id !== currentId));
      return undefined;
    }

    (async () => {
      try {
        const list = await fetchServicesCached({ locale });
        setServices(list.filter((s) => s._id !== currentId));
      } catch (e) {
        console.error("GET /services (other) error:", e?.response?.data || e);
        setServices([]);
      }
    })();
  }, [currentId, locale, servicesProp]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-3xl bg-white/80 backdrop-blur border shadow-sm p-5 sticky top-6"
    >
      <h3 className="text-lg font-bold text-brandBlue mb-4">
        {locale === "en" ? "Other Services" : "Diğer Hizmetler"}
      </h3>
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
        {services.length > 0 ? (
          services.map((s) => <OtherServiceItem key={s._id} service={s} />)
        ) : loading ? (
          <p className="text-sm text-gray-500">
            {locale === "en" ? "Loading..." : "Yükleniyor…"}
          </p>
        ) : (
          <p className="text-sm text-gray-500">
            {locale === "en" ? "No other services yet." : "Henüz başka hizmet yok."}
          </p>
        )}
      </div>
    </motion.div>
  );
};

OtherServices.propTypes = {
  currentId: PropTypes.string.isRequired,
  services: PropTypes.arrayOf(PropTypes.object),
  loading: PropTypes.bool,
};

export default OtherServices;
