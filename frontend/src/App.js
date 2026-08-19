import { API_URL, API_BASE, WS_URL } from './config/api';
import React, { useEffect, Suspense } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { Toaster } from "sonner";
import axios from "axios";

// Import lucide-react icons for loading states
import { RefreshCw } from "lucide-react";

// Configure axios for mobile compatibility
axios.defaults.timeout = 30000; // 30 second timeout for mobile
axios.defaults.headers.common['Content-Type'] = 'application/json';

// Add retry logic for failed requests (especially for mobile)
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Retry on network errors or timeouts (max 2 retries)
    if ((error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK') && !originalRequest._retry) {
      originalRequest._retry = true;
      originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
      
      if (originalRequest._retryCount <= 2) {
        console.log(`Retrying request (${originalRequest._retryCount}/2):`, originalRequest.url);
        await new Promise(resolve => setTimeout(resolve, 1000 * originalRequest._retryCount));
        return axios(originalRequest);
      }
    }
    
    return Promise.reject(error);
  }
);

// Context
import { AuthProvider, useAuth } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { FavoritesProvider } from "./context/FavoritesContext";
import { LanguageProvider } from "./context/LanguageContext";
import { ChatProvider } from "./components/FloatingChat";

// Layout
import Navbar from "./components/Navbar";
import MegaMenu from "./components/MegaMenu";
import Footer from "./components/Footer";
import FloatingChat from "./components/FloatingChat";
import MobileBottomNav from "./components/MobileBottomNav";

// Public Pages
import HomePage from "./pages/HomePage";
import CategoriesPage from "./pages/CategoriesPage";
import CategoryPage from "./pages/CategoryPage";
import ProductPage from "./pages/ProductPage";
import ProductsPage from "./pages/ProductsPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import OrderTrackingPage from "./pages/OrderTrackingPage";
import SearchPage from "./pages/SearchPage";
import FavoritesPage from "./pages/FavoritesPage";
import SubscriptionsPage from "./pages/SubscriptionsPage";
import OrdersPage from "./pages/OrdersPage";
import OrderDetailPage from "./pages/OrderDetailPage";
import AuthPage from "./pages/AuthPage";
import CustomerChatPage from "./pages/CustomerChatPage";
import OfferPage from "./pages/OfferPage";
import BecomeVendorPage from "./pages/BecomeVendorPage";
import MyOffersPage from "./pages/MyOffersPage";
import NegotiatedOfferPage from "./pages/NegotiatedOfferPage";

// Lazy load heavy components for code splitting
const WalletPage = React.lazy(() => import("./pages/WalletPage"));

// Vendor Pages
import VendorDashboard from "./pages/VendorDashboard";
import VendorProducts from "./pages/VendorProducts";
import VendorAddProduct from "./pages/VendorAddProduct";
import VendorSubscription from "./pages/VendorSubscription";

// Admin Pages
import AdminDashboard from "./pages/AdminDashboard";

// Driver Pages
import DriverRegisterPage from "./pages/DriverRegisterPage";
import DriverDashboard from "./pages/DriverDashboard";

// Revendeur Pages
import RevendeurRegisterPage from "./pages/RevendeurRegisterPage";
import RevendeurDashboard from "./pages/RevendeurDashboard";
import RevendeurShopPage from "./pages/RevendeurShopPage";
import RevendeurEditProduct from "./pages/RevendeurEditProduct";
import RevendeurProductPage from "./pages/RevendeurProductPage";

// Enterprise Pages
import EnterpriseRegisterPage from "./pages/EnterpriseRegisterPage";
import EnterpriseDashboard from "./pages/EnterpriseDashboard";
import EnterpriseProfilePage from "./pages/EnterpriseProfilePage";
import EnterpriseShopPage from "./pages/EnterpriseShopPage";
import EnterprisesPage from "./pages/EnterprisesPage";
import EnterpriseProductPage from "./pages/EnterpriseProductPage";

// Shop Pages
import VendorShopPage from "./pages/VendorShopPage";

// Settings
import ProfileSettingsPage from "./pages/ProfileSettingsPage";

// Forum
import ForumPage from "./pages/ForumPage";

// Redirect component for order detail to tracking
const OrderDetailRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/suivi/${id}`} replace />;
};

const API = API_URL;

// Protected Route Component
const ProtectedRoute = ({ children, requireVendor = false, requireAdmin = false, requireDriver = false, requireDropshipper = false, requireEnterprise = false }) => {
  const { user, loading, isVendor, isAdmin, isDriver, isDropshipper, isEnterprise, userRole } = useAuth();

  console.log('DEBUG ProtectedRoute:', { 
    user, 
    loading, 
    isVendor, 
    isAdmin, 
    isDriver, 
    isDropshipper, 
    isEnterprise, 
    userRole,
    requireVendor, 
    requireAdmin, 
    requireDriver, 
    requireDropshipper, 
    requireEnterprise 
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    console.log('DEBUG: No user, redirecting to /connexion');
    return <Navigate to="/connexion" replace />;
  }

  if (requireAdmin && !isAdmin) {
    console.log('DEBUG: requireAdmin failed, redirecting to /');
    return <Navigate to="/" replace />;
  }

  if (requireVendor && !isVendor) {
    console.log('DEBUG: requireVendor failed, redirecting to /');
    return <Navigate to="/" replace />;
  }

  if (requireDriver && !isDriver) {
    console.log('DEBUG: requireDriver failed, redirecting to /');
    return <Navigate to="/" replace />;
  }

  if (requireDropshipper && !isDropshipper) {
    console.log('DEBUG: requireDropshipper failed, redirecting to /');
    return <Navigate to="/" replace />;
  }

  if (requireEnterprise && !isEnterprise) {
    console.log('DEBUG: requireEnterprise failed, redirecting to /');
    return <Navigate to="/" replace />;
  }

  console.log('DEBUG: All checks passed, rendering children');
  return children;
};

// Forum Protected Route - Only vendors and enterprises can access
const ForumProtectedRoute = ({ children }) => {
  const { user, loading, isVendor, isEnterprise, userRole } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    console.log('DEBUG: No user, redirecting to /connexion');
    return <Navigate to="/connexion" replace />;
  }

  // Block access for customers, dropshippers, and drivers
  if (userRole === 'customer' || userRole === 'dropshipper' || userRole === 'driver') {
    console.log('DEBUG: Forum access blocked for role:', userRole);
    return <Navigate to="/" replace />;
  }

  // Only allow vendors and enterprises
  if (!isVendor && !isEnterprise) {
    console.log('DEBUG: Forum access blocked - not vendor or enterprise');
    return <Navigate to="/" replace />;
  }

  console.log('DEBUG: Forum access granted for role:', userRole);
  return children;
};

// Public Layout (with Navbar/Footer)
const PublicLayout = ({ children }) => (
  <div className="min-h-screen flex flex-col">
    <Navbar />
    <MegaMenu />
    <main className="flex-1 pb-mobile-nav">{children}</main>
    <Footer />
  </div>
);

// Dashboard Layout (no Navbar/Footer - for dashboards with their own sidebar)
const StandaloneDashboardLayout = ({ children }) => (
  <div className="min-h-screen pb-mobile-nav">
    {children}
  </div>
);

// Dashboard Layout with Navbar (for legacy dashboards)
const DashboardLayout = ({ children }) => (
  <div className="min-h-screen flex flex-col">
    <Navbar />
    <main className="flex-1 pb-mobile-nav">{children}</main>
  </div>
);

// App Routes Component
const AppRoutes = () => {
  // Categories are managed manually by admin (no auto-seed).


  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<PublicLayout><HomePage /></PublicLayout>} />
      <Route path="/categories" element={<PublicLayout><CategoriesPage /></PublicLayout>} />
      <Route path="/categories/:slug" element={<PublicLayout><CategoryPage /></PublicLayout>} />
      <Route path="/produit/:id" element={<PublicLayout><ProductPage /></PublicLayout>} />
      <Route path="/entreprise/produit/:id" element={<PublicLayout><EnterpriseProductPage /></PublicLayout>} />
      <Route path="/produits" element={<PublicLayout><ProductsPage /></PublicLayout>} />
      <Route path="/panier" element={<PublicLayout><CartPage /></PublicLayout>} />
      <Route path="/checkout" element={<PublicLayout><CheckoutPage /></PublicLayout>} />
      <Route path="/suivi/:orderId" element={<PublicLayout><OrderTrackingPage /></PublicLayout>} />
      <Route path="/recherche" element={<PublicLayout><SearchPage /></PublicLayout>} />
      <Route path="/favoris" element={<PublicLayout><FavoritesPage /></PublicLayout>} />
      <Route path="/commandes" element={
        <ProtectedRoute>
          <PublicLayout><OrdersPage /></PublicLayout>
        </ProtectedRoute>
      } />
      <Route path="/forum" element={
        <ForumProtectedRoute>
          <PublicLayout><ForumPage /></PublicLayout>
        </ForumProtectedRoute>
      } />
      <Route path="/forum/category/:categoryId" element={
        <ForumProtectedRoute>
          <PublicLayout><ForumPage /></PublicLayout>
        </ForumProtectedRoute>
      } />
      <Route path="/forum/topic/:topicId" element={
        <ForumProtectedRoute>
          <PublicLayout><ForumPage /></PublicLayout>
        </ForumProtectedRoute>
      } />
      <Route path="/commande/:id" element={
        <ProtectedRoute>
          <OrderDetailRedirect />
        </ProtectedRoute>
      } />
      <Route path="/mes-offres" element={
        <ProtectedRoute>
          <PublicLayout><MyOffersPage /></PublicLayout>
        </ProtectedRoute>
      } />
      <Route path="/wallet" element={
        <ProtectedRoute>
          <Suspense fallback={
            <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-white flex items-center justify-center">
              <div className="text-center">
                <RefreshCw className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
                <p className="text-slate-600">Chargement du portefeuille...</p>
              </div>
            </div>
          }>
            <PublicLayout><WalletPage /></PublicLayout>
          </Suspense>
        </ProtectedRoute>
      } />
      <Route path="/offer-link/:token" element={<PublicLayout><NegotiatedOfferPage /></PublicLayout>} />
      <Route path="/abonnements" element={<PublicLayout><SubscriptionsPage /></PublicLayout>} />
      
      {/* Auth */}
      <Route path="/connexion" element={<AuthPage />} />
      <Route path="/devenir-vendeur" element={<PublicLayout><BecomeVendorPage /></PublicLayout>} />

      {/* Vendor Routes */}
      <Route path="/vendeur" element={
        <ProtectedRoute requireVendor>
          <StandaloneDashboardLayout><VendorDashboard /></StandaloneDashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/vendeur/produits" element={
        <ProtectedRoute requireVendor>
          <StandaloneDashboardLayout><VendorProducts /></StandaloneDashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/vendeur/produits/nouveau" element={
        <ProtectedRoute requireVendor>
          <StandaloneDashboardLayout><VendorAddProduct /></StandaloneDashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/vendeur/produits/:id/modifier" element={
        <ProtectedRoute requireVendor>
          <StandaloneDashboardLayout><VendorAddProduct /></StandaloneDashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/vendeur/abonnement" element={
        <ProtectedRoute requireVendor>
          <StandaloneDashboardLayout><VendorSubscription /></StandaloneDashboardLayout>
        </ProtectedRoute>
      } />

      {/* Admin Routes */}
      <Route path="/admin" element={
        <ProtectedRoute requireAdmin>
          <AdminDashboard />
        </ProtectedRoute>
      } />

      {/* Driver Routes */}
      <Route path="/devenir-livreur" element={<DriverRegisterPage />} />
      <Route path="/livreur" element={
        <ProtectedRoute requireDriver>
          <DriverDashboard />
        </ProtectedRoute>
      } />

      {/* Revendeur Routes */}
      <Route path="/devenir-revendeur" element={<RevendeurRegisterPage />} />
      <Route path="/revendeur" element={
        <ProtectedRoute requireDropshipper>
          <RevendeurDashboard />
        </ProtectedRoute>
      } />
      <Route path="/revendeur/produits/:id/modifier" element={
        <ProtectedRoute requireDropshipper>
          <StandaloneDashboardLayout><RevendeurEditProduct /></StandaloneDashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/boutique/:shopSlug" element={<RevendeurShopPage />} />
      <Route path="/revendeur-produit/:productId" element={<PublicLayout><RevendeurProductPage /></PublicLayout>} />

      {/* Enterprise Routes */}
      <Route path="/devenir-entreprise" element={<PublicLayout><EnterpriseRegisterPage /></PublicLayout>} />
      <Route path="/entreprises" element={<PublicLayout><EnterprisesPage /></PublicLayout>} />
      <Route path="/enterprise" element={
        <ProtectedRoute requireEnterprise>
          <StandaloneDashboardLayout><EnterpriseDashboard /></StandaloneDashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/enterprise/profile/:id" element={<PublicLayout><EnterpriseProfilePage /></PublicLayout>} />
      <Route path="/enterprise/shop/:id" element={<PublicLayout><EnterpriseShopPage /></PublicLayout>} />

      {/* Vendor Shop Route (Public) */}
      <Route path="/vendeur-boutique/:sellerId" element={<PublicLayout><VendorShopPage /></PublicLayout>} />

      {/* Customer Chat Route */}
      <Route path="/mes-messages" element={<PublicLayout><CustomerChatPage /></PublicLayout>} />
      <Route path="/offre/:offerToken" element={
        <ProtectedRoute>
          <PublicLayout><OfferPage /></PublicLayout>
        </ProtectedRoute>
      } />

      {/* Profile Settings Route */}
      <Route path="/parametres" element={
        <ProtectedRoute>
          <PublicLayout><ProfileSettingsPage /></PublicLayout>
        </ProtectedRoute>
      } />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <CartProvider>
          <FavoritesProvider>
            <BrowserRouter>
              <ChatProvider>
                <AppRoutes />
                <MobileBottomNav />
                <FloatingChat />
                <Toaster
                  position="bottom-right"
                  richColors
                  closeButton
                  toastOptions={{
                    style: {
                      fontFamily: 'Work Sans, sans-serif',
                    },
                  }}
                />
              </ChatProvider>
            </BrowserRouter>
          </FavoritesProvider>
        </CartProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}

export default App;
