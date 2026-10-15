import { useContext } from "react";
import { Link } from "react-router-dom";
import "./Cart.css";
import CartCoupon from "./CartCoupon";
import CartTable from "./CartTable";
import CartTotals from "./CartTotals";
import CartContext from "../../context/CartContext";

const Cart = () => {
  const { cartItems } = useContext(CartContext);
  const count = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <section className="cart-page">
      <div className="container">
        <header className="cart-header">
          <nav className="crumbs" aria-label="Sayfa konumu">
            <Link to="/">Ana sayfa</Link>
            <span aria-hidden="true">/</span>
            <span className="crumbs-current">Sepetim</span>
          </nav>
          <h1 className="page-title">
            Sepetim {count > 0 && <span>({count} ürün)</span>}
          </h1>
        </header>

        {cartItems.length > 0 ? (
          <div className="cart-page-wrapper">
            <div className="cart-form">
              <CartTable />
              <CartCoupon />
            </div>
            <aside className="cart-collaterals">
              <CartTotals />
            </aside>
          </div>
        ) : (
          <div className="empty-cart">
            <i className="bi bi-bag" aria-hidden="true" />
            <h2>Sepetinizde ürün bulunmuyor</h2>
            <p>Beğendiğiniz ürünleri sepete ekleyerek alışverişe başlayın.</p>
            <Link to="/shop" className="btn btn-primary">
              Alışverişe başla
            </Link>
          </div>
        )}
      </div>
    </section>
  );
};

export default Cart;
