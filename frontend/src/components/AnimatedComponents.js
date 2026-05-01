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
