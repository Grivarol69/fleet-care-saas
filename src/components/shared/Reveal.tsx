"use client";

import { motion, useAnimation, useInView } from "framer-motion";
import { useEffect, useRef } from "react";

interface RevealProps {
  children: React.ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  className?: string;
  delay?: number;
}

export function Reveal({
  children,
  position = "bottom",
  className,
  delay = 0.25,
}: RevealProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const mainControls = useAnimation();

  useEffect(() => {
    if (isInView) {
      mainControls.start("visible");
    }
  }, [isInView, mainControls]);

  const getVariant = () => {
    switch (position) {
      case "top":
        return {
          hidden: { opacity: 0, y: -75 },
          visible: { opacity: 1, y: 0 },
        };
      case "left":
        return {
          hidden: { opacity: 0, x: -75 },
          visible: { opacity: 1, x: 0 },
        };
      case "right":
        return { hidden: { opacity: 0, x: 75 }, visible: { opacity: 1, x: 0 } };
      case "bottom":
      default:
        return { hidden: { opacity: 0, y: 75 }, visible: { opacity: 1, y: 0 } };
    }
  };

  return (
    <div ref={ref} className={className}>
      <motion.div
        variants={getVariant()}
        initial="hidden"
        animate={mainControls}
        transition={{ duration: 0.5, delay }}
      >
        {children}
      </motion.div>
    </div>
  );
}
