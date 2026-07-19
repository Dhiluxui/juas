import React, { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

export default function App({ text = "PULL ME DOWN" }) {
  const ref = useRef(null);
  
  const pullY = useMotionValue(0);
  // Heavy spring physics to snap back like a guitar string
  const springY = useSpring(pullY, { stiffness: 600, damping: 5, mass: 0.5 });

  const handleDrag = (event, info) => {
    pullY.set(info.offset.y);
  };

  const handleDragEnd = () => {
    pullY.set(0);
  };

  const letters = Array.from(text);

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center w-full overflow-hidden font-sans">
      <div ref={ref} className="relative py-24 px-8 flex justify-center w-full max-w-4xl select-none">
        
        {}
        {/* Invisible drag target spanning the text */}
        <motion.div
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.8}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          className="absolute inset-0 z-20 cursor-grab active:cursor-grabbing"
        />
        
        {}
        <h2 className="text-5xl md:text-7xl lg:text-8xl font-black text-rose-400 flex gap-1 md:gap-2 z-10 pointer-events-none">
          {letters.map((letter, i) => {
            // Calculate how much each letter bends based on distance from center
            const center = (letters.length - 1) / 2;
            const dist = Math.abs(i - center);
            // Letters in the center bend the most, edges bend the least
            const multiplier = Math.max(0, 1 - (dist / (center || 1)));
            
            const y = useTransform(springY, (val) => val * multiplier);

            return (
              <motion.span 
                key={i} 
                className="inline-block"
                style={{ 
                  y, 
                  textShadow: "0 10px 30px rgba(244, 63, 94, 0.4)" 
                }}
              >
                {letter === " " ? "\u00A0" : letter}
              </motion.span>
            );
          })}
        </h2>
        
        {}
        {/* Visual String */}
        <motion.div 
          className="absolute top-1/2 left-4 right-4 md:left-0 md:right-0 h-[2px] bg-rose-500/30 -z-10 rounded-full"
          style={{ y: useTransform(springY, val => val * 0.5) }} // The string bends at half the center letter's Y
        />
      </div>
      
      <p className="absolute bottom-10 text-neutral-500 text-sm font-medium tracking-widest uppercase pointer-events-none">
        Click and drag the text
      </p>
    </div>
  );
}