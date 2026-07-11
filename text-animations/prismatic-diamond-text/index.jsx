import React from 'react';
import { motion } from 'framer-motion';

export const PrismaticDiamondText = ({ text = "PRISMATIC", duration = 2 }) => {
  return (
    <div className="relative font-black text-6xl md:text-8xl tracking-tight text-transparent">
      {/* Prismatic SVG Filter */}
      <svg className="hidden">
        <defs>
          <linearGradient id="prismatic-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff0000" />
            <stop offset="20%" stopColor="#ffff00" />
            <stop offset="40%" stopColor="#00ff00" />
            <stop offset="60%" stopColor="#00ffff" />
            <stop offset="80%" stopColor="#0000ff" />
            <stop offset="100%" stopColor="#ff00ff" />
          </linearGradient>
          
          <filter id="diamond-cut">
            <feTurbulence type="fractalNoise" baseFrequency="0.1" numOctaves="1" result="noise" />
            <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 5 -2" in="noise" result="highContrastNoise" />
            <feComposite in="SourceGraphic" in2="highContrastNoise" operator="in" result="cutText" />
            <feDropShadow dx="2" dy="2" stdDeviation="1" floodColor="rgba(255,255,255,0.5)" />
          </filter>
        </defs>
      </svg>

      {/* Base Layer */}
      <motion.div
        className="relative z-10"
        style={{
          backgroundImage: "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIi8+CjxyZWN0IHdpZHRoPSIyIiBoZWlnaHQ9IjIiIGZpbGw9IiNjY2MiLz4KPC9zdmc+')",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          filter: "url(#diamond-cut) drop-shadow(0 0 10px rgba(255,255,255,0.3))"
        }}
        initial={{ opacity: 0, scale: 0.9, filter: "brightness(0)" }}
        animate={{ opacity: 1, scale: 1, filter: "brightness(1.5)" }}
        transition={{ duration: duration, ease: "circOut" }}
      >
        {text}
      </motion.div>
      
      {/* Prismatic Overlay */}
      <motion.div
        className="absolute inset-0 z-20 mix-blend-overlay"
        style={{
          background: "linear-gradient(45deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
        }}
        animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
        transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
      >
        {text}
      </motion.div>
    </div>
  );
};