import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import ScrollToTop from "./components/ScrollToTop";

// Public pages
import HomePage from "./pages/HomePage";
import ArticlePage from "./pages/ArticlePage";
import ArticleDetail from "./pages/ArticleDetails";
import DecisionPage from "./pages/DecisionPage";
import DecisionDetail from "./pages/DecisionDetail";
import ServicesPage from "./pages/ServicesPage";

// Admin pages
import AdminLogin from "./admin/AdminLogin";
import AdminHome from "./admin/AdminHome";
import RequireAuth from "./admin/RequireAuth";
import RedirectIfAuthed from "./admin/RedirectIfAuthed";
import AdminArticlesPage from "./admin/pages/AdminArticlesPage";
import AdminDecisionsPage from "./admin/pages/AdminDecisionsPage";

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* Public site */}
        <Route
          path="/"
          element={
            <Layout>
              <HomePage />
            </Layout>
          }
        />

        {/* Çalışma Alanlarımız */}
        <Route
          path="/calisma-alanlarimiz"
          element={
            <Layout>
              <ServicesPage />
            </Layout>
          }
        />

        {/* Makaleler */}
        <Route
          path="/makaleler"
          element={
            <Layout>
              <ArticlePage />
            </Layout>
          }
        />
        <Route
          path="/makaleler/:slug"
          element={
            <Layout>
              <ArticleDetail />
            </Layout>
          }
        />

        {/* Yargıtay Kararları */}
        <Route
          path="/kararlar"
          element={
            <Layout>
              <DecisionPage />
            </Layout>
          }
        />
        <Route
          path="/kararlar/:slug"
          element={
            <Layout>
              <DecisionDetail />
            </Layout>
          }
        />
        <Route
          path="/admin"
          element={
            <RedirectIfAuthed>
              <AdminLogin />
            </RedirectIfAuthed>
          }
        />

        <Route element={<RequireAuth />}>
          <Route path="/admin/home" element={<AdminHome />} />
          <Route path="/admin/articles" element={<AdminArticlesPage />} />
          <Route path="/admin/decisions" element={<AdminDecisionsPage />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
