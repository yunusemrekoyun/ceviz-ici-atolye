import PropTypes from "prop-types";
import useViewportActivation from "../../hooks/useViewportActivation";

const DeferredSection = ({
  children,
  eager = false,
  minHeight = 480,
  rootMargin = "320px 0px",
  className = "",
  id,
}) => {
  const [ref, active] = useViewportActivation({
    disabled: eager,
    rootMargin,
  });

  return (
    <section
      id={id}
      ref={ref}
      className={className}
      style={{
        contentVisibility: active ? "visible" : "auto",
        containIntrinsicSize: `${minHeight}px`,
      }}
    >
      {active ? (
        children
      ) : (
        <div
          aria-hidden="true"
          className="deferred-shell"
          style={{ minHeight: `${minHeight}px` }}
        />
      )}
    </section>
  );
};

DeferredSection.propTypes = {
  children: PropTypes.node.isRequired,
  eager: PropTypes.bool,
  minHeight: PropTypes.number,
  rootMargin: PropTypes.string,
  className: PropTypes.string,
  id: PropTypes.string,
};

export default DeferredSection;
