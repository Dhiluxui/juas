import React from 'react';
import { motion } from 'framer-motion';

export const BlackHoleText = ({ text = "SINGULARITY", duration = 4 }: { text?: string, duration?: number }) => {
  const letters = Array.from(text);

  return (
    <div className="flex items-center justify-center text-5xl font-black relative py-10">
      {/* Event Horizon (Black Hole) */}
      <motion.div 
        className="absolute w-6 h-6 bg-black rounded-full z-10"
        style={{ boxShadow: "0 0 30px 15px rgba(168, 85, 247, 0.8)" }}
        animate={{ scale: [0.8, 1.2, 0.8, 0, 0.8] }}
        transition={{ duration, repeat: Infinity, ease: "easeInOut", times: [0, 0.2, 0.5, 0.8, 1] }}
      />

      <div className="flex z-20">
        {letters.map((letter, index) => {
          // Calculate distance from center
          const center = (letters.length - 1) / 2;
          const distance = Math.abs(index - center);
          // Outer letters get sucked in first
          const delay = distance * 0.1;

          return (
            <motion.span
              key={index}
              className="inline-block origin-center font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 drop-shadow-lg"
              animate={{
                scale: [1, 1.2, 0, 0, 1],
                opacity: [1, 1, 0, 0, 1],
                rotate: [0, 45, 360, 360, 0],
                // Move towards center
                x: [0, 0, (center - index) * 20, 0, 0],
                y: [0, -10, 0, 0, 0]
              }}
              transition={{
                duration: duration,
                repeat: Infinity,
                ease: "anticipate",
                times: [0, 0.2, 0.5, 0.8, 1],
                delay: delay
              }}
            >
              {letter === " " ? "\u00A0" : letter}
            </motion.span>
          );
        })}
      </div>
    </div>
  );
};
