import React, { useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import axios from "axios";

// Context
import { CartProvider } from "./context/CartContext";
import { FavoritesProvider } from "./context/FavoritesContext";

// Layout
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

// Pages
import HomePage from "./pages/HomePage";
import CategoriesPage from "./pages/CategoriesPage";
import CategoryPage from "./pages/CategoryPage";
import ProductPage from "./pages/ProductPage";
import ProductsPage from "./pages/ProductsPage";
import CartPage from "./pages/CartPage";
import SearchPage from "./pages/SearchPage";
import FavoritesPage from "./pages/FavoritesPage";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Layout wrapper
const Layout = ({ children }) => (
  <div className="min-h-screen flex flex-col">
    <Navbar />
    <main className="flex-1">{children}</main>
    <Footer />
  </div>
);

function App() {
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
    <CartProvider>
      <FavoritesProvider>
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/categories" element={<CategoriesPage />} />
              <Route path="/categories/:slug" element={<CategoryPage />} />
              <Route path="/produit/:id" element={<ProductPage />} />
              <Route path="/produits" element={<ProductsPage />} />
              <Route path="/panier" element={<CartPage />} />
              <Route path="/recherche" element={<SearchPage />} />
              <Route path="/favoris" element={<FavoritesPage />} />
              {/* Fallback */}
              <Route path="*" element={<HomePage />} />
            </Routes>
          </Layout>
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
  );
}

export default App;
