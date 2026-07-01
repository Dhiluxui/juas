import React from 'react';
import { motion } from 'framer-motion';

export const SynapseNetworkText = ({ text = "NEURAL" }: { text?: string }) => {
  return (
    <div className="relative text-7xl font-sans font-bold text-slate-800 bg-black p-10 overflow-hidden">
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" style={{ mixBlendMode: 'screen' }}>
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <motion.path
          d="M 20 60 Q 60 20 100 60 T 180 60 T 260 60"
          stroke="yellow"
          strokeWidth="2"
          fill="transparent"
          filter="url(#glow)"
          animate={{
            pathLength: [0, 1, 0],
            pathOffset: [0, 0, 1],
            opacity: [0, 1, 0]
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        />
        <motion.path
          d="M 40 80 Q 120 40 200 80 T 320 80"
          stroke="#00ffff"
          strokeWidth="1.5"
          fill="transparent"
          filter="url(#glow)"
          animate={{
            pathLength: [0, 1, 0],
            pathOffset: [0, 0, 1],
            opacity: [0, 1, 0]
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear", delay: 0.5 }}
        />
        <motion.path
          d="M 10 30 Q 90 90 170 30 T 300 30"
          stroke="#ff00ff"
          strokeWidth="1"
          fill="transparent"
          filter="url(#glow)"
          animate={{
            pathLength: [0, 1, 0],
            pathOffset: [0, 0, 1],
            opacity: [0, 1, 0]
          }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "linear", delay: 1 }}
        />
      </svg>
      <motion.div
        animate={{ opacity: [0.8, 1, 0.8], filter: ["blur(1px)", "blur(0px)", "blur(1px)"] }}
        transition={{ duration: 0.1, repeat: Infinity, repeatDelay: Math.random() * 2 + 1 }}
        className="relative z-20 text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]"
      >
        {text}
      </motion.div>
    </div>
  );
};
