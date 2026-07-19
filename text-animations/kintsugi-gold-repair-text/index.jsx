import { motion } from "framer-motion";
import { useState } from "react";

export const KintsugiGoldRepairText = ({ text = "KINTSUGI" }: { text?: string }) => {
  const letters = Array.from(text);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className="relative py-24 px-8 w-full w-full flex justify-center items-center overflow-hidden rounded-2xl"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <h2 className="flex flex-wrap justify-center text-6xl md:text-8xl font-black text-neutral-700 relative z-10">
        {letters.map((char, i) => {
          // Create abstract shatter lines for the kintsugi effect
          const shatterOffset = i % 2 === 0 ? 3 : -3;
          const rotation = i % 3 === 0 ? 2 : -2;

          return (
            <span key={i} className="relative inline-block mx-1">
              {/* Broken base text */}
              <motion.span
                className="inline-block"
                animate={isHovered ? { x: 0, y: 0, rotateZ: 0 } : { x: shatterOffset, y: -shatterOffset, rotateZ: rotation }}
                transition={{ type: "spring", stiffness: 150, damping: 15 }}
              >
                {char === " " ? "\u00A0" : char}
              </motion.span>
              
              {/* Gold fill that appears on hover to "repair" the gaps */}
              <motion.span
                className="absolute inset-0 text-yellow-500 drop-shadow-[0_0_10px_rgba(234,179,8,0.6)] mix-blend-screen"
                style={{
                  clipPath: "polygon(0 45%, 100% 35%, 100% 55%, 0 65%)"
                }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: isHovered ? 1 : 0, scale: isHovered ? 1.05 : 0.8 }}
                transition={{ duration: 0.4, delay: isHovered ? i * 0.1 : 0 }}
              >
                {char}
              </motion.span>
              <motion.span
                className="absolute inset-0 text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.8)] mix-blend-screen"
                style={{
                  clipPath: "polygon(40% 0, 55% 0, 45% 100%, 30% 100%)"
                }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: isHovered ? 1 : 0, scale: isHovered ? 1.05 : 0.8 }}
                transition={{ duration: 0.4, delay: isHovered ? i * 0.1 + 0.2 : 0 }}
              >
                {char}
              </motion.span>
            </span>
          );
        })}
      </h2>
    </div>
  );
};