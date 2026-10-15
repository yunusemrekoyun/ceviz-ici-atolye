// src/components/ContactInfo.jsx
import React from "react";
import PropTypes from "prop-types";

function ContactInfo(props) {
  const { Icon, title, subtitle, keepCase = false } = props;

  return (
    <div className="flex items-start space-x-4 mb-8">
      <div className="text-dark1 text-2xl">
        <Icon />
      </div>
      <div>
        <h4 className={`text-sm font-semibold text-dark1${keepCase ? " break-all" : " uppercase"}`}>{title}</h4>
        <p className="text-sm text-dark2">{subtitle}</p>
      </div>
    </div>
  );
}

ContactInfo.propTypes = {
  Icon: PropTypes.elementType.isRequired,
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string.isRequired,
  // E-posta gibi değerlerde Türkçe büyük harf dönüşümü "i"yi "İ" yapar; olduğu gibi göster.
  keepCase: PropTypes.bool,
};

export default ContactInfo;
