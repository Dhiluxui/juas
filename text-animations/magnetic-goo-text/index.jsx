import React from "react";
import { motion } from "framer-motion";

export default function App({ text = "GOOEY" }) {
  const letters = Array.from(text);

  return (
    <div className="min-h-screen w-full bg-neutral-950 relative flex justify-center items-center overflow-hidden font-sans select-none">
      
      {}
      <svg className="absolute w-0 h-0 pointer-events-none" aria-hidden="true">
        <defs>
          <filter id="magnetic-goo">
            <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
            <feColorMatrix 
              in="blur" 
              mode="matrix" 
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 25 -12" 
              result="goo" 
            />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
      </svg>

      {}
      <div className="relative py-12 px-6 flex justify-center w-full">
        <h2 
          className="text-6xl md:text-8xl lg:text-9xl font-black text-yellow-400 flex gap-2"
          style={{ filter: "url(#magnetic-goo)" }}
        >
          {letters.map((char, i) => (
            <motion.span
              key={i}
              drag
              dragConstraints={{ top: 0, left: 0, right: 0, bottom: 0 }}
              dragElastic={0.4}
              whileHover={{ scale: 1.2 }}
              className="inline-block cursor-grab active:cursor-grabbing origin-center"
            >
              {char === " " ? "\u00A0" : char}
            </motion.span>
          ))}
        </h2>
      </div>

    </div>
  );
}