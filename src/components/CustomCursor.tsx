"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function CustomCursor() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [label, setLabel] = useState("");

  useEffect(() => {
    const move = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
      setIsVisible(true);
    };

    const handleOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const interactive = target.closest("a, button, [data-cursor-hover], [data-cursor-label]");
      if (interactive) {
        setIsHovering(true);
        const lbl = interactive.getAttribute("data-cursor-label");
        setLabel(lbl || "");
      }
    };

    const handleOut = () => {
      setIsHovering(false);
      setLabel("");
    };

    const handleLeave = () => setIsVisible(false);

    window.addEventListener("mousemove", move);
    document.addEventListener("mouseover", handleOver);
    document.addEventListener("mouseout", handleOut);
    document.addEventListener("mouseleave", handleLeave);

    return () => {
      window.removeEventListener("mousemove", move);
      document.removeEventListener("mouseover", handleOver);
      document.removeEventListener("mouseout", handleOut);
      document.removeEventListener("mouseleave", handleLeave);
    };
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed top-0 left-0 pointer-events-none z-[9999] flex items-center justify-center"
          animate={{
            x: position.x - (isHovering ? 32 : 8),
            y: position.y - (isHovering ? 32 : 8),
            width: isHovering ? 64 : 16,
            height: isHovering ? 64 : 16,
          }}
          transition={{ type: "spring", damping: 25, stiffness: 300, mass: 0.5 }}
        >
          <motion.div
            className="rounded-full border border-white/40 flex items-center justify-center"
            animate={{
              width: isHovering ? 64 : 16,
              height: isHovering ? 64 : 16,
              backgroundColor: isHovering ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.6)",
            }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {label && (
              <motion.span
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className="text-[10px] font-medium text-white tracking-wider uppercase"
              >
                {label}
              </motion.span>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
