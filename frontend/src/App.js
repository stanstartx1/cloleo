import { API_URL, API_BASE, WS_URL } from './config/api';
import React, { useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import axios from "axios";

// Context
import { AuthProvider, useAuth } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { FavoritesProvider } from "./context/FavoritesContext";
import { ChatProvider } from "./components/FloatingChat";

// Layout
import Navbar from "./components/Navbar";
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

// Enterprise Pages
import EnterpriseRegisterPage from "./pages/EnterpriseRegisterPage";
import EnterpriseDashboard from "./pages/EnterpriseDashboard";
import EnterpriseProfilePage from "./pages/EnterpriseProfilePage";
import EnterprisesPage from "./pages/EnterprisesPage";

// Shop Pages
import VendorShopPage from "./pages/VendorShopPage";

// Settings
import ProfileSettingsPage from "./pages/ProfileSettingsPage";

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

// Public Layout (with Navbar/Footer)
const PublicLayout = ({ children }) => (
  <div className="min-h-screen flex flex-col">
    <Navbar />
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
      <Route path="/commande/:id" element={
        <ProtectedRoute>
          <PublicLayout><OrderDetailPage /></PublicLayout>
        </ProtectedRoute>
      } />
      <Route path="/mes-offres" element={
        <ProtectedRoute>
          <PublicLayout><MyOffersPage /></PublicLayout>
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

      {/* Enterprise Routes */}
      <Route path="/devenir-entreprise" element={<PublicLayout><EnterpriseRegisterPage /></PublicLayout>} />
      <Route path="/entreprises" element={<PublicLayout><EnterprisesPage /></PublicLayout>} />
      <Route path="/entreprise" element={
        <ProtectedRoute requireEnterprise>
          <StandaloneDashboardLayout><EnterpriseDashboard /></StandaloneDashboardLayout>
        </ProtectedRoute>
      } />
      <Route path="/enterprise/profile/:companySlug" element={<PublicLayout><EnterpriseProfilePage /></PublicLayout>} />

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
    </AuthProvider>
  );
}

export default App;

