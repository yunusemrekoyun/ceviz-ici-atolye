import React from "react";
import Cart from "../components/cart/Cart";
import usePageMeta from "../hooks/usePageMeta";

const CartPage = () => {
  usePageMeta({ title: "Sepetim", noindex: true });
  return <Cart />;
};

export default CartPage;
