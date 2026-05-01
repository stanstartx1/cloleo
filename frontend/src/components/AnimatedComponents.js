import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Animation variants
export const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

export const fadeInDown = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 }
};

export const fadeInLeft = {
  initial: { opacity: 0, x: -30 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 30 }
};

export const fadeInRight = {
  initial: { opacity: 0, x: 30 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -30 }
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 }
};

export const slideInFromBottom = {
  initial: { opacity: 0, y: 50 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 50 }
};

// Stagger container
export const staggerContainer = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05
    }
  }
};

export const staggerContainerFast = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.02
    }
  }
};

// Card animation for stats
export const statCardVariant = {
  initial: { opacity: 0, y: 30, scale: 0.95 },
  animate: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15
    }
  },
  hover: {
    y: -5,
    scale: 1.02,
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 25
    }
  }
};

// Table row animation
export const tableRowVariant = {
  initial: { opacity: 0, x: -20 },
  animate: { 
    opacity: 1, 
    x: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15
    }
  },
  hover: {
    backgroundColor: "rgba(139, 92, 246, 0.05)",
    transition: { duration: 0.2 }
  }
};

// Product card animation
export const productCardVariant = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { 
    opacity: 1, 
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 120,
      damping: 15
    }
  },
  hover: {
    y: -8,
    scale: 1.03,
    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)",
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 25
    }
  }
};

// Sidebar item animation
export const sidebarItemVariant = {
  initial: { opacity: 0, x: -20 },
  animate: { 
    opacity: 1, 
    x: 0,
    transition: {
      type: "spring",
      stiffness: 150,
      damping: 20
    }
  },
  hover: {
    x: 5,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 25
    }
  }
};

// Page transition animation
export const pageTransition = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: "easeOut"
    }
  },
  exit: { 
    opacity: 0,
    transition: {
      duration: 0.2,
      ease: "easeIn"
    }
  }
};

// Tab content animation
export const tabContentVariant = {
  initial: { opacity: 0, x: 20 },
  animate: { 
    opacity: 1, 
    x: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut"
    }
  },
  exit: { 
    opacity: 0, 
    x: -20,
    transition: {
      duration: 0.2,
      ease: "easeIn"
    }
  }
};

// Animated stat card component
export const AnimatedStatCard = ({ children, index = 0, className = "", ...props }) => (
  <motion.div
    variants={statCardVariant}
    initial="initial"
    animate="animate"
    whileHover="hover"
    custom={index}
    transition={{ delay: index * 0.1 }}
    className={className}
    {...props}
  >
    {children}
  </motion.div>
);

// Animated grid container
export const AnimatedGrid = ({ children, className = "", ...props }) => (
  <motion.div
    variants={staggerContainer}
    initial="initial"
    animate="animate"
    className={className}
    {...props}
  >
    {children}
  </motion.div>
);

// Animated list item
export const AnimatedListItem = ({ children, index = 0, className = "", ...props }) => (
  <motion.div
    variants={tableRowVariant}
    initial="initial"
    animate="animate"
    whileHover="hover"
    custom={index}
    transition={{ delay: index * 0.05 }}
    className={className}
    {...props}
  >
    {children}
  </motion.div>
);

// Animated page wrapper
export const AnimatedPage = ({ children, className = "", ...props }) => (
  <motion.div
    variants={pageTransition}
    initial="initial"
    animate="animate"
    exit="exit"
    className={className}
    {...props}
  >
    {children}
  </motion.div>
);

// Animated tab content
export const AnimatedTabContent = ({ children, activeKey, className = "", ...props }) => (
  <AnimatePresence mode="wait">
    <motion.div
      key={activeKey}
      variants={tabContentVariant}
      initial="initial"
      animate="animate"
      exit="exit"
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  </AnimatePresence>
);

// Pulse animation for badges
export const PulseBadge = ({ children, className = "", ...props }) => (
  <motion.span
    animate={{
      scale: [1, 1.05, 1],
    }}
    transition={{
      duration: 2,
      repeat: Infinity,
      repeatType: "reverse"
    }}
    className={className}
    {...props}
  >
    {children}
  </motion.span>
);

// Floating animation
export const FloatingElement = ({ children, className = "", delay = 0, ...props }) => (
  <motion.div
    animate={{
      y: [-5, 5, -5],
    }}
    transition={{
      duration: 3,
      repeat: Infinity,
      repeatType: "reverse",
      delay
    }}
    className={className}
    {...props}
  >
    {children}
  </motion.div>
);

// Count up animation for numbers
export const AnimatedNumber = ({ value, duration = 1, className = "", ...props }) => {
  const [displayValue, setDisplayValue] = React.useState(0);
  
  React.useEffect(() => {
    const startTime = Date.now();
    const startValue = displayValue;
    const diff = value - startValue;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / (duration * 1000), 1);
      
      // Easing function (ease out cubic)
      const eased = 1 - Math.pow(1 - progress, 3);
      
      setDisplayValue(Math.round(startValue + diff * eased));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [value, duration]);
  
  return (
    <span className={className} {...props}>
      {displayValue.toLocaleString()}
    </span>
  );
};

// Shimmer loading placeholder
export const ShimmerPlaceholder = ({ className = "", ...props }) => (
  <motion.div
    className={`bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] ${className}`}
    animate={{
      backgroundPosition: ["200% 0", "-200% 0"]
    }}
    transition={{
      duration: 1.5,
      repeat: Infinity,
      repeatType: "loop"
    }}
    {...props}
  />
);

// Icon with rotate animation on hover
export const AnimatedIcon = ({ children, className = "", ...props }) => (
  <motion.div
    whileHover={{ rotate: 15, scale: 1.1 }}
    whileTap={{ scale: 0.95 }}
    className={className}
    {...props}
  >
    {children}
  </motion.div>
);

// Button with press animation
export const AnimatedButton = ({ children, className = "", onClick, disabled, ...props }) => (
  <motion.button
    whileHover={!disabled ? { scale: 1.02, y: -2 } : {}}
    whileTap={!disabled ? { scale: 0.98 } : {}}
    className={className}
    onClick={onClick}
    disabled={disabled}
    {...props}
  >
    {children}
  </motion.button>
);

// Success checkmark animation
export const SuccessCheckmark = ({ size = 60 }) => (
  <motion.svg
    width={size}
    height={size}
    viewBox="0 0 52 52"
    xmlns="http://www.w3.org/2000/svg"
  >
    <motion.circle
      cx="26"
      cy="26"
      r="25"
      fill="none"
      stroke="#22c55e"
      strokeWidth="2"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    />
    <motion.path
      fill="none"
      stroke="#22c55e"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M14.1 27.2l7.1 7.2 16.7-16.8"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.4, delay: 0.5, ease: "easeOut" }}
    />
  </motion.svg>
);

// ========== MICRO-ANIMATIONS DE FEEDBACK ==========

// Add to Cart Button with success animation
export const AddToCartButton = ({ 
  children, 
  onClick, 
  disabled, 
  isLoading,
  isSuccess,
  className = "",
  ...props 
}) => {
  return (
    <motion.button
      className={`relative overflow-hidden ${className}`}
      onClick={onClick}
      disabled={disabled || isLoading}
      whileHover={!disabled ? { scale: 1.02, y: -2 } : {}}
      whileTap={!disabled ? { scale: 0.95 } : {}}
      {...props}
    >
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center gap-2"
          >
            <motion.div
              className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
            />
            <span>Ajout...</span>
          </motion.div>
        ) : isSuccess ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="flex items-center justify-center gap-2"
          >
            <motion.svg 
              className="w-5 h-5" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.3 }}
            >
              <motion.path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={3} 
                d="M5 13l4 4L19 7"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.3 }}
              />
            </motion.svg>
            <span>Ajouté !</span>
          </motion.div>
        ) : (
          <motion.div
            key="default"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Ripple effect on click */}
      {isSuccess && (
        <motion.div
          className="absolute inset-0 bg-white"
          initial={{ scale: 0, opacity: 0.3 }}
          animate={{ scale: 2, opacity: 0 }}
          transition={{ duration: 0.5 }}
          style={{ borderRadius: '50%', transformOrigin: 'center' }}
        />
      )}
    </motion.button>
  );
};

// Order/Commander Button with confetti-like particles
export const OrderButton = ({ 
  children, 
  onClick, 
  disabled, 
  isLoading,
  isSuccess,
  className = "",
  ...props 
}) => {
  const [particles, setParticles] = React.useState([]);
  
  const triggerParticles = () => {
    const newParticles = Array.from({ length: 12 }, (_, i) => ({
      id: Date.now() + i,
      x: Math.random() * 100 - 50,
      y: Math.random() * -80 - 20,
      rotation: Math.random() * 360,
      scale: Math.random() * 0.5 + 0.5,
      color: ['#f97316', '#22c55e', '#3b82f6', '#eab308', '#ec4899'][Math.floor(Math.random() * 5)]
    }));
    setParticles(newParticles);
    setTimeout(() => setParticles([]), 1000);
  };

  const handleClick = (e) => {
    if (onClick) onClick(e);
    if (!disabled && !isLoading) {
      triggerParticles();
    }
  };

  return (
    <motion.button
      className={`relative overflow-visible ${className}`}
      onClick={handleClick}
      disabled={disabled || isLoading}
      whileHover={!disabled ? { 
        scale: 1.03, 
        y: -3,
        boxShadow: "0 10px 40px -10px rgba(249, 115, 22, 0.5)"
      } : {}}
      whileTap={!disabled ? { scale: 0.97 } : {}}
      {...props}
    >
      {/* Confetti Particles */}
      <AnimatePresence>
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute pointer-events-none"
            style={{
              left: '50%',
              top: '50%',
              width: 8,
              height: 8,
              borderRadius: '2px',
              backgroundColor: particle.color,
            }}
            initial={{ 
              x: 0, 
              y: 0, 
              scale: 0,
              rotate: 0,
              opacity: 1 
            }}
            animate={{ 
              x: particle.x, 
              y: particle.y, 
              scale: particle.scale,
              rotate: particle.rotation,
              opacity: 0 
            }}
            exit={{ opacity: 0 }}
            transition={{ 
              duration: 0.8, 
              ease: "easeOut" 
            }}
          />
        ))}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center gap-2"
          >
            <motion.div
              className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
            />
            <span>Commande...</span>
          </motion.div>
        ) : isSuccess ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="flex items-center justify-center gap-2"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ duration: 0.4 }}
            >
              🎉
            </motion.div>
            <span>Commandé !</span>
          </motion.div>
        ) : (
          <motion.div
            key="default"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
};

// Cart badge with bounce animation when count changes
export const CartBadge = ({ count, className = "" }) => {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.span
          key={count}
          className={`absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 ${className}`}
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          exit={{ scale: 0, rotate: 180 }}
          transition={{ 
            type: "spring", 
            stiffness: 500, 
            damping: 15 
          }}
        >
          {count > 99 ? '99+' : count}
        </motion.span>
      )}
    </AnimatePresence>
  );
};

// Favorite heart button with pulse animation
export const FavoriteButton = ({ 
  isFavorite, 
  onClick, 
  size = 24,
  className = "" 
}) => {
  return (
    <motion.button
      className={`relative ${className}`}
      onClick={onClick}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
    >
      <AnimatePresence mode="wait">
        <motion.svg
          key={isFavorite ? 'filled' : 'empty'}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill={isFavorite ? '#ef4444' : 'none'}
          stroke={isFavorite ? '#ef4444' : 'currentColor'}
          strokeWidth="2"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </motion.svg>
      </AnimatePresence>
      
      {/* Heart burst effect */}
      {isFavorite && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          initial={{ scale: 1 }}
          animate={{ scale: [1, 1.5, 1] }}
          transition={{ duration: 0.3 }}
        >
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-red-400 rounded-full"
              initial={{ scale: 0, x: 0, y: 0 }}
              animate={{ 
                scale: [0, 1, 0],
                x: Math.cos((i * 60) * Math.PI / 180) * 15,
                y: Math.sin((i * 60) * Math.PI / 180) * 15,
              }}
              transition={{ duration: 0.4, delay: 0.1 }}
            />
          ))}
        </motion.div>
      )}
    </motion.button>
  );
};

// Toast notification with slide and fade
export const AnimatedToast = ({ 
  children, 
  isVisible, 
  type = 'success',
  onClose,
  className = "" 
}) => {
  const colors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
    info: 'bg-blue-500'
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={`fixed bottom-4 right-4 ${colors[type]} text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 z-50 ${className}`}
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          {type === 'success' && (
            <motion.svg 
              className="w-5 h-5" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 500 }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </motion.svg>
          )}
          {children}
          {onClose && (
            <motion.button
              onClick={onClose}
              className="ml-2 hover:bg-white/20 rounded p-1"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              ✕
            </motion.button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default {
  AnimatedStatCard,
  AnimatedGrid,
  AnimatedListItem,
  AnimatedPage,
  AnimatedTabContent,
  PulseBadge,
  FloatingElement,
  AnimatedNumber,
  ShimmerPlaceholder,
  AnimatedIcon,
  AnimatedButton,
  SuccessCheckmark,
  // New micro-animation components
  AddToCartButton,
  OrderButton,
  CartBadge,
  FavoriteButton,
  AnimatedToast,
  // Variants exports
  fadeInUp,
  fadeInDown,
  fadeInLeft,
  fadeInRight,
  scaleIn,
  slideInFromBottom,
  staggerContainer,
  staggerContainerFast,
  statCardVariant,
  tableRowVariant,
  productCardVariant,
  sidebarItemVariant,
  pageTransition,
  tabContentVariant
};
