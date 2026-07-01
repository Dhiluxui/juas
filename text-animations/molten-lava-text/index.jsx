import React from 'react';
import { motion } from 'framer-motion';

export const MoltenLavaText = ({ text = "MOLTEN" }: { text?: string }) => {
  return (
    <div className="relative bg-black p-10 flex items-center justify-center">
      <svg width="0" height="0" className="absolute">
        <filter id="lava">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
          <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="lava" />
          <feBlend in="SourceGraphic" in2="lava" />
        </filter>
      </svg>
      <div 
        className="flex text-7xl font-extrabold text-orange-500 tracking-tighter"
        style={{ filter: "url(#lava)" }}
      >
        {Array.from(text).map((char, i) => (
          <motion.div
            key={i}
            animate={{
              y: [0, -12, 0, 8, 0],
              scaleY: [1, 1.3, 1, 0.7, 1],
            }}
            transition={{
              duration: 2 + Math.random(),
              repeat: Infinity,
              delay: i * 0.2,
              ease: "easeInOut"
            }}
            className="bg-clip-text text-transparent bg-gradient-to-b from-yellow-300 via-orange-500 to-red-600 drop-shadow-[0_5px_10px_rgba(255,100,0,0.5)]"
          >
            {char === " " ? "\u00A0" : char}
          </motion.div>
        ))}
      </div>
    </div>
  );
};
