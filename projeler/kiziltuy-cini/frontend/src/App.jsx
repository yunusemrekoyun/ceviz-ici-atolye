import { Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import ShopPage from "./pages/ShopPage";
import BlogPage from "./pages/BlogPage";
import "antd/dist/reset.css";
import ContactPage from "./pages/ContactPage";
// import CartPage from "./pages/CartPage";
//import AuthPage from "./pages/AuthPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import NotFoundPage from "./pages/NotFoundPage";
import VerifyEmail from "./components/Auth/VerifyEmail";
import ProductDetailsPage from "./pages/ProductDetailsPage";
import BlogDetailsPage from "./pages/BlogDetailsPage";
import DashboardPage from "./pages/Admin/DashboardPage";
import CreateBlogPage from "./pages/Admin/Blogs/CreateBlogPage";
import UpdateBlogPage from "./pages/Admin/Blogs/UpdateBlogPage.jsx";
import "./App.css";
import UserPage from "./pages/Admin/UserPage";
import CategoryPage from "./pages/Admin/Categories/CategoryPage";
import UpdateCategoryPage from "./pages/Admin/Categories/UpdateCategoryPage";
import CreateCategoryPage from "./pages/Admin/Categories/CreateCategoryPage";
import CreateProductPage from "./pages/Admin/Products/CreateProductPage";
import ProductPage from "./pages/Admin/Products/ProductPage";
import UpdateProductPage from "./pages/Admin/Products/UpdateProductPage";
import CouponPage from "./pages/Admin/Coupons/CouponPage";
import CreateCouponPage from "./pages/Admin/Coupons/CreateCouponPage";
import UpdateCouponPage from "./pages/Admin/Coupons/UpdateCouponPage";
import PendingReviewsPage from "./pages/Admin/Comments/PendingReviewsPage";
import ApprovedReviewsPage from "./pages/Admin/Comments/ApprovedReviewsPage";
// import Success from "./pages/Success";
import OrderPage from "./pages/Admin/OrderPage";
import CampaignPage from "./pages/Admin/Campaigns/CampaignPage";
import CreateCampaignPage from "./pages/Admin/Campaigns/CreateCampaignPage";
import UpdateCampaignPage from "./pages/Admin/Campaigns/UpdateCampaignPage";
import AdminBlogsPage from "./pages/Admin/Blogs/AdminBlogsPage";
import UserAccountPage from "./pages/UserAccountPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/shop" element={<ShopPage />} />
      <Route path="/blog" element={<BlogPage />} />
      <Route path="/contact" element={<ContactPage />} />
      {/* <Route path="/cart" element={<CartPage />} /> */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/account" element={<UserAccountPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/product/:id" element={<ProductDetailsPage />} />
      <Route path="/blogs/:blogId" element={<BlogDetailsPage />} />
      <Route path="/verify-email/:token" element={<VerifyEmail />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
      {/* <Route path="/success" element={<Success />} /> */}
      <Route path="/admin/*">
        <Route index element={<DashboardPage />} />
        <Route path="blogs" element={<AdminBlogsPage />} />
        <Route path="blogs/create" element={<CreateBlogPage />} />
        <Route path="blogs/update/:blogId" element={<UpdateBlogPage />} />
        <Route path="users" element={<UserPage />} />
        <Route path="categories" element={<CategoryPage />} />
        <Route path="categories/create" element={<CreateCategoryPage />} />
        <Route path="categories/update/:id" element={<UpdateCategoryPage />} />
        <Route path="products" element={<ProductPage />} />
        <Route path="products/create" element={<CreateProductPage />} />
        <Route path="products/update/:id" element={<UpdateProductPage />} />
        <Route path="campaigns" element={<CampaignPage />} />
        <Route path="campaigns/create" element={<CreateCampaignPage />} />
        <Route path="campaigns/update/:id" element={<UpdateCampaignPage />} />
        <Route path="coupons" element={<CouponPage />} />
        <Route path="coupons/create" element={<CreateCouponPage />} />
        <Route path="coupons/update/:id" element={<UpdateCouponPage />} />
        <Route path="orders" element={<OrderPage />} />
        <Route path="reviews/pending" element={<PendingReviewsPage />} />
        <Route path="reviews/approved" element={<ApprovedReviewsPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
