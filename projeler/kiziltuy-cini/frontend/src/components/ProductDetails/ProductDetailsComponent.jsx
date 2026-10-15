import { useEffect, useState } from "react";
import ProductDetails from "./ProductDetails";
import { useParams } from "react-router-dom";
import { Spin } from "antd";
import "./ProductDetailsComponent.css"; 

const ProductDetailsComponent = () => {
  const [singleProduct, setSingleProduct] = useState(null);
  const { id: productId } = useParams();
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    const fetchSingleProduct = async () => {
      try {
        const response = await fetch(`${apiUrl}/api/products/${productId}`);
        if (!response.ok) throw new Error("Verileri getirme hatası");

        const data = await response.json();
        setSingleProduct(data);
      } catch (error) {
        console.log("Veri hatası:", error);
      }
    };
    fetchSingleProduct();
  }, [apiUrl, productId]);

  return (
    <div className="product-details-page">
      {singleProduct ? (
        <ProductDetails
          singleProduct={singleProduct}
          setSingleProduct={setSingleProduct}
        />
      ) : (
        <div className="loading-wrapper">
          <Spin size="large" tip="Yükleniyor..." />
        </div>
      )}
    </div>
  );
};

export default ProductDetailsComponent;
