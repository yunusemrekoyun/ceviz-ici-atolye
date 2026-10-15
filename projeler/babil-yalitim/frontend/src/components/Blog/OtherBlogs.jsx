// src/components/Blog/OtherBlogs.jsx
import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import api from "../../api";
import OtherBlogItem from "./OtherBlogItem";
import { useLocale } from "../../i18n/LocaleContext";

const OtherBlogs = ({ currentId, limit = 6 }) => {
  const { locale } = useLocale();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const { data } = await api.get("/blogs", {
          params: { locale },
        });
        const arr = Array.isArray(data) ? data : [];
        const filtered = arr
          .filter((b) => b?._id !== currentId)
          .slice(0, limit);
        if (!cancelled) setList(filtered);
      } catch (e) {
        console.error("GET /blogs (other) error:", e?.response?.data || e);
        if (!cancelled) setList([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentId, limit, locale]);

  return (
    <div className="rounded-3xl bg-white/80 backdrop-blur-xl border border-white/40 shadow-md p-5">
      <h3 className="text-base font-semibold text-secondaryColor mb-4">
        {locale === "en" ? "Other Posts" : "Diğer Yazılar"}
      </h3>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="w-20 h-16 rounded bg-gray-200 animate-pulse" />
              <div className="flex-1 py-1.5">
                <div className="h-3 w-3/4 rounded bg-gray-200 animate-pulse mb-1.5" />
                <div className="h-3 w-1/2 rounded bg-gray-200 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : list.length === 0 ? (
        <p className="text-sm text-gray-500">
          {locale === "en" ? "No other posts yet." : "Henüz başka yazı yok."}
        </p>
      ) : (
        <div className="space-y-3">
          {list.map((b) => (
            <OtherBlogItem key={b._id} blog={b} />
          ))}
        </div>
      )}
    </div>
  );
};

OtherBlogs.propTypes = {
  currentId: PropTypes.string.isRequired,
  limit: PropTypes.number,
};

export default OtherBlogs;
