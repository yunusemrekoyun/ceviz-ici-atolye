// src/App.jsx
import { Suspense, lazy } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import GuestRoute from "./context/GuestRoute.jsx";
import PrivateRoute from "./context/PrivateRoute.jsx";
import AdminLayout from "./admin/components/AdminLayout";
import CookieConsent from "./components/Consent/CookieConsent.jsx";
import AnalyticsTracker from "./components/Analytics/AnalyticsTracker.jsx";
import useConsent from "./hooks/useConsent.js";
import ScrollToTop from "./components/Common/ScrollToTop.jsx";
import ProgressCenter from "./admin/components/ProgressCenter.jsx";
import SeoManager from "./components/SEO/SeoManager.jsx";
import BackgroundVideo from "./components/Background/BackgroundVideo.jsx";
import { LocaleProvider, useLocale } from "./i18n/LocaleContext.jsx";
import {
  localizePath,
  stripLocalePrefix,
} from "./i18n/routing.js";

const HomePage = lazy(() => import("./pages/HomePage.jsx"));
const ProjectsPage = lazy(() => import("./pages/ProjectsPage.jsx"));
const ProjectDetailPage = lazy(() => import("./pages/ProjectDetailPage.jsx"));
const ServicePage = lazy(() => import("./pages/ServicePage.jsx"));
const ServiceDetailsPage = lazy(() => import("./pages/ServiceDetailsPage.jsx"));
const SubServiceDetailsPage = lazy(() => import("./pages/SubServiceDetailsPage.jsx"));
const JournalPage = lazy(() => import("./pages/JournalPage.jsx"));
const JournalDetailPage = lazy(() => import("./pages/JournalDetailPage.jsx"));
const WhyUsPage = lazy(() => import("./pages/WhyUsPage.jsx"));
const AboutPage = lazy(() => import("./pages/AboutPage.jsx"));
const BlogPage = lazy(() => import("./pages/BlogPage.jsx"));
const BlogDetailPage = lazy(() => import("./pages/BlogDetailPage.jsx"));
const ContactPage = lazy(() => import("./pages/ContactPage.jsx"));
const KvkkPage = lazy(() => import("./pages/KVKKPage.jsx"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage.jsx"));
const LoginPage = lazy(() => import("./admin/pages/Login.jsx"));
const DashboardPage = lazy(() => import("./admin/pages/Dashboard.jsx"));
const StoragePage = lazy(() => import("./admin/pages/Storage.jsx"));
const BlogListPage = lazy(() => import("./admin/pages/blog/BlogList.jsx"));
const AddBlogPage = lazy(() => import("./admin/pages/blog/AddBlog.jsx"));
const EditBlogPage = lazy(() => import("./admin/pages/blog/EditBlog.jsx"));
const BlogCommentsPage = lazy(() => import("./admin/pages/blog/BlogComments.jsx"));
const JournalListPage = lazy(() => import("./admin/pages/journal/JournalList.jsx"));
const AddJournalPage = lazy(() => import("./admin/pages/journal/AddJournal.jsx"));
const EditJournalPage = lazy(() => import("./admin/pages/journal/EditJournal.jsx"));
const ProjectListPage = lazy(() => import("./admin/pages/project/ProjectList.jsx"));
const AddProjectPage = lazy(() => import("./admin/pages/project/AddProject.jsx"));
const EditProjectPage = lazy(() => import("./admin/pages/project/EditProject.jsx"));
const ServiceListPage = lazy(() => import("./admin/pages/service/ServiceList.jsx"));
const AddServicePage = lazy(() => import("./admin/pages/service/AddService.jsx"));
const EditServicePage = lazy(() => import("./admin/pages/service/EditService.jsx"));

const PageFallback = () => {
  const { locale } = useLocale();

  return (
    <div className="grid min-h-screen place-items-center bg-white text-slate-500">
      {locale === "en" ? "Loading..." : "Yukleniyor..."}
    </div>
  );
};

const wrapLazy = (Component) => (
  <Suspense fallback={<PageFallback />}>
    <Component />
  </Suspense>
);

const publicRoutes = [
  { path: "/", element: wrapLazy(HomePage) },
  { path: "/projects", element: wrapLazy(ProjectsPage) },
  { path: "/project-detail/:id", element: wrapLazy(ProjectDetailPage) },
  { path: "/services", element: wrapLazy(ServicePage) },
  { path: "/services/:id", element: wrapLazy(ServiceDetailsPage) },
  {
    path: "/services/:serviceId/sub-services/:subServiceId",
    element: wrapLazy(SubServiceDetailsPage),
  },
  { path: "/journal", element: wrapLazy(JournalPage) },
  { path: "/journals/:id", element: wrapLazy(JournalDetailPage) },
  { path: "/whyus", element: wrapLazy(WhyUsPage) },
  { path: "/about", element: wrapLazy(AboutPage) },
  { path: "/blog", element: wrapLazy(BlogPage) },
  { path: "/blog/:id", element: wrapLazy(BlogDetailPage) },
  { path: "/iletisim", element: wrapLazy(ContactPage) },
  { path: "/kvkk", element: wrapLazy(KvkkPage) },
];

const localizedPublicRoutes = publicRoutes.flatMap((route) => [
  route,
  {
    ...route,
    path: localizePath(route.path, "en"),
  },
]);

const adminRoutes = [
  { path: "dashboard", element: wrapLazy(DashboardPage) },
  { path: "storage", element: wrapLazy(StoragePage) },
  { path: "blogs", element: wrapLazy(BlogListPage) },
  { path: "blogs/add", element: wrapLazy(AddBlogPage) },
  { path: "blogs/edit/:id", element: wrapLazy(EditBlogPage) },
  { path: "blogs/:id/comments", element: wrapLazy(BlogCommentsPage) },
  { path: "journals", element: wrapLazy(JournalListPage) },
  { path: "journals/add", element: wrapLazy(AddJournalPage) },
  { path: "journals/edit/:id", element: wrapLazy(EditJournalPage) },
  { path: "projects", element: wrapLazy(ProjectListPage) },
  { path: "projects/add", element: wrapLazy(AddProjectPage) },
  { path: "projects/edit/:id", element: wrapLazy(EditProjectPage) },
  { path: "services", element: wrapLazy(ServiceListPage) },
  { path: "services/add", element: wrapLazy(AddServicePage) },
  { path: "services/edit/:id", element: wrapLazy(EditServicePage) },
];

const HERO_DESKTOP = import.meta.env.VITE_HERO_DESKTOP_VIDEO_URL;
const HERO_MOBILE = import.meta.env.VITE_HERO_MOBILE_IMAGE_URL;
const HERO_MOBILE_VIDEO = import.meta.env.VITE_HERO_MOBILE_VIDEO_URL;
const HERO_POSTER = import.meta.env.VITE_HERO_POSTER_URL;

const AppRoutes = () => {
  const location = useLocation();

  // ❌ ESKİ: api.post("/visits", { path }) useEffect'i KALDIRILDI

  return (
    <AnimatePresence mode="sync">
      <Routes location={location} key={location.pathname}>
        {localizedPublicRoutes.map(({ path, element }) => (
          <Route key={path} path={path} element={element} />
        ))}

        <Route
          path="/admin"
          element={
            <GuestRoute>
              {wrapLazy(LoginPage)}
            </GuestRoute>
          }
        />

        {adminRoutes.map(({ path, element }) => (
          <Route
            key={path}
            path={`/admin/${path}`}
            element={
              <PrivateRoute>
                <AdminLayout>{element}</AdminLayout>
              </PrivateRoute>
            }
          />
        ))}

        <Route path="*" element={wrapLazy(NotFoundPage)} />
      </Routes>
    </AnimatePresence>
  );
};

const AppShell = () => {
  const location = useLocation();
  const showHomeBackground =
    !location.pathname.startsWith("/admin") &&
    stripLocalePrefix(location.pathname) === "/";

  return (
    <>
      {/* Sadece ana sayfada mount ediliyor. Daha önce her sayfada render edilip
          yalnızca opaklığı değiştiriliyordu; video görünmese de indirilmeye
          devam ettiği için her rotada boşuna trafik ve decode yükü oluşuyordu. */}
      {showHomeBackground && (
        <BackgroundVideo
          active
          desktopVideoUrl={HERO_DESKTOP}
          mobileImageUrl={HERO_MOBILE}
          mobileVideoUrl={HERO_MOBILE_VIDEO}
          posterUrl={HERO_POSTER}
        />
      )}
      <AppRoutes />
    </>
  );
};

export default function App() {
  const { consent, accept, decline } = useConsent();
  const showBanner = consent === null; // daha önce seçim yapılmadıysa göster

  return (
    <Router>
      <LocaleProvider>
        <ScrollToTop />
        <ProgressCenter />
        <SeoManager />
        {/* Onay banner'ı */}
        <CookieConsent
          visible={showBanner}
          onAccept={accept}
          onDecline={decline}
        />

        {/* Analytics tracker (admin rotalarını kendi içinde filtreliyor) */}
        <AnalyticsTracker />

        <AppShell />
      </LocaleProvider>
    </Router>
  );
}
