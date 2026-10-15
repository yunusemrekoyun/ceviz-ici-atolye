/********************************************************
 * frontend/src/components/Cart/CartTable.jsx
 ********************************************************/
import { useContext } from "react";
import CartItem from "./CartItem";
import CartContext from "../../context/CartContext";
import { cartItemKey } from "../../utils/cart";

const CartTable = () => {
  const { cartItems } = useContext(CartContext);

  return (
    <ul className="cart-items" aria-label="Sepetteki ürünler">
      {cartItems.map((item) => (
        <CartItem key={cartItemKey(item)} cartItem={item} />
      ))}
    </ul>
  );
};

export default CartTable;
