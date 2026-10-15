// src/components/blog/BlogOwner.jsx
import React from "react";
import placeholderAvatar from "../../assets/blog/blog-owner/author.webp";

const BlogOwner = ({ avatar, name, bio }) => {
  // avatar props boşsa placeholder kullan
  const imgSrc = avatar || placeholderAvatar;

  return (
    <div className="flex items-center space-x-6 mt-12 pt-8 border-t border-gray-200">
      <img
        src={imgSrc}
        alt={name}
        className="w-20 h-20 rounded-full object-cover"
      />
      <div>
        <h3 className="text-xl font-medium text-gray-900">{name}</h3>
        <p className="text-gray-600 mt-2">{bio}</p>
      </div>
    </div>
  );
};

export default BlogOwner;
