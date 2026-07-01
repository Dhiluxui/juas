import React from 'react';
import { motion } from 'framer-motion';

export const QuantumStateText = ({ text = "SUPERPOSITION" }: { text?: string }) => {
  const letters = Array.from(text);

  return (
    <div className="flex text-5xl font-mono relative bg-slate-900 p-8 rounded-lg text-white">
      {letters.map((letter, i) => (
        <div key={i} className="relative inline-block w-[1ch]">
          {/* State 1 */}
          <motion.span
            className="absolute top-0 left-0 text-cyan-400"
            animate={{
              opacity: [0, 0.8, 0],
              x: [Math.random() * 10 - 5, 0, Math.random() * -10 + 5],
              y: [Math.random() * -10 + 5, 0, Math.random() * 10 - 5],
              filter: ["blur(4px)", "blur(0px)", "blur(4px)"]
            }}
            transition={{ duration: 0.5, repeat: Infinity, repeatType: "mirror", delay: i * 0.05 }}
          >
            {letter}
          </motion.span>
          {/* State 2 */}
          <motion.span
            className="absolute top-0 left-0 text-fuchsia-500"
            animate={{
              opacity: [0.8, 0, 0.8],
              x: [Math.random() * -10 + 5, 0, Math.random() * 10 - 5],
              y: [Math.random() * 10 - 5, 0, Math.random() * -10 + 5],
              filter: ["blur(0px)", "blur(4px)", "blur(0px)"]
            }}
            transition={{ duration: 0.5, repeat: Infinity, repeatType: "mirror", delay: i * 0.05 }}
          >
            {letter}
          </motion.span>
          {/* Collapse state */}
          <motion.span
            className="relative text-white font-bold"
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            {letter === " " ? "\u00A0" : letter}
          </motion.span>
        </div>
      ))}
    </div>
  );
};
