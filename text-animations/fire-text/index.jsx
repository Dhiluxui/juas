import React, { useMemo } from "react";
import { motion } from "framer-motion";

export default function App({ text = "INFERNO" }) {
  // We use useMemo here so the random values don't regenerate on every render,
  // ensuring the animation loops flawlessly without jumping.
  const lettersData = useMemo(() => {
    return Array.from(text).map((char) => ({
      char,
      yRandom: Math.random() * 6,
      durRandom: Math.random() * 0.4,
    }));
  }, [text]);

  return (
    <div className="min-h-screen w-full bg-neutral-950 relative flex justify-center items-center overflow-hidden font-sans select-none">
      
      { }
      <svg className="absolute w-0 h-0 pointer-events-none" aria-hidden="true">
        <defs>
          <filter id="fire-main" x="-20%" y="-60%" width="140%" height="200%">
            <feTurbulence type="fractalNoise" baseFrequency="0.025 0.06" numOctaves="4" result="noise">
              <animate 
                attributeName="baseFrequency" 
                values="0.025 0.06;0.03 0.08;0.025 0.06" 
                dur="3s" 
                repeatCount="indefinite" 
              />
            </feTurbulence>
            <feDisplacementMap 
              in="SourceGraphic" 
              in2="noise" 
              scale="22" 
              xChannelSelector="R" 
              yChannelSelector="G" 
              result="displaced" 
            />
            <feComposite in="SourceGraphic" in2="displaced" operator="over" />
          </filter>
        </defs>
      </svg>

      { }
      <div 
        className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-3/4 max-w-lg h-32 pointer-events-none z-0" 
        style={{ 
          background: "radial-gradient(ellipse at center bottom, rgba(255,80,0,0.4) 0%, transparent 70%)", 
          filter: "blur(20px)" 
        }} 
      />

      { }
      <h2 
        className="flex gap-[0.02em] relative z-10" 
        style={{ filter: "url(#fire-main)" }}
      >
        {lettersData.map((data, i) => (
          <motion.span
            key={i}
            className="inline-block text-6xl md:text-8xl lg:text-9xl font-black"
            style={{
              background: "linear-gradient(to top, #ff2200 0%, #ff6600 30%, #ffcc00 65%, #fff5e0 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              textShadow: "none",
              filter: "drop-shadow(0px -4px 8px rgba(255,80,0,0.8))"
            }}
            animate={{
              y: [0, -4 - data.yRandom, 0, -2, 0],
              scaleY: [1, 1.05, 0.97, 1.02, 1],
            }}
            transition={{
              duration: 0.6 + data.durRandom,
              repeat: Infinity,
              delay: i * 0.08,
              ease: "easeInOut"
            }}
          >
            {data.char === " " ? "\u00A0" : data.char}
          </motion.span>
        ))}
      </h2>
    </div>
  );
}