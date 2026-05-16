import { useEffect, useRef, useState } from 'react';

/**
 * Hook for scroll-triggered animations
 * @param {Object} options - Configuration options
 * @param {number} options.threshold - Intersection threshold (0-1)
 * @param {string} options.rootMargin - Root margin for intersection
 * @param {boolean} options.triggerOnce - Only trigger animation once
 * @returns {[React.RefObject, boolean]} - Ref and isVisible state
 */
export const useScrollAnimation = (options = {}) => {
  const {
    threshold = 0.1,
    rootMargin = '0px 0px -50px 0px',
    triggerOnce = true
  } = options;

  const elementRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (triggerOnce) {
            observer.unobserve(element);
          }
        } else if (!triggerOnce) {
          setIsVisible(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [threshold, rootMargin, triggerOnce]);

  return [elementRef, isVisible];
};

/**
 * Hook for staggered animations on multiple children
 * @param {number} itemCount - Number of items to animate
 * @param {number} staggerDelay - Delay between each item (ms)
 * @param {Object} options - Scroll animation options
 * @returns {[React.RefObject, boolean[], number[]]} - Ref, visibility array, and delays
 */
export const useStaggeredAnimation = (itemCount, staggerDelay = 100, options = {}) => {
  const [ref, isVisible] = useScrollAnimation(options);
  const [visibleItems, setVisibleItems] = useState(Array(itemCount).fill(false));

  useEffect(() => {
    if (isVisible) {
      const timeouts = [];
      for (let i = 0; i < itemCount; i++) {
        const timeout = setTimeout(() => {
          setVisibleItems(prev => {
            const newState = [...prev];
            newState[i] = true;
            return newState;
          });
        }, i * staggerDelay);
        timeouts.push(timeout);
      }
      return () => timeouts.forEach(clearTimeout);
    }
  }, [isVisible, itemCount, staggerDelay]);

  const delays = Array.from({ length: itemCount }, (_, i) => i * staggerDelay);

  return [ref, visibleItems, delays];
};

/**
 * Hook for parallax scrolling effect
 * @param {number} speed - Parallax speed multiplier
 * @returns {[React.RefObject, number]} - Ref and translateY value
 */
export const useParallax = (speed = 0.5) => {
  const elementRef = useRef(null);
  const [translateY, setTranslateY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const element = elementRef.current;
      if (!element) return;

      const rect = element.getBoundingClientRect();
      const scrollProgress = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
      const clampedProgress = Math.max(0, Math.min(1, scrollProgress));
      setTranslateY((clampedProgress - 0.5) * 100 * speed);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [speed]);

  return [elementRef, translateY];
};

/**
 * Hook for mouse-following effect
 * @param {number} intensity - Effect intensity (0-1)
 * @returns {[React.RefObject, { x: number, y: number }]} - Ref and mouse position
 */
export const useMouseFollow = (intensity = 0.1) => {
  const elementRef = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleMouseMove = (e) => {
      const rect = element.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const x = (e.clientX - centerX) * intensity;
      const y = (e.clientY - centerY) * intensity;
      
      setPosition({ x, y });
    };

    const handleMouseLeave = () => {
      setPosition({ x: 0, y: 0 });
    };

    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [intensity]);

  return [elementRef, position];
};

export default useScrollAnimation;
