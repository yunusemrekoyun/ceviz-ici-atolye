import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";

export default function TagItem({ tag, count }) {
  // mevcut query param’ları korumak istersen useSearchParams kullanabilirsin
  return (
    <Link
      to={`/blog?tag=${encodeURIComponent(tag)}`}
      className="text-sm text-[#0b0b0d] border border-[#e6e6e6] px-3 py-1 rounded-full mr-2 mb-2 hover:bg-[#e6e6e6] transition flex items-center"
    >
      <span>{tag}</span>
      <span className="text-xs text-gray-500 ml-1">({count})</span>
    </Link>
  );
}

TagItem.propTypes = {
  tag: PropTypes.string.isRequired,
  count: PropTypes.number.isRequired,
};
