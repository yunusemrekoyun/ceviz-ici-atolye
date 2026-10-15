import { useMemo } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Result, Spin } from "antd";
import CategoryHeader from "../components/Layout/Headers/CategoryHeader";
import ProductFilter from "../components/Products/ProductFilter";
import ProductList from "../components/Products/ProductList";
import useCategories from "../hooks/useCategories";
import { slugify } from "../utils/slugify";
import "./ShopPage.css";

const ShopPage = () => {
  const { category: categorySlug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { categories, isLoading } = useCategories();

  const onlyDiscounted = searchParams.get("discounted") === "true";
  const groupParam = searchParams.get("group") || "";
  const sort = searchParams.get("sort") || "";
  const brandParam = searchParams.get("brand") || "";

  // Filtre durumu URL'de tutulur: /shop/sampuan?brand=olaplex,tigi&sort=priceAsc
  const selectedBrands = useMemo(
    () => [
      ...new Set(
        brandParam
          .split(",")
          .map((b) => b.trim().toLowerCase())
          .filter(Boolean)
      ),
    ],
    [brandParam]
  );

  const category = categorySlug
    ? categories.find((c) => slugify(c.name) === categorySlug) || null
    : null;
  const categoryNotFound = Boolean(categorySlug) && !isLoading && !category;
  const group = category ? category.group || "" : groupParam;

  // Başlık altındaki çipler: grup seçiliyse o grubun kategorileri
  const chipCategories = group
    ? categories.filter((c) => c.group === group)
    : categories;
  // Marka listesi: kategori > grup > tüm kategoriler
  const filterCategories = category
    ? [category]
    : groupParam
    ? chipCategories
    : categories;

  const updateParams = (changes) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(changes).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    setSearchParams(params);
  };

  const title = category
    ? category.name
    : groupParam
    ? groupParam
    : onlyDiscounted
    ? "İndirimdeki ürünler"
    : "Tüm ürünler";

  if (isLoading) {
    return (
      <div className="shop-loading">
        <Spin size="large" />
      </div>
    );
  }

  if (categoryNotFound) {
    return (
      <Result
        className="result-page"
        status="404"
        title="Kategori bulunamadı"
        subTitle="Aradığınız kategori kaldırılmış veya adı değişmiş olabilir."
        extra={
          <Link to="/shop" className="btn btn-primary">
            Tüm ürünler
          </Link>
        }
      />
    );
  }

  return (
    <section className="shop-page">
      <div className="container">
        <header className="shop-header">
          <nav className="crumbs" aria-label="Sayfa konumu">
            <Link to="/">Ana sayfa</Link>
            <span aria-hidden="true">/</span>
            <Link to="/shop">Mağaza</Link>
            {group && (
              <>
                <span aria-hidden="true">/</span>
                <Link to={`/shop?group=${encodeURIComponent(group)}`}>
                  {group}
                </Link>
              </>
            )}
          </nav>
          <h1 className="page-title">{title}</h1>
        </header>

        <CategoryHeader
          categories={chipCategories}
          allLink={group ? `/shop?group=${encodeURIComponent(group)}` : "/shop"}
          allLabel={group ? `Tüm ${group}` : "Tümü"}
          isAllActive={
            !category && (group ? groupParam === group : !groupParam)
          }
        />

        <div className="shop-layout">
          <ProductFilter
            categories={filterCategories}
            selectedBrands={selectedBrands}
            setSelectedBrands={(brands) =>
              updateParams({ brand: brands.join(",") })
            }
            onlyDiscounted={onlyDiscounted}
            setOnlyDiscounted={(value) =>
              updateParams({ discounted: value ? "true" : "" })
            }
            onClear={() => updateParams({ brand: "", discounted: "" })}
          />
          <ProductList
            categoryName={category?.name || ""}
            groupName={category ? "" : groupParam}
            selectedBrands={selectedBrands}
            onlyDiscounted={onlyDiscounted}
            sort={sort}
            setSort={(value) => updateParams({ sort: value })}
          />
        </div>
      </div>
    </section>
  );
};

export default ShopPage;
