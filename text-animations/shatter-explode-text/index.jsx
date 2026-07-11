import { motion } from "framer-motion";
import { useState } from "react";

export const ShatterExplodeText = ({ text = "SHATTER" }: any) => {
  const [shattered, setShattered] = useState(false);
  const letters = Array.from(text);

  return (
    <div 
      className="relative py-16 px-4 w-full min-h-[300px] flex flex-col justify-center items-center rounded-xl overflow-hidden cursor-pointer"
      onClick={() => setShattered(!shattered)}
    >
      <h2 className="flex flex-wrap justify-center text-6xl md:text-8xl font-black text-white z-10 pointer-events-none">
        {letters.map((char, i) => {
          const dx = (Math.random() - 0.5) * 500;
          const dy = (Math.random() - 0.5) * 500;
          const rot = (Math.random() - 0.5) * 720;
          
          return (
            <motion.span
              key={i}
              className="inline-block"
              animate={shattered ? { x: dx, y: dy, rotateZ: rot, opacity: 0, scale: 0 } : { x: 0, y: 0, rotateZ: 0, opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 50, damping: 10, mass: Math.random() * 2 + 1 }}
            >
              {char === " " ? "\u00A0" : char}
            </motion.span>
          );
        })}
      </h2>
      <div className="absolute bottom-4 text-zinc-500 font-mono text-sm pointer-events-none">Click to Shatter & Rebuild</div>
    </div>
  );
};