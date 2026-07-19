import React from "react";
import { motion } from "framer-motion";

export default function App({ text = "PEEL ME" }) {
  const letters = Array.from(text);

  return (
    <div className="relative min-h-screen w-full flex justify-center items-center bg-zinc-100 overflow-hidden font-sans selection:bg-zinc-300">
      
      {}
      <h2 
        className="text-6xl md:text-8xl font-black text-neutral-900 flex flex-wrap justify-center gap-3 md:gap-4 p-8" 
        style={{ perspective: "1200px" }}
      >
        {letters.map((char, i) => (
          <motion.span
            key={i}
            className="relative inline-block cursor-pointer bg-neutral-900 text-neutral-50 px-4 py-2 md:px-6 md:py-3 rounded-md origin-bottom-right shadow-sm select-none"
            whileHover={{ 
              rotateX: 30, 
              rotateY: -30, 
              rotateZ: -5,
              scale: 1.05,
              // Shadow is cast down and to the left, mimicking the top-left corner lifting
              boxShadow: "-15px 20px 20px rgba(0,0,0,0.25)" 
            }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
          >
            {}
            {/* Faux sticky back exposed on hover using an absolute gradient overlay */}
            <motion.div 
              className="absolute inset-0 opacity-0 bg-gradient-to-tr from-white/40 to-transparent pointer-events-none rounded-md mix-blend-screen"
              whileHover={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            />
            {char === " " ? "\u00A0" : char}
          </motion.span>
        ))}
      </h2>
      
    </div>
  );
}