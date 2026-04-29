import React, { useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import axios from "axios";

// Context
import { AuthProvider, useAuth } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { FavoritesProvider } from "./context/FavoritesContext";

// Layout
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

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
import AuthPage from "./pages/AuthPage";
import CustomerChatPage from "./pages/CustomerChatPage";

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

// Dropshipper Pages
import DropshipperRegisterPage from "./pages/DropshipperRegisterPage";
import DropshipperDashboard from "./pages/DropshipperDashboard";
import DropshipperShopPage from "./pages/DropshipperShopPage";

// Shop Pages
import VendorShopPage from "./pages/VendorShopPage";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Protected Route Component
const ProtectedRoute = ({ children, requireVendor = false, requireAdmin = false, requireDriver = false, requireDropshipper = false }) => {
  const { user, loading, isVendor, isAdmin, isDriver, isDropshipper } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/connexion" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (requireVendor && !isVendor) {
    return <Navigate to="/" replace />;
  }

  if (requireDriver && !isDriver) {
    return <Navigate to="/" replace />;
  }

  if (requireDropshipper && !isDropshipper) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Public Layout (with Navbar/Footer)
const PublicLayout = ({ children }) => (
  <div className="min-h-screen flex flex-col">
    <Navbar />
    <main className="flex-1">{children}</main>
    <Footer />
  </div>
);

// Dashboard Layout (no Navbar/Footer - for dashboards with their own sidebar)
const StandaloneDashboardLayout = ({ children }) => (
  <div className="min-h-screen">
    {children}
  </div>
);

// Dashboard Layout with Navbar (for legacy dashboards)
const DashboardLayout = ({ children }) => (
  <div className="min-h-screen flex flex-col">
    <Navbar />
    <main className="flex-1">{children}</main>
  </div>
);

// App Routes Component
const AppRoutes = () => {
  // Seed database on first load (if needed)
  useEffect(() => {
    const seedIfNeeded = async () => {
      try {
        const res = await axios.get(`${API}/categories`);
        if (!res.data || res.data.length === 0) {
          console.log('Seeding database...');
          await axios.post(`${API}/seed`);
          console.log('Database seeded!');
        }
      } catch (error) {
        console.error('Error checking/seeding database:', error);
      }
    };
    seedIfNeeded();
  }, []);

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
      
      {/* Auth */}
      <Route path="/connexion" element={<AuthPage />} />

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

      {/* Dropshipper Routes */}
      <Route path="/devenir-dropshipper" element={<DropshipperRegisterPage />} />
      <Route path="/dropshipper" element={
        <ProtectedRoute requireDropshipper>
          <DropshipperDashboard />
        </ProtectedRoute>
      } />
      <Route path="/boutique/:shopSlug" element={<DropshipperShopPage />} />

      {/* Vendor Shop Route (Public) */}
      <Route path="/vendeur-boutique/:sellerId" element={<PublicLayout><VendorShopPage /></PublicLayout>} />

      {/* Customer Chat Route */}
      <Route path="/mes-messages" element={<PublicLayout><CustomerChatPage /></PublicLayout>} />

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
            <AppRoutes />
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
          </BrowserRouter>
        </FavoritesProvider>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
