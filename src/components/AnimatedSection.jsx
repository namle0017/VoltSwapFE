import { useScrollAnimation } from "../hooks/useScrollAnimation";
// eslint-disable-next-line no-unused-vars
import { motion, useReducedMotion } from "framer-motion";
const AnimatedSection = ({
  children,
  animation = "fadeUp",
  delay = 0,
  duration = 0.6,
  className = "",
}) => {
  const [ref, isVisible] = useScrollAnimation(0.1);
  const prefersReduced = useReducedMotion();

  const animations = {
    fadeUp: {
      hidden: { opacity: 0, y: 60 },
      visible: { opacity: 1, y: 0 },
    },
    fadeIn: {
      hidden: { opacity: 0 },
      visible: { opacity: 1 },
    },
    slideLeft: {
      hidden: { opacity: 0, x: -60 },
      visible: { opacity: 1, x: 0 },
    },
    slideRight: {
      hidden: { opacity: 0, x: 60 },
      visible: { opacity: 1, x: 0 },
    },
    zoomIn: {
      hidden: { opacity: 0, scale: 0.8 },
      visible: { opacity: 1, scale: 1 },
    },
    zoomOut: {
      hidden: { opacity: 0, scale: 1.2 },
      visible: { opacity: 1, scale: 1 },
    },
  };

  return (
    <motion.div
      ref={ref}
      initial={prefersReduced ? false : "hidden"}
      animate={prefersReduced ? false : (isVisible ? "visible" : "hidden")}
      variants={prefersReduced ? undefined : animations[animation]}
      transition={prefersReduced ? undefined : { duration, delay, ease: [0.25, 0.25, 0.25, 0.75] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export default AnimatedSection;
