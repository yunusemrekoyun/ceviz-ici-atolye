import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import HeroImage from "./HeroImage";
import DescriptionBlocks from "./DescriptionBlocks";
import PurchaseAndReviews from "./PurchaseAndReviews";
import ProductMainDescriptions from "./ProductMainDescriptions";
import useVisitTracker from "../../hooks/useVisitTracker";
import "./ProductShowroom.css";

const ProductShowroom = () => {
  const { id: productId } = useParams();
  const [product, setProduct] = useState(null);
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  // ✅ Sadece product verisi geldiyse çağrılır
  useVisitTracker("product", product?._id && product._id);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/products/${productId}`);
        if (!res.ok) throw new Error("Ürün bulunamadı");
        const data = await res.json();
        setProduct(data);
      } catch (err) {
        console.error("Ürün getirme hatası:", err);
      }
    };

    if (productId) fetchProduct();
  }, [productId, apiUrl]);

  if (!product) return <div className="loading">Ürün yükleniyor...</div>;

  return (
    <>
      <HeroImage product={product} />
      <ProductMainDescriptions product={product} />
      <DescriptionBlocks product={product} />
      <PurchaseAndReviews product={product} />
    </>
  );
};

export default ProductShowroom;
