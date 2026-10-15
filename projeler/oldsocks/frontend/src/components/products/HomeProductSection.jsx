import { useMemo, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import "swiper/css";
import useHomeProducts from "../../hooks/useHomeProducts";
import { useStorefrontSettings } from "../../context/storefrontSettings";
import { pickHomeProducts } from "../../utils/homeProductSelection";
import { buildVariantColorMap, getVariantColors } from "../../utils/productVariants";
import NewProductItem from "./NewProductItem";
import ProductGridItem from "./ProductGridItem";

export default function HomeProductSection({ sectionKey }) {
  const { data, loading } = useHomeProducts();
  const settings = useStorefrontSettings();
  const section = settings.sections?.[sectionKey];
  const [randomValues] = useState(() => Array.from({ length: 256 }, () => Math.random()));
  const random = useMemo(() => {
    let index = 0;
    return () => randomValues[index++ % randomValues.length];
  }, [randomValues]);
  const products = useMemo(
    () => pickHomeProducts(data?.sections?.[sectionKey], section, random),
    [data, sectionKey, section, random]
  );
  const variantColorMap = useMemo(() => buildVariantColorMap(data?.variants || []), [data]);
  const [swiper, setSwiper] = useState(null);
  const [edges, setEdges] = useState({ start: true, end: false, locked: false });
  const syncEdges = (s) => setEdges({ start: s.isBeginning, end: s.isEnd, locked: s.isLocked });

  if (loading) {
    return <section className="bg-light1 py-12 text-center">Ürünler yükleniyor…</section>;
  }
  if (!products.length) return null;
  const Card = sectionKey === "new" ? NewProductItem : ProductGridItem;
  const arrow = "absolute top-[38%] z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white text-dark1 shadow-lg ring-1 ring-black/5 transition hover:bg-dark1 hover:text-white disabled:pointer-events-none disabled:opacity-0 lg:flex";

  // Yana kaydırılan şerit: telefonda 1,6 kart görünür (yarım kart kaydırılabildiğini belli eder),
  // masaüstünde 4 kart ve oklar.
  return <section className="bg-light1 py-8 sm:py-12">
    <div className="container mx-auto px-4">
      <h2 className="mb-5 text-center text-2xl uppercase text-black sm:mb-8 sm:text-3xl md:text-4xl">{section.heading}</h2>
      {/* Telefonda şerit ekran kenarına kadar uzanır; ilk kart sayfa hizasında başlar. */}
      <div className="relative -mx-4 sm:mx-0">
        {!edges.locked && <>
          <button type="button" aria-label="Önceki ürünler" onClick={() => swiper?.slidePrev()} disabled={edges.start} className={`${arrow} -left-5`}><FaChevronLeft /></button>
          <button type="button" aria-label="Sonraki ürünler" onClick={() => swiper?.slideNext()} disabled={edges.end} className={`${arrow} -right-5`}><FaChevronRight /></button>
        </>}
        <Swiper
          className="home-rail"
          slidesPerView={1.6}
          spaceBetween={12}
          slidesOffsetBefore={16}
          slidesOffsetAfter={16}
          breakpoints={{
            640: { slidesPerView: 2.5, spaceBetween: 16, slidesOffsetBefore: 0, slidesOffsetAfter: 0 },
            1024: { slidesPerView: 4, spaceBetween: 24, slidesOffsetBefore: 0, slidesOffsetAfter: 0 },
          }}
          grabCursor
          onSwiper={(s) => { setSwiper(s); syncEdges(s); }}
          onSlideChange={syncEdges}
          onResize={syncEdges}
          onReachEnd={syncEdges}
          onReachBeginning={syncEdges}
        >
        {products.map((product) => {
          const final = Number(product.price || 0);
          const original = Number(product.originalPrice || 0);
          const hasDiscount = original > final && final > 0;
          return <SwiperSlide key={product._id}><Card
            id={product._id}
            video={product.video}
            poster={product.media?.images?.[0] || product.poster || product.images?.[0] || null}
            name={product.name}
            price={hasDiscount ? original : final}
            discountedPrice={hasDiscount ? final : null}
            discountRate={hasDiscount ? Math.round(100 - final / original * 100) : 0}
            stock={Array.isArray(product.sizes) ? product.sizes.reduce((sum, row) => sum + Number(row.stock || 0), 0) : 0}
            variantColors={getVariantColors(product, variantColorMap)}
          /></SwiperSlide>;
        })}
        </Swiper>
      </div>
    </div>
  </section>;
}
