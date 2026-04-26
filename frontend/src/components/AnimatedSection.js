import React from 'react';
import { useScrollAnimation } from '../hooks/useAnimations';
import { cn } from '../lib/utils';

/**
 * AnimatedSection - A wrapper component that animates its children on scroll
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child elements
 * @param {string} props.animation - Animation type: 'fade-up', 'fade-down', 'fade-left', 'fade-right', 'scale', 'rotate'
 * @param {number} props.delay - Animation delay in ms
 * @param {number} props.duration - Animation duration in ms
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.once - Only animate once
 */
const AnimatedSection = ({
  children,
  animation = 'fade-up',
  delay = 0,
  duration = 600,
  className = '',
  once = true,
  threshold = 0.1,
  ...props
}) => {
  const [ref, isVisible] = useScrollAnimation({ threshold, triggerOnce: once });

  const animations = {
    'fade-up': {
      initial: 'opacity-0 translate-y-10',
      animate: 'opacity-100 translate-y-0',
    },
    'fade-down': {
      initial: 'opacity-0 -translate-y-10',
      animate: 'opacity-100 translate-y-0',
    },
    'fade-left': {
      initial: 'opacity-0 -translate-x-10',
      animate: 'opacity-100 translate-x-0',
    },
    'fade-right': {
      initial: 'opacity-0 translate-x-10',
      animate: 'opacity-100 translate-x-0',
    },
    'scale': {
      initial: 'opacity-0 scale-90',
      animate: 'opacity-100 scale-100',
    },
    'rotate': {
      initial: 'opacity-0 -rotate-6 translate-y-5',
      animate: 'opacity-100 rotate-0 translate-y-0',
    },
    'blur': {
      initial: 'opacity-0 blur-sm',
      animate: 'opacity-100 blur-0',
    },
    'bounce': {
      initial: 'opacity-0 translate-y-8',
      animate: 'opacity-100 translate-y-0 animate-bounce-in',
    },
  };

  const currentAnimation = animations[animation] || animations['fade-up'];

  return (
    <div
      ref={ref}
      className={cn(
        'transition-all ease-out',
        isVisible ? currentAnimation.animate : currentAnimation.initial,
        className
      )}
      style={{
        transitionDuration: `${duration}ms`,
        transitionDelay: `${delay}ms`,
      }}
      {...props}
    >
      {children}
    </div>
  );
};

/**
 * AnimatedList - Animate a list of items with stagger effect
 */
export const AnimatedList = ({
  children,
  animation = 'fade-up',
  staggerDelay = 100,
  className = '',
  itemClassName = '',
  once = true,
  ...props
}) => {
  const [ref, isVisible] = useScrollAnimation({ triggerOnce: once });
  const childArray = React.Children.toArray(children);

  const animations = {
    'fade-up': 'opacity-0 translate-y-8',
    'fade-left': 'opacity-0 -translate-x-8',
    'fade-right': 'opacity-0 translate-x-8',
    'scale': 'opacity-0 scale-90',
  };

  const animateClass = animations[animation] || animations['fade-up'];

  return (
    <div ref={ref} className={className} {...props}>
      {childArray.map((child, index) => (
        <div
          key={index}
          className={cn(
            'transition-all duration-500 ease-out',
            isVisible ? 'opacity-100 translate-y-0 translate-x-0 scale-100' : animateClass,
            itemClassName
          )}
          style={{
            transitionDelay: isVisible ? `${index * staggerDelay}ms` : '0ms',
          }}
        >
          {child}
        </div>
      ))}
    </div>
  );
};

/**
 * AnimatedText - Animate text character by character or word by word
 */
export const AnimatedText = ({
  text,
  type = 'words', // 'words' or 'chars'
  animation = 'fade-up',
  staggerDelay = 50,
  className = '',
  once = true,
  ...props
}) => {
  const [ref, isVisible] = useScrollAnimation({ triggerOnce: once });
  const items = type === 'words' ? text.split(' ') : text.split('');

  return (
    <span ref={ref} className={cn('inline-flex flex-wrap', className)} {...props}>
      {items.map((item, index) => (
        <span
          key={index}
          className={cn(
            'inline-block transition-all duration-300 ease-out',
            isVisible 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-4'
          )}
          style={{
            transitionDelay: isVisible ? `${index * staggerDelay}ms` : '0ms',
            marginRight: type === 'words' ? '0.25em' : '0',
          }}
        >
          {item}
        </span>
      ))}
    </span>
  );
};

/**
 * AnimatedCounter - Animate a number counting up
 */
export const AnimatedCounter = ({
  end,
  duration = 2000,
  suffix = '',
  prefix = '',
  className = '',
  once = true,
}) => {
  const [ref, isVisible] = useScrollAnimation({ triggerOnce: once });
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    if (!isVisible) return;
    
    let startTime;
    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      
      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(easeOut * end));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [isVisible, end, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  );
};

/**
 * FloatingElement - Element that floats with a subtle animation
 */
export const FloatingElement = ({
  children,
  amplitude = 10,
  duration = 3000,
  className = '',
  ...props
}) => {
  return (
    <div
      className={cn('animate-float', className)}
      style={{
        '--float-amplitude': `${amplitude}px`,
        animationDuration: `${duration}ms`,
      }}
      {...props}
    >
      {children}
    </div>
  );
};

/**
 * GlowingElement - Element with animated glow effect
 */
export const GlowingElement = ({
  children,
  color = 'primary',
  intensity = 'medium',
  className = '',
  ...props
}) => {
  const intensities = {
    low: '0 0 10px',
    medium: '0 0 20px',
    high: '0 0 30px',
  };

  return (
    <div
      className={cn('animate-glow', className)}
      style={{
        '--glow-intensity': intensities[intensity] || intensities.medium,
      }}
      {...props}
    >
      {children}
    </div>
  );
};

export default AnimatedSection;
