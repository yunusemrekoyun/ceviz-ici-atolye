import PropTypes from "prop-types";
import BrandGrid from "./BrandGrid";

const BrandsSection = ({ compact = false }) => {
  return (
    <section
      className={`w-full md:px-8 ${
        compact
          ? "px-2 pt-2 pb-2 sm:px-4"
          : "px-2 pt-3 pb-4 sm:px-6 sm:pt-4 sm:pb-4"
      }`}
      id="brands"
    >
      <div className="max-w-7xl mx-auto">
        <div className={`glass-shell-strong px-3 pt-2 pb-2 ${compact ? "" : "sm:px-6 sm:pb-4"}`}>
          <BrandGrid />
        </div>
      </div>
    </section>
  );
};

BrandsSection.propTypes = {
  compact: PropTypes.bool,
};

export default BrandsSection;
