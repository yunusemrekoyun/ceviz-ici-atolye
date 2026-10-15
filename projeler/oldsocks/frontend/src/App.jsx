import React, { Suspense, lazy } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Outlet,
  Navigate,
} from "react-router-dom";
import Layout from "./components/layout/Layout";
import RequireAdmin from "./components/auth/RequireAdmin";
import RequireAuth from "./components/auth/RequireAuth";
import ScrollToTop from "./components/common/ScrollToTop";
import RouteErrorBoundary from "./components/common/RouteErrorBoundary";

const AdminLayout = lazy(() => import("./admin/layout/AdminLayout"));
const HomePage = lazy(() => import("./pages/HomePage"));
const ShopPage = lazy(() => import("./pages/ShopPage"));
const CartPage = lazy(() => import("./pages/CartPage"));
const GuestCheckoutPage = lazy(() => import("./pages/GuestCheckoutPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const BlogPage = lazy(() => import("./pages/BlogPage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const BlogDetailsPage = lazy(() => import("./pages/BlogDetailsPage"));
const ProductDetailsPage = lazy(() => import("./pages/ProductDetailsPage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage"));
const PaymentResultPage = lazy(() => import("./pages/PaymentResultPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));
const PaymentPage = lazy(() => import("./pages/PaymentPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const OrderTrackingPage = lazy(() => import("./pages/OrderTrackingPage"));
const AgreementPage = lazy(() => import("./pages/AgreementPage"));
const KvkkPage = lazy(() => import("./pages/KvkkPage"));
const CookiePolicyPage = lazy(() => import("./pages/CookiePolicyPage"));

const CategoriesPage = lazy(() => import("./admin/pages/CategoriesPage"));
const CampaignsPage = lazy(() => import("./admin/pages/CampaignsPage"));
const MiniCampaignsPage = lazy(() => import("./admin/pages/MiniCampaignsPage"));
const BlogsPage = lazy(() => import("./admin/pages/BlogsPage"));
const BlogCategoriesPage = lazy(() => import("./admin/pages/BlogCategoriesPage"));
const CommentsPage = lazy(() => import("./admin/pages/CommentsPage"));
const CommentRepliesPage = lazy(() => import("./admin/pages/CommentRepliesPage"));
const InstagramPostsPage = lazy(() => import("./admin/pages/InstagramPostsPage"));
const OrdersPage = lazy(() => import("./admin/pages/OrdersPage"));
const ProductListPage = lazy(() => import("./admin/pages/ProductListPage"));
const AdminUsersPage = lazy(() => import("./admin/pages/UsersPage"));
const DiscountsPage = lazy(() => import("./admin/pages/DiscountsPage"));
const HeroVideoPage = lazy(() => import("./admin/pages/HeroVideoPage"));
const ShippingMethodsPage = lazy(() => import("./admin/pages/ShippingMethodsPage"));
const AnnouncementBarPage = lazy(() => import("./admin/pages/AnnouncementBarPage"));
const CartCampaignsPage = lazy(() => import("./admin/pages/CartCampaignsPage"));
const CouponsPage = lazy(() => import("./admin/pages/CouponsPage"));
const MediaMaintenancePage = lazy(() => import("./admin/pages/MediaMaintenancePage"));
const BackupsPage = lazy(() => import("./admin/pages/BackupsPage"));
const StorefrontPage = lazy(() => import("./admin/pages/StorefrontPage"));
const SiteContentPage = lazy(() => import("./admin/pages/SiteContentPage"));
const LegalDocumentsPage = lazy(() => import("./admin/pages/LegalDocumentsPage"));

// Sayfa parçası inerken alt bilgi ekranın altında kalsın; sayfa gelince
// alt bilgi aşağı itilip yerleşim kaymasın (CLS).
function RouteFallback() {
  return <div className="min-h-screen py-16 text-center">Yükleniyor…</div>;
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route
            element={
              <Layout>
                <RouteErrorBoundary>
                  <Suspense fallback={<RouteFallback />}>
                    <Outlet />
                  </Suspense>
                </RouteErrorBoundary>
              </Layout>
            }
          >
            <Route path="/" element={<HomePage />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/blog" element={<BlogPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/blog/:slug" element={<BlogDetailsPage />} />
            <Route path="/product-details/:id" element={<ProductDetailsPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout-guest" element={<GuestCheckoutPage />} />
            <Route path="/agreement" element={<AgreementPage />} />
            <Route path="/payment" element={<PaymentPage />} />
            <Route path="/kvkk" element={<KvkkPage />} />
            <Route path="/cookies" element={<CookiePolicyPage />} />
            <Route
              path="/checkout"
              element={
                <RequireAuth>
                  <CheckoutPage />
                </RequireAuth>
              }
            />
            <Route path="/payment-result" element={<PaymentResultPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/siparis-takip" element={<OrderTrackingPage />} />
            <Route path="/profile" element={<AuthPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>

          <Route element={<RequireAdmin />}>
            <Route
              path="/admin"
              element={
                <AdminLayout>
                  <RouteErrorBoundary>
                    <Suspense fallback={<RouteFallback />}>
                      <Outlet />
                    </Suspense>
                  </RouteErrorBoundary>
                </AdminLayout>
              }
            >
              <Route index element={<Navigate to="products" replace />} />
              <Route path="products" element={<ProductListPage />} />
              <Route path="discounts" element={<DiscountsPage />} />
              <Route path="cart-campaigns" element={<CartCampaignsPage />} />
              <Route path="coupons" element={<CouponsPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="categories" element={<CategoriesPage />} />
              <Route path="campaigns" element={<CampaignsPage />} />
              <Route path="minicampaigns" element={<MiniCampaignsPage />} />
              <Route path="blogs" element={<BlogsPage />} />
              <Route path="blog-categories" element={<BlogCategoriesPage />} />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="comments" element={<CommentsPage />} />
              <Route path="replies" element={<CommentRepliesPage />} />
              <Route path="instagram-posts" element={<InstagramPostsPage />} />
              <Route path="hero-videos" element={<HeroVideoPage />} />
              <Route path="storefront" element={<StorefrontPage />} />
              <Route path="site-content" element={<SiteContentPage />} />
              <Route path="legal" element={<LegalDocumentsPage />} />
              <Route path="shipping" element={<ShippingMethodsPage />} />
              <Route path="announcement-bar" element={<AnnouncementBarPage />} />
              <Route path="media-maintenance" element={<MediaMaintenancePage />} />
              <Route path="backups" element={<BackupsPage />} />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
