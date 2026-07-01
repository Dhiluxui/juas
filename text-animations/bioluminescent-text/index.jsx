import React from 'react';
import { motion } from 'framer-motion';

export const BioluminescentText = ({ text = "BIOLUMINESCENCE" }: { text?: string }) => {
  const letters = Array.from(text);

  return (
    <div className="flex text-5xl font-light text-cyan-100 tracking-widest relative">
      {letters.map((letter, index) => (
        <motion.span
          key={index}
          className="inline-block relative"
          animate={{
            color: ["#cffafe", "#22d3ee", "#06b6d4", "#cffafe"],
            textShadow: [
              "0 0 5px rgba(34, 211, 238, 0)",
              "0 0 20px rgba(34, 211, 238, 0.8)",
              "0 0 40px rgba(6, 182, 212, 1)",
              "0 0 5px rgba(34, 211, 238, 0)"
            ],
            y: [0, -5, 0]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            delay: index * 0.15,
            ease: "easeInOut"
          }}
        >
          {letter === " " ? "\u00A0" : letter}
          {/* Spores */}
          {Math.random() > 0.3 && (
            <motion.div
              className="absolute w-1 h-1 bg-cyan-300 rounded-full blur-[1px]"
              animate={{
                y: [0, -40],
                x: [0, Math.random() * 30 - 15],
                opacity: [0, 1, 0],
                scale: [0, 2, 0]
              }}
              transition={{
                duration: 2 + Math.random() * 2,
                repeat: Infinity,
                delay: index * 0.2 + Math.random(),
                ease: "easeOut"
              }}
              style={{ top: "50%", left: "50%" }}
            />
          )}
        </motion.span>
      ))}
    </div>
  );
};
