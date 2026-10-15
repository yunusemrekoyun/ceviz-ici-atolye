/********************************************************
 * frontend/src/App.jsx
 ********************************************************/
import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { Spin } from "antd";
import HomePage from "./pages/HomePage";
import ShopPage from "./pages/ShopPage";
import ContactPage from "./pages/ContactPage";
import CartPage from "./pages/CartPage";
import AuthPage from "./pages/AuthPage";
import ProductDetailsPage from "./pages/ProductDetailsPage";
import BlogDetailsPage from "./pages/BlogDetailsPage";
import Success from "./pages/Success";
import UserAccountPage from "./pages/UserAccountPage";
import NotFound from "./pages/NotFound";
import PolicyPage from "./pages/PolicyPage";
import MainLayout from "./layouts/MainLayout";
import ProtectedAdminRoute from "./routes/ProtectedAdminRoute";
import "./App.css";

// Admin paneli (grafik kütüphanesi dahil) sadece admin girdiğinde yüklenir
const AdminLayout = lazy(() => import("./layouts/AdminLayout"));
const DashboardPage = lazy(() => import("./pages/Admin/DashboardPage"));
const UserPage = lazy(() => import("./pages/Admin/UserPage"));
const CategoryPage = lazy(() =>
  import("./pages/Admin/Categories/CategoryPage")
);
const UpdateCategoryPage = lazy(() =>
  import("./pages/Admin/Categories/UpdateCategoryPage")
);
const CreateCategoryPage = lazy(() =>
  import("./pages/Admin/Categories/CreateCategoryPage")
);
const ProductPage = lazy(() => import("./pages/Admin/Products/ProductPage"));
const CreateProductPage = lazy(() =>
  import("./pages/Admin/Products/CreateProductPage")
);
const UpdateProductPage = lazy(() =>
  import("./pages/Admin/Products/UpdateProductPage")
);
const DiscountPage = lazy(() => import("./pages/Admin/Products/DiscountPage"));
const CouponPage = lazy(() => import("./pages/Admin/Coupons/CouponPage"));
const CreateCouponPage = lazy(() =>
  import("./pages/Admin/Coupons/CreateCouponPage")
);
const UpdateCouponPage = lazy(() =>
  import("./pages/Admin/Coupons/UpdateCouponPage")
);
const OrderPage = lazy(() => import("./pages/Admin/Orders/OrderPage"));
const CommentsPage = lazy(() => import("./pages/Admin/CommentsPage"));

const PageLoader = () => (
  <div
    style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "60vh",
    }}
  >
    <Spin size="large" />
  </div>
);

function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/shop" element={<ShopPage />} />
        <Route path="/blog" element={<BlogDetailsPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/product/:id" element={<ProductDetailsPage />} />
        <Route path="/success" element={<Success />} />
        <Route path="/account" element={<UserAccountPage />} />
        <Route path="/shop/:category" element={<ShopPage />} />
        <Route path="/policy" element={<PolicyPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      <Route
        path="/admin/*"
        element={
          <ProtectedAdminRoute>
            <Suspense fallback={<PageLoader />}>
              <AdminLayout />
            </Suspense>
          </ProtectedAdminRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="users" element={<UserPage />} />
        <Route path="categories" element={<CategoryPage />} />
        <Route path="categories/create" element={<CreateCategoryPage />} />
        <Route path="categories/update/:id" element={<UpdateCategoryPage />} />
        <Route path="products" element={<ProductPage />} />
        <Route path="products/create" element={<CreateProductPage />} />
        <Route path="products/update/:id" element={<UpdateProductPage />} />
        <Route path="products/discounts" element={<DiscountPage />} />
        <Route path="coupons" element={<CouponPage />} />
        <Route path="coupons/create" element={<CreateCouponPage />} />
        <Route path="coupons/update/:id" element={<UpdateCouponPage />} />
        <Route path="orders" element={<OrderPage />} />
        <Route path="comments" element={<CommentsPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default App;
