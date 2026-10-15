import Services from "./Services";
import PropTypes from "prop-types";

const ServicePageComponent = ({ q }) => {
  return <Services q={q} />;
};

ServicePageComponent.propTypes = {
  q: PropTypes.string.isRequired,
};

export default ServicePageComponent;
