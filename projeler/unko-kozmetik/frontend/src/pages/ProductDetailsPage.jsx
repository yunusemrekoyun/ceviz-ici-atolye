import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button, Result, Spin } from "antd";
import ProductDetails from "../components/ProductDetails/ProductDetails";

const ProductDetailsPage = () => {
  const [singleProduct, setSingleProduct] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const { id: productId } = useParams();
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    const controller = new AbortController();
    setSingleProduct(null);
    setNotFound(false);

    fetch(`${apiUrl}/api/products/${productId}`, { signal: controller.signal })
      .then((response) => {
        if (response.status === 404 || response.status === 400) {
          setNotFound(true);
          return null;
        }
        if (!response.ok) throw new Error("Verileri getirme hatası");
        return response.json();
      })
      .then((data) => data && setSingleProduct(data))
      .catch((error) => {
        if (error.name !== "AbortError") {
          console.error("Veri hatası:", error);
          setNotFound(true);
        }
      });

    return () => controller.abort();
  }, [apiUrl, productId]);

  if (notFound) {
    return (
      <Result
        status="404"
        title="Ürün bulunamadı"
        subTitle="Aradığınız ürün satıştan kaldırılmış olabilir."
        extra={
          <Link to="/shop">
            <Button type="primary">Mağazaya Dön</Button>
          </Link>
        }
      />
    );
  }

  if (!singleProduct) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          padding: "100px 0",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  return (
    <ProductDetails
      singleProduct={singleProduct}
      setSingleProduct={setSingleProduct}
    />
  );
};

export default ProductDetailsPage;
