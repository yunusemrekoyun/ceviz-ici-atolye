// src/components/blog/BlogItem.jsx
import React from "react";
import PropTypes from "prop-types";
import { FaUserAlt, FaFolderOpen, FaComments } from "react-icons/fa";
import { Link } from "react-router-dom";

const BlogItem = ({
  image,
  date,
  title,
  excerpt,
  author,
  category,
  comments,
  to, // yeni prop
}) => (
  <article className="group bg-white rounded-xl shadow-md hover:shadow-xl transition overflow-hidden border border-light2">
    <div className="relative overflow-hidden">
      <Link to={to}>
        <img
          src={image}
          alt={title}
          className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-500"
        />
      </Link>
      <div className="absolute top-4 left-4 bg-dark1 text-white text-xs font-semibold px-3 py-1 rounded-full shadow">
        {date}
      </div>
    </div>
    <div className="p-6">
      <Link to={to}>
        <h3 className="text-2xl font-serif font-bold text-dark1 group-hover:text-black transition duration-300">
          {title}
        </h3>
      </Link>
      <p className="text-dark2 text-sm leading-relaxed mt-3 mb-5">{excerpt}</p>
      <div className="flex flex-wrap items-center gap-4 text-sm text-dark2">
        <span className="flex items-center gap-1">
          <FaUserAlt className="text-xs" />
          {author}
        </span>
        <span className="flex items-center gap-1">
          <FaFolderOpen className="text-xs" />
          {category}
        </span>
        <span className="flex items-center gap-1">
          <FaComments className="text-xs" />
          {comments} Yorumlar
        </span>
      </div>
    </div>
  </article>
);

BlogItem.propTypes = {
  image: PropTypes.string.isRequired,
  date: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  excerpt: PropTypes.string.isRequired,
  author: PropTypes.string.isRequired,
  category: PropTypes.string.isRequired,
  comments: PropTypes.number.isRequired,
  to: PropTypes.string.isRequired,
};

export default BlogItem;
