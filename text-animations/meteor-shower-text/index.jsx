import React from 'react';
import { motion } from 'framer-motion';

export const MeteorShowerText = ({ text = "METEOR" }: { text?: string }) => {
  return (
    <div className="relative text-7xl font-black italic text-orange-500 overflow-hidden px-10 py-5 bg-black">
      <motion.div
        className="relative z-10 text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-orange-500 to-red-600 drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]"
        animate={{
          x: [-5, 5, -5],
          y: [2, -2, 2],
        }}
        transition={{ duration: 0.1, repeat: Infinity }}
      >
        {text}
      </motion.div>
      {/* Meteors */}
      {[...Array(15)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute h-[2px] bg-gradient-to-r from-transparent via-white to-transparent z-20"
          style={{
            width: `${Math.random() * 100 + 50}px`,
            top: `${Math.random() * 100}%`,
            left: `-100%`,
            rotate: '45deg',
            boxShadow: '0 0 10px 2px rgba(255, 255, 255, 0.8)'
          }}
          animate={{
            left: ['-50%', '150%'],
            top: [`${Math.random() * 100}%`, `${Math.random() * 100 + 50}%`],
          }}
          transition={{
            duration: Math.random() * 0.5 + 0.3,
            repeat: Infinity,
            delay: Math.random() * 2,
            ease: "linear"
          }}
        />
      ))}
    </div>
  );
};
