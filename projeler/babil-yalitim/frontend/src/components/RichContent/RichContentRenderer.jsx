import { useMemo } from "react";
import PropTypes from "prop-types";
import { buildRichContentHtml } from "../../utils/richContent";

const RichContentRenderer = ({ content, className = "" }) => {
  const html = useMemo(() => buildRichContentHtml(content), [content]);

  return (
    <div
      className={`rich-content ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

RichContentRenderer.propTypes = {
  content: PropTypes.string,
  className: PropTypes.string,
};

export default RichContentRenderer;
