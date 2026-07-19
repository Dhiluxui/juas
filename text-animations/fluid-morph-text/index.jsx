import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

// Cycle through multiple phrases with a fluid morph
const PHRASES = ["FLUID", "MORPH", "FLOW", "LIQUID"];

export default function App({
  text = "FLUID MORPH",
  duration = 2.5,
}) {
  const parts = text.split(" ");
  // If the text has 2 or more words, use them. Otherwise, default to the PHRASES array.
  const words = parts.length >= 2 ? parts : PHRASES;
  const [currentIdx, setCurrentIdx] = useState(0);
  const filterId = "fluid-morph-filter";

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % words.length);
    }, duration * 1000);
    return () => clearInterval(interval);
  }, [duration, words.length]);

  return (
    <div className="relative py-20 px-6 flex justify-center items-center overflow-hidden min-h-screen w-full bg-neutral-950">
      {/* Hidden SVG for the Gooey/Fluid Filter */}
      <svg className="absolute w-0 h-0 pointer-events-none" aria-hidden="true">
        <defs>
          <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9"
              result="fluid"
            />
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" result="noise">
              <animate attributeName="baseFrequency" values="0.04;0.06;0.04" dur="4s" repeatCount="indefinite" />
            </feTurbulence>
            <feDisplacementMap in="fluid" in2="noise" scale="10" xChannelSelector="R" yChannelSelector="G" result="morphed" />
            <feComposite in="SourceGraphic" in2="morphed" operator="over" />
          </filter>
        </defs>
      </svg>

      {/* Progress dots at the bottom */}
      <div className="absolute bottom-6 flex gap-2">
        {words.map((_, i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full"
            animate={{ 
              backgroundColor: i === currentIdx ? "#a78bfa" : "rgba(255,255,255,0.2)", 
              scale: i === currentIdx ? 1.5 : 1 
            }}
            transition={{ duration: 0.3 }}
          />
        ))}
      </div>

      <div className="relative w-full h-32 flex items-center justify-center" style={{ filter: `url(#${filterId})` }}>
        {words.map((word, wi) => (
          <motion.h2
            key={wi}
            className="absolute text-5xl md:text-8xl font-black tracking-widest uppercase text-center"
            style={{
              color: `hsl(${(wi / words.length) * 120 + 260}, 80%, 70%)`,
              textShadow: `0 0 30px hsl(${(wi / words.length) * 120 + 260}, 80%, 60%, 0.5)`,
            }}
            animate={{
              opacity: wi === currentIdx ? 1 : 0,
              scale: wi === currentIdx ? 1 : 0.6,
              filter: wi === currentIdx ? "blur(0px)" : "blur(25px)",
              y: wi === currentIdx ? 0 : 30,
            }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          >
            {word}
          </motion.h2>
        ))}
      </div>
    </div>
  );
}