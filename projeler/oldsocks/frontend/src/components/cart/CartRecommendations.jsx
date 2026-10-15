import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import publicApi from "../../../publicApi";
import { useCart } from "../../context/useCart";
import { useStorefrontSettings } from "../../context/storefrontSettings";
import useProductsCache from "../../hooks/useProductsCache";
import { selectCartRecommendations } from "../../utils/cartRecommendations";
import { formatTry } from "../../utils/currency";
import { getResponsiveImageProps } from "../../utils/media";

function RecommendationCard({ product, onAdded, stacked = false }) {
  const { addToCart, items } = useCart();
  const [size, setSize] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const sizes = Array.isArray(product.sizes) ? product.sizes : [];
  const withoutSize = sizes.length === 1 && !String(sizes[0]?.size || "").trim();
  const image = getResponsiveImageProps(product.media?.images?.[0] || product.images?.[0], {
    widths: [240, 360, 480], defaultWidth: 360,
    sizes: "(max-width: 640px) 40vw, (max-width: 1024px) 25vw, 15vw",
  });

  const add = async () => {
    if (!withoutSize && !size) return;
    setAdding(true);
    setError("");
    try {
      const { data: fresh } = await publicApi.get(`/products/${product._id}`);
      const freshRows = Array.isArray(fresh?.sizes) ? fresh.sizes : [];
      const freshWithoutSize = freshRows.length === 1 && !String(freshRows[0]?.size || "").trim();
      const chosenSize = freshWithoutSize ? "" : size;
      const row = freshRows.find((entry) => String(entry.size || "") === chosenSize);
      const stock = Number(row?.stock || 0);
      const inCart = items.find((item) => String(item.id) === String(product._id) && String(item.size || "") === chosenSize);
      if (!row || stock <= Number(inCart?.qty || 0)) {
        setError("Seçilen bedenin stoğu güncellendi. Ürünü yeniden inceleyin.");
        return;
      }
      addToCart({
        id: String(fresh._id),
        name: fresh.name,
        image: fresh.images?.[0] || image.src,
        price: Number(fresh.price),
        size: chosenSize,
        color: fresh.color || "",
        qty: 1,
      });
      onAdded(fresh.name);
    } catch {
      setError("Ürün şu an eklenemedi. Lütfen yeniden deneyin.");
    } finally {
      setAdding(false);
    }
  };

  // stacked: telefonda yana kaydırılan şeritte, görsel üstte dar kart.
  return <article className={stacked
    ? "flex h-full min-w-0 flex-col gap-2 rounded-xl border border-light2 bg-white p-2.5"
    : "flex min-w-0 gap-3 rounded-xl border border-light2 bg-white p-3 sm:flex-col sm:gap-4 sm:p-4"}>
    <Link to={`/product-details/${product._id}`} className={stacked
      ? "block aspect-[3/4] w-full overflow-hidden rounded-lg bg-light1"
      : "block w-24 shrink-0 overflow-hidden rounded-lg bg-light1 sm:aspect-[3/4] sm:w-full"} aria-label={`${product.name} ürününü incele`}>
      {image.src ? <img src={image.src} srcSet={image.srcSet} sizes={image.sizes} alt={product.name} loading="lazy" className="h-full w-full object-cover" />
        : <span className="flex h-28 items-center justify-center text-xs text-dark2">Görsel yok</span>}
    </Link>
    <div className="flex min-w-0 flex-1 flex-col">
      <Link to={`/product-details/${product._id}`} className="line-clamp-2 text-sm font-semibold text-dark1 hover:underline">{product.name}</Link>
      {product.color && <p className="mt-1 text-xs text-dark2">{product.color}</p>}
      <p className="mt-1 text-sm font-medium text-dark1">{formatTry(product.price)}</p>
      {!withoutSize && <label className={`${stacked ? "mt-2" : "mt-3"} block text-xs font-medium text-dark2`}>Beden
        <select value={size} onChange={(event) => { setSize(event.target.value); setError(""); }} className="mt-1 w-full rounded-md border border-light2 bg-white px-2 py-2 text-sm text-dark1">
          <option value="">Beden seçin</option>
          {sizes.filter((row) => String(row.size || "").trim()).map((row) => <option key={row.size} value={row.size} disabled={Number(row.stock) <= 0}>{row.size}{Number(row.stock) <= 0 ? " (Tükendi)" : ""}</option>)}
        </select>
      </label>}
      <button type="button" onClick={add} disabled={adding || (!withoutSize && !size)} className="mt-auto rounded-lg bg-dark1 px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-dark2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dark1 disabled:cursor-not-allowed disabled:opacity-50 sm:mt-3">
        {adding ? "Ekleniyor…" : "Sepete ekle"}
      </button>
      {error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}
    </div>
  </article>;
}

// inline: masaüstünde sepet satırlarının altındaki boşlukta, dar sütuna göre dizilir.
// Değilse (telefon/tablet): satırlarla sipariş özeti arasında, yana kaydırılan tek şerit;
// özet ve ödeme düğmesi hemen altından gelir.
export default function CartRecommendations({ inline = false }) {
  const { items } = useCart();
  const settings = useStorefrontSettings().cartRecommendations;
  const { data: products } = useProductsCache();
  const [notice, setNotice] = useState("");
  const recommendations = useMemo(
    () => selectCartRecommendations(products, items, settings?.productIds),
    [products, items, settings?.productIds]
  );

  if (settings?.visible === false || !items.length || !recommendations.length) return null;

  return <section className={inline ? "mt-8" : "mt-6"} aria-label={settings?.heading || "Sepet önerileri"}>
    <div className={`${inline ? "mb-5" : "mb-3"} flex flex-wrap items-end justify-between gap-2`}>
      <div>
        <h2 className={inline ? "text-xl font-semibold text-dark1 sm:text-2xl" : "text-lg font-semibold text-dark1"}>{settings?.heading || "Sepetinize yakışabilecek ürünler"}</h2>
        <p className="mt-1 text-sm text-dark2">{inline ? "İlgili ürünleri buradan hızlıca ekleyebilirsiniz." : "Yana kaydırın, beden seçip hızlıca ekleyin."}</p>
      </div>
      <Link to="/shop" className="text-sm font-medium text-dark1 underline underline-offset-4">Tüm ürünler</Link>
    </div>
    {notice && <p role="status" className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice} sepete eklendi.</p>}
    {inline
      ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {recommendations.map((product) => <RecommendationCard key={product._id} product={product} onAdded={setNotice} />)}
      </div>
      : <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1">
        {recommendations.map((product) => <div key={product._id} className="w-[44%] shrink-0 snap-start sm:w-[30%]">
          <RecommendationCard product={product} onAdded={setNotice} stacked />
        </div>)}
      </div>}
  </section>;
}
