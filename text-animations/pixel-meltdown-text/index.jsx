import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export const PixelMeltdownText = ({ text = "MELTDOWN" }: { text?: string }) => {
  const [pixels, setPixels] = useState<{id: number, x: number, y: number, delay: number}[]>([]);

  useEffect(() => {
    const newPixels = [];
    for (let i = 0; i < 60; i++) {
      newPixels.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 2
      });
    }
    setPixels(newPixels);
  }, []);

  return (
    <div className="relative inline-block text-6xl font-mono text-green-500 overflow-hidden pb-10">
      <motion.div
        animate={{
          y: [0, 2, -1, 0],
          filter: ["blur(0px)", "blur(1px)", "blur(0px)"],
        }}
        transition={{ duration: 0.2, repeat: Infinity, repeatType: "mirror" }}
        className="relative z-10"
      >
        {text}
      </motion.div>
      {pixels.map((p) => (
        <motion.div
          key={p.id}
          className="absolute w-1 h-4 bg-green-400/80 z-0"
          style={{ left: `${p.x}%`, top: `30%` }}
          animate={{
            y: [0, 150],
            opacity: [1, 0],
            scaleY: [1, 4]
          }}
          transition={{
            duration: 1 + Math.random(),
            repeat: Infinity,
            delay: p.delay,
            ease: "easeIn"
          }}
        />
      ))}
    </div>
  );
};
