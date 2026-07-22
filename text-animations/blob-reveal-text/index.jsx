import React from 'react';
import { motion } from 'framer-motion';

export const BlobRevealText = ({ text = "BLOBBING" }) => {
  const letters = Array.from(text);
  const filterId = "blob-rev-filter";

  const container = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.1 },
    },
  };

  const childVariants = {
    hidden: { scale: 1.5, opacity: 0, filter: "blur(12px)", y: 20 },
    visible: {
      scale: 1,
      opacity: 1,
      filter: "blur(0px)",
      y: 0,
      textShadow: "0 0 15px rgba(255,255,255,0.4)",
      transition: { type: "spring", stiffness: 160, damping: 14 }
    },
    hover: {
      textShadow: "0 0 40px rgba(255,255,255,1)",
      scale: 1.05,
      transition: { duration: 0.3, ease: "easeInOut" }
    }
  };

  return (
    <div className="relative py-20 px-6 flex justify-center items-center overflow-hidden min-h-[300px]">
      <svg className="absolute w-0 h-0 pointer-events-none" aria-hidden="true">
        <defs>
          <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
              result="blob"
            />
            <feComposite in="SourceGraphic" in2="blob" operator="over" />
          </filter>
        </defs>
      </svg>

      {}
      <motion.h2
        className="flex flex-wrap justify-center gap-1 md:gap-3 relative z-10 cursor-pointer"
        style={{ filter: `url(#${filterId})` }}
        variants={container}
        initial="hidden"
        whileInView="visible"
        whileHover="hover"
        viewport={{ once: true, margin: "-100px" }}
      >
        {letters.map((letter, i) => (
          <motion.span
            key={i}
            className="inline-block text-5xl md:text-7xl lg:text-8xl font-bold text-white tracking-widest px-1"
            variants={childVariants}
          >
            {letter === " " ? "\u00A0" : letter}
          </motion.span>
        ))}
      </motion.h2>
    </div>
  );
};

export default function App() {
  return (
    <div className="w-full flex flex-col items-center justify-center p-4">
      <BlobRevealText text="AMAZING" />
    </div>
  );
}