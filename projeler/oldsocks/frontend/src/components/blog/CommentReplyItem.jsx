/* src/components/blog/CommentReplyItem.jsx */
import React from "react";
import placeholderAvatar from "../../assets/blog/blog-owner/author.webp";

export default function CommentReplyItem({ reply }) {
  const { author, createdAt, text } = reply;
  const date = new Date(createdAt).toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const avatarUrl = author?.avatar || placeholderAvatar;

  return (
    <div className="flex space-x-3 mb-4 ml-12">
      <img
        src={avatarUrl}
        alt={`${author.firstName} ${author.lastName}`}
        className="w-8 h-8 rounded-full object-cover"
      />
      <div className="flex-1 bg-gray-50 p-3 rounded">
        <div className="flex justify-between items-center">
          <span className="font-medium text-sm text-gray-800">
            {author.firstName} {author.lastName}
          </span>
          <span className="text-xs text-gray-500">{date}</span>
        </div>
        <p className="text-gray-700 mt-1 text-sm">{text}</p>
      </div>
    </div>
  );
}
