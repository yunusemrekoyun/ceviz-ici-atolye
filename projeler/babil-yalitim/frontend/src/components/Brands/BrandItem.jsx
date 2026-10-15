import PropTypes from "prop-types";

const BrandVisual = ({ brand }) => (
  <div className="w-32 h-20 flex items-center justify-center bg-white/70 rounded-xl shadow-sm hover:scale-105 transition-transform duration-300">
    <img src={brand.img} alt={brand.name} className="h-12 object-contain" />
  </div>
);

BrandVisual.propTypes = {
  brand: PropTypes.shape({
    img: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
  }).isRequired,
};

const BrandItem = ({ brand, disableLink = false }) => {
  if (disableLink) {
    return (
      <div className="inline-block" aria-label={brand.name}>
        <BrandVisual brand={brand} />
      </div>
    );
  }

  return (
    <a
      href={brand.link}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-block"
    >
      <BrandVisual brand={brand} />
    </a>
  );
};

BrandItem.propTypes = {
  brand: PropTypes.shape({
    img: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    link: PropTypes.string,
  }).isRequired,
  disableLink: PropTypes.bool,
};

export default BrandItem;
