import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import CategoryItem from "./CategoryItem";
import useCategoriesCache from "../../hooks/useCategoriesCache";

const PAGE_SIZE_DESKTOP = 4;
const PAGE_SIZE_MOBILE = 2;
const AUTO_SCROLL_DELAY = 7000;

export default function Categories() {
  const { data: cachedCategories, loading } = useCategoriesCache();
  const [page, setPage] = useState(0);
  const containerRef = useRef(null);
  const navigate = useNavigate();
  const isMobile = window.innerWidth < 640;
  const PAGE_SIZE = isMobile ? PAGE_SIZE_MOBILE : PAGE_SIZE_DESKTOP;
  const roots = Array.isArray(cachedCategories)
    ? cachedCategories
        .filter((c) => c.parent === null)
        .sort((a, b) => a.name.localeCompare(b.name, "tr"))
    : [];
  const categories = roots;
  const maxStartIndex = Math.max(0, categories.length - PAGE_SIZE);
  const totalPages = Math.max(1, maxStartIndex + 1);
  const itemWidthPercent = 100 / PAGE_SIZE;

  useEffect(() => {
    if (categories.length) {
      setPage(0);
    }
  }, [categories.length]);

  useEffect(() => {
    setPage((prev) => Math.min(prev, totalPages - 1));
  }, [totalPages]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPage((prev) => (prev + 1) % totalPages);
    }, AUTO_SCROLL_DELAY);

    return () => clearTimeout(timeout);
  }, [page, totalPages]);

  // Sayfa scroll davranışı
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const item = el.querySelector("[data-category-item]");
    const itemWidth = item ? item.clientWidth : el.clientWidth / PAGE_SIZE;
    el.scrollTo({
      left: itemWidth * page,
      behavior: "smooth",
    });
  }, [page, PAGE_SIZE]);

  // Swipe hareketi ile geçiş
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let startX = 0;

    const handleTouchStart = (e) => (startX = e.touches[0].clientX);
    const handleTouchEnd = (e) => {
      const deltaX = e.changedTouches[0].clientX - startX;
      if (deltaX > 50) {
        setPage((prev) => Math.max(0, prev - 1));
      } else if (deltaX < -50) {
        setPage((prev) => Math.min(totalPages - 1, prev + 1));
      }
    };

    let mouseDown = false;
    const handleMouseDown = (e) => {
      mouseDown = true;
      startX = e.clientX;
    };
    const handleMouseUp = (e) => {
      if (!mouseDown) return;
      mouseDown = false;
      const deltaX = e.clientX - startX;
      if (deltaX > 50) {
        setPage((prev) => Math.max(0, prev - 1));
      } else if (deltaX < -50) {
        setPage((prev) => Math.min(totalPages - 1, prev + 1));
      }
    };

    el.addEventListener("touchstart", handleTouchStart);
    el.addEventListener("touchend", handleTouchEnd);
    el.addEventListener("mousedown", handleMouseDown);
    el.addEventListener("mouseup", handleMouseUp);

    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchend", handleTouchEnd);
      el.removeEventListener("mousedown", handleMouseDown);
      el.removeEventListener("mouseup", handleMouseUp);
    };
  }, [totalPages]);

  if (loading) {
    return (
      <section className="bg-light2 py-10 text-center">
        Kategoriler yükleniyor…
      </section>
    );
  }

  if (categories.length === 0) {
    return (
      <section className="bg-light2 py-10 text-center">
        Kategori bulunamadı.
      </section>
    );
  }

  return (
    <section className="bg-light2/60 backdrop-blur-sm py-6 sm:py-10">
      <div className="container mx-auto px-4 overflow-hidden">
        <div
          ref={containerRef}
          className="flex transition-all duration-500 ease-in-out no-scrollbar"
          style={{ scrollSnapType: "x mandatory", overflowX: "auto" }}
        >
          {categories.map((c) => (
            <div
              key={c._id}
              data-category-item
              className="px-1 select-none"
              style={{
                flex: `0 0 ${itemWidthPercent}%`,
                scrollSnapAlign: "start",
              }}
            >
              <CategoryItem
                image={c.image}
                alt={c.name}
                onClick={() => navigate(`/shop?kategori=${encodeURIComponent(c._id)}`)}
              />
            </div>
          ))}
        </div>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .select-none img {
          user-drag: none;
          -webkit-user-drag: none;
          pointer-events: none;
        }
      `}</style>
    </section>
  );
}
