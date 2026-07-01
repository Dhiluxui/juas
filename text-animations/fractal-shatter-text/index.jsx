import React, { useState } from 'react';
import { motion } from 'framer-motion';

export const FractalShatterText = ({ text = "FRACTAL" }: { text?: string }) => {
  const letters = Array.from(text);

  return (
    <div className="flex text-7xl font-black text-gray-200 uppercase tracking-widest relative">
      {letters.map((letter, i) => {
        const [isHovered, setIsHovered] = useState(false);
        return (
          <div
            key={i}
            className="relative cursor-pointer"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <span className="opacity-0">{letter === " " ? "\u00A0" : letter}</span>
            {/* Top half */}
            <motion.span
              className="absolute top-0 left-0 text-white"
              style={{ clipPath: 'polygon(0 0, 100% 0, 100% 50%, 0 40%)' }}
              animate={isHovered ? { x: -10, y: -20, rotate: -15, opacity: 0 } : { x: 0, y: 0, rotate: 0, opacity: 1 }}
              transition={{ duration: 0.4, type: "spring" }}
            >
              {letter}
            </motion.span>
            {/* Bottom left */}
            <motion.span
              className="absolute top-0 left-0 text-gray-300"
              style={{ clipPath: 'polygon(0 40%, 50% 45%, 30% 100%, 0 100%)' }}
              animate={isHovered ? { x: -15, y: 15, rotate: -25, opacity: 0 } : { x: 0, y: 0, rotate: 0, opacity: 1 }}
              transition={{ duration: 0.4, type: "spring" }}
            >
              {letter}
            </motion.span>
            {/* Bottom right */}
             <motion.span
              className="absolute top-0 left-0 text-gray-400"
              style={{ clipPath: 'polygon(50% 45%, 100% 50%, 100% 100%, 30% 100%)' }}
              animate={isHovered ? { x: 15, y: 10, rotate: 20, opacity: 0 } : { x: 0, y: 0, rotate: 0, opacity: 1 }}
              transition={{ duration: 0.4, type: "spring" }}
            >
              {letter}
            </motion.span>
          </div>
        );
      })}
    </div>
  );
};
