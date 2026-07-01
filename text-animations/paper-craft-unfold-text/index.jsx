import React from 'react';
import { motion } from 'framer-motion';

export const PaperCraftUnfoldText = ({ text = "UNFOLD" }: { text?: string }) => {
  const letters = Array.from(text);

  const container = {
    hidden: { opacity: 1 },
    visible: {
      transition: { staggerChildren: 0.2 },
    },
  };

  const child = {
    hidden: { 
      opacity: 0,
      rotateX: -90,
      y: 20,
      skewX: 20,
    },
    visible: {
      opacity: 1,
      rotateX: 0,
      y: 0,
      skewX: 0,
      transition: {
        type: "spring",
        damping: 10,
        stiffness: 80,
      }
    },
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className="flex space-x-1 text-6xl font-bold text-stone-100"
      style={{ perspective: "800px" }}
    >
      {letters.map((letter, i) => (
        <motion.div
          key={i}
          variants={child}
          className="relative origin-bottom bg-gradient-to-t from-stone-400 to-stone-100 bg-clip-text text-transparent drop-shadow-lg pb-2 pr-1"
          style={{ transformStyle: "preserve-3d" }}
          whileHover={{ 
            rotateX: [0, -20, 0],
            transition: { duration: 0.5 } 
          }}
        >
          {letter === " " ? "\u00A0" : letter}
        </motion.div>
      ))}
    </motion.div>
  );
};
