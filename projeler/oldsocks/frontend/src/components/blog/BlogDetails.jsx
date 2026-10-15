// src/components/blog/BlogDetails.jsx
import React from "react";
import {
  FaUserAlt,
  FaFolderOpen,
  FaComments,
  FaFacebookF,
  FaTwitter,
  FaPinterestP,
} from "react-icons/fa";

export default function BlogDetails({
  image,
  date,
  title,
  author,
  category,
  comments,
  content,
  quote,
}) {
  const blocks = String(content || "")
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  const renderBlock = (block, index) => {
    const heading = block.match(/^(#{1,6})\s+(.+)$/s);
    if (heading) {
      const level = Math.min(heading[1].length + 1, 6);
      const HeadingTag = `h${level}`;
      return (
        <HeadingTag
          key={`heading-${index}`}
          className="mt-8 mb-3 font-serif text-2xl font-bold text-[#0b0b0d]"
        >
          {heading[2].trim()}
        </HeadingTag>
      );
    }

    const lines = block.split("\n").map((line) => line.trim());
    if (lines.every((line) => /^[-*]\s+/.test(line))) {
      return (
        <ul key={`list-${index}`} className="mb-5 list-disc space-y-2 pl-6">
          {lines.map((line, lineIndex) => (
            <li key={`${index}-${lineIndex}`}>{line.replace(/^[-*]\s+/, "")}</li>
          ))}
        </ul>
      );
    }

    if (lines.every((line) => /^\d+\.\s+/.test(line))) {
      return (
        <ol key={`list-${index}`} className="mb-5 list-decimal space-y-2 pl-6">
          {lines.map((line, lineIndex) => (
            <li key={`${index}-${lineIndex}`}>{line.replace(/^\d+\.\s+/, "")}</li>
          ))}
        </ol>
      );
    }

    if (block.startsWith("> ")) {
      return (
        <blockquote
          key={`quote-${index}`}
          className="my-6 border-l-4 border-[#03588C] pl-5 italic text-[#444]"
        >
          {block.replace(/^>\s?/gm, "")}
        </blockquote>
      );
    }

    return (
      <p key={`paragraph-${index}`} className="mb-4 whitespace-pre-line">
        {block}
      </p>
    );
  };

  return (
    <article className="mb-12">
      <div className="relative rounded-lg overflow-hidden shadow-lg">
        <img src={image} alt={title} className="w-full object-cover" />
        <div className="absolute top-4 left-4 bg-[#03588C] text-white text-sm font-semibold px-3 py-1 rounded">
          {date}
        </div>
      </div>

      <h1 className="mt-6 text-3xl font-serif font-bold text-[#0b0b0d]">
        {title}
      </h1>

      <div className="flex items-center space-x-6 text-[#666] text-sm mt-2">
        <span className="flex items-center">
          <FaUserAlt className="mr-1" /> {author}
        </span>
        <span className="flex items-center">
          <FaFolderOpen className="mr-1" /> {category}
        </span>
        <span className="flex items-center">
          <FaComments className="mr-1" /> {comments} Yorumlar
        </span>
      </div>

      <div className="text-lg max-w-full break-words text-[#444] mt-6 leading-relaxed">
        {blocks.map(renderBlock)}
      </div>

      {quote && (
        <blockquote className="border-l-4 border-[#03588C] italic pl-6 my-8 text-[#444]">
          {quote}
        </blockquote>
      )}
    </article>
  );
}
