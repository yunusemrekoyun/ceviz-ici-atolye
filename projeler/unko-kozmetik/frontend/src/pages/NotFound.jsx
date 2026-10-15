// src/pages/NotFound.jsx
import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <section className="not-found container">
      <span className="not-found-code" aria-hidden="true">
        404
      </span>
      <h1 className="page-title">Bu sayfayı bulamadık</h1>
      <p>Aradığınız sayfa taşınmış ya da kaldırılmış olabilir.</p>
      <div className="not-found-actions">
        <Link to="/" className="btn btn-primary">
          Ana sayfaya dön
        </Link>
        <Link to="/shop" className="link-arrow">
          Ürünlere göz atın <i className="bi bi-arrow-right" />
        </Link>
      </div>
    </section>
  );
};

export default NotFound;
