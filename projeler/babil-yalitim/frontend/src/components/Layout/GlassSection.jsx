import PropTypes from "prop-types";

const GlassSection = ({ children }) => (
  <div
    className="glass-shell relative z-10 w-full max-w-6xl transition-all duration-300 transform-gpu-soft"
  >
    {children}
  </div>
);
GlassSection.propTypes = {
  children: PropTypes.node,
};

export default GlassSection;
