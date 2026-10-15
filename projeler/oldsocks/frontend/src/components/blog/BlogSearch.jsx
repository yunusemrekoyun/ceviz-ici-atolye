// src/components/blog/BlogSearch.jsx
import React, { useState, useEffect, useRef } from "react";
import { FaSearch } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import api from "../../../api";

export default function BlogSearch() {
  const [allBlogs, setAllBlogs] = useState([]);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [showNoResults, setShowNoResults] = useState(false);
  const wrapperRef = useRef();
  const navigate = useNavigate();

  // Sayfa yüklendiğinde tüm blogları getir
  useEffect(() => {
    api
      .get("/blogs")
      .then(({ data }) => setAllBlogs(data))
      .catch((err) => console.error("Bloglar alınamadı:", err));
  }, []);

  // query değiştikçe filtrele
  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      setSuggestions([]);
      setShowNoResults(false);
      return;
    }
    const matches = allBlogs.filter((b) => b.title.toLowerCase().includes(q));
    setSuggestions(matches);
    setOpen(matches.length > 0);
    setShowNoResults(false);
  }, [query, allBlogs]);

  // dışarı tıklayınca dropdown’u kapat
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
        setShowNoResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const goToBlog = (slug) => {
    setOpen(false);
    setQuery("");
    setShowNoResults(false);
    navigate(`/blog/${slug}`);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (suggestions.length > 0) {
        goToBlog(suggestions[0].slug);
      } else {
        setShowNoResults(true);
        setOpen(true);
      }
    }
  };

  return (
    <div className="relative mb-8" ref={wrapperRef}>
      <h4 className="text-lg font-semibold mb-3 text-[#0b0b0d]">
        Arama Anahtar Kelimesi
      </h4>
      <div className="flex">
        <input
          type="text"
          value={query}
          placeholder="Arama yapın..."
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query && setOpen(true)}
          className="w-full border border-[#ddd] rounded-l-lg px-4 py-2 focus:outline-none text-[#444] placeholder-[#888]"
        />
        <button
          type="button"
          aria-label="Bloglarda ara"
          onClick={() => {
            if (suggestions.length > 0) goToBlog(suggestions[0].slug);
            else {
              setShowNoResults(true);
              setOpen(true);
            }
          }}
          className="bg-[#0b0b0d] hover:bg-[#444] text-white px-4 rounded-r-lg transition-colors"
        >
          <FaSearch />
        </button>
      </div>

      {(open || showNoResults) && (
        <ul className="absolute z-10 w-full bg-white border border-[#ddd] rounded-b-lg max-h-64 overflow-auto mt-1 shadow-lg">
          {suggestions.map((b) => (
            <li
              key={b._id}
              className="flex items-center gap-3 px-4 py-2 hover:bg-gray-100 cursor-pointer"
              onClick={() => goToBlog(b.slug)}
            >
              <img
                src={b.coverImageUrl}
                alt={b.title}
                className="w-10 h-10 object-cover rounded"
              />
              <span className="text-sm text-[#0b0b0d]">{b.title}</span>
            </li>
          ))}

          {showNoResults && (
            <li className="px-4 py-2 text-sm text-gray-500">
              Bulunamadı: "{query}"
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
