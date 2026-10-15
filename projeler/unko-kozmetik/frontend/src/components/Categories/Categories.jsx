/********************************************************
 * frontend/src/components/Categories/Categories.jsx
 * Ana sayfa: menü gruplarına göre görselli kutular + kategori çipleri
 ********************************************************/
import { useMemo } from "react";
import { Link } from "react-router-dom";
import CategoryItem from "./CategoryItem";
import useCategories from "../../hooks/useCategories";
import "./Categories.css";

const GROUP_IMAGES = {
  "Saç Bakımı": "/img/site/tile-hair.jpg",
  "Cilt Bakımı": "/img/site/tile-skin.jpg",
  "El ve Ayak Bakımı": "/img/site/tile-hands.jpg",
  Elektronik: "/img/site/tile-tools.jpg",
};
const FALLBACK_IMAGE = "/img/site/tile-hair.jpg";

const Categories = () => {
  const { categories } = useCategories();

  const groups = useMemo(() => {
    const map = new Map();
    [...categories]
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .forEach((cat) => {
        const group = cat.group?.trim();
        if (!group) return;
        if (!map.has(group)) map.set(group, []);
        map.get(group).push(cat);
      });
    return [...map.entries()].slice(0, 4);
  }, [categories]);

  if (categories.length === 0) return null;

  return (
    <section className="section categories">
      <div className="container">
        <div className="section-head">
          <div>
            <span className="eyebrow">Kategoriler</span>
            <h2>İhtiyacınıza göre alışveriş</h2>
          </div>
          <Link to="/shop" className="link-arrow">
            Tüm ürünler <i className="bi bi-arrow-right" />
          </Link>
        </div>

        {groups.length > 0 && (
          <div className="category-tiles">
            {groups.map(([group, cats]) => (
              <Link
                key={group}
                to={`/shop?group=${encodeURIComponent(group)}`}
                className="category-tile"
              >
                <img
                  src={GROUP_IMAGES[group] || FALLBACK_IMAGE}
                  alt=""
                  loading="lazy"
                />
                <div className="category-tile-body">
                  <h3>{group}</h3>
                  <p>
                    {cats
                      .slice(0, 3)
                      .map((c) => c.name)
                      .join(" · ")}
                    {cats.length > 3 ? " ve daha fazlası" : ""}
                  </p>
                </div>
                <span className="category-tile-arrow" aria-hidden="true">
                  <i className="bi bi-arrow-up-right" />
                </span>
              </Link>
            ))}
          </div>
        )}

        <ul className="category-list" aria-label="Tüm kategoriler">
          {categories.map((c) => (
            <CategoryItem key={c._id} category={c} />
          ))}
        </ul>
      </div>
    </section>
  );
};

export default Categories;
