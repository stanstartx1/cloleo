import { API_URL, API_BASE, WS_URL } from '../config/api';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { Loader2 } from 'lucide-react';

const API = API_URL;

/**
 * Hook for infinite scroll with intersection observer
 */
export const useInfiniteScroll = (fetchMore, hasMore, loading) => {
  const observerRef = useRef(null);
  const loadMoreRef = useRef(null);

  useEffect(() => {
    if (loading) return;

    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          fetchMore();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [fetchMore, hasMore, loading]);

  return loadMoreRef;
};

/**
 * Infinite scroll wrapper component
 */
export const InfiniteScrollContainer = ({ 
  children, 
  loadMore, 
  hasMore, 
  loading,
  loader,
  endMessage 
}) => {
  const loadMoreRef = useInfiniteScroll(loadMore, hasMore, loading);

  return (
    <div className="infinite-scroll-container">
      {children}
      
      <div ref={loadMoreRef} className="w-full py-4 flex justify-center">
        {loading && (
          loader || (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Chargement...</span>
            </div>
          )
        )}
        {!hasMore && !loading && endMessage}
      </div>
    </div>
  );
};

/**
 * Hook for fetching products with infinite scroll
 */
export const useInfiniteProducts = (initialParams = {}) => {
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [params, setParams] = useState(initialParams);

  const fetchProducts = useCallback(async (pageNum, reset = false) => {
    if (loading) return;
    
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: pageNum,
        limit: 12,
        ...params
      }).toString();
      
      const response = await axios.get(`${API}/products?${queryParams}`);
      const newProducts = response.data.products || [];
      
      if (reset) {
        setProducts(newProducts);
      } else {
        setProducts(prev => [...prev, ...newProducts]);
      }
      
      setHasMore(newProducts.length === 12 && pageNum < response.data.total_pages);
      setPage(pageNum);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [params, loading]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchProducts(page + 1);
    }
  }, [fetchProducts, page, loading, hasMore]);

  const refresh = useCallback(() => {
    setPage(1);
    setHasMore(true);
    fetchProducts(1, true);
  }, [fetchProducts]);

  const updateParams = useCallback((newParams) => {
    setParams(newParams);
    setPage(1);
    setHasMore(true);
    setProducts([]);
    setInitialLoading(true);
  }, []);

  useEffect(() => {
    fetchProducts(1, true);
  }, []);

  useEffect(() => {
    if (Object.keys(params).length > 0) {
      fetchProducts(1, true);
    }
  }, [params]);

  return {
    products,
    loading,
    initialLoading,
    hasMore,
    loadMore,
    refresh,
    updateParams
  };
};

/**
 * Optimized image component with lazy loading
 */
export const OptimizedImage = ({ 
  src, 
  alt, 
  className = '', 
  placeholderClassName = '',
  sizes = '(max-width: 640px) 150px, (max-width: 1024px) 250px, 300px'
}) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && imgRef.current) {
            imgRef.current.src = src;
            observer.disconnect();
          }
        });
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [src]);

  return (
    <div className={`relative overflow-hidden ${placeholderClassName}`}>
      {!loaded && !error && (
        <div className="absolute inset-0 skeleton-shimmer bg-muted" />
      )}
      <img
        ref={imgRef}
        alt={alt}
        className={`${className} transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        sizes={sizes}
        loading="lazy"
        decoding="async"
      />
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground text-sm">
          Image non disponible
        </div>
      )}
    </div>
  );
};

/**
 * Scroll progress indicator
 */
export const ScrollProgress = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollPercent = (scrollTop / docHeight) * 100;
      setProgress(scrollPercent);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="fixed top-0 left-0 w-full h-1 z-50 bg-muted">
      <div 
        className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-150"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};

/**
 * Pull to refresh component
 */
export const PullToRefresh = ({ onRefresh, children }) => {
  const [pulling, setPulling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const containerRef = useRef(null);

  const handleTouchStart = (e) => {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY;
      setPulling(true);
    }
  };

  const handleTouchMove = (e) => {
    if (!pulling) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;
    
    if (diff > 0 && diff < 150 && containerRef.current) {
      containerRef.current.style.transform = `translateY(${diff * 0.4}px)`;
    }
  };

  const handleTouchEnd = async () => {
    if (!pulling) return;
    
    setPulling(false);
    if (containerRef.current) {
      const transform = containerRef.current.style.transform;
      const translateY = parseFloat(transform.replace('translateY(', '').replace('px)', '')) || 0;
      
      containerRef.current.style.transform = '';
      
      if (translateY > 50) {
        setRefreshing(true);
        await onRefresh();
        setRefreshing(false);
      }
    }
  };

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="transition-transform duration-300"
    >
      {refreshing && (
        <div className="flex justify-center py-4">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}
      {children}
    </div>
  );
};

export default {
  useInfiniteScroll,
  InfiniteScrollContainer,
  useInfiniteProducts,
  OptimizedImage,
  ScrollProgress,
  PullToRefresh
};
