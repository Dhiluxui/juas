import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useRef } from "react";

export const BendingStringText = ({ text = "PULL ME DOWN" }: any) => {
  const ref = useRef<HTMLDivElement>(null);
  const pullY = useMotionValue(0);
  // Heavy spring physics to snap back like a guitar string
  const springY = useSpring(pullY, { stiffness: 600, damping: 5, mass: 0.5 });

  const handleDrag = (event: any, info: any) => {
    pullY.set(info.offset.y);
  };
  
  const handleDragEnd = () => {
    pullY.set(0);
  };

  const letters = Array.from(text);

  return (
    <div ref={ref} className="relative py-12 px-4 flex justify-center w-full">
      {/* Invisible drag target spanning the text */}
      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.8}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        className="absolute inset-0 z-20 cursor-grab active:cursor-grabbing"
      />
      
      <h2 className="text-4xl md:text-6xl font-black text-rose-400 flex gap-1 z-10 pointer-events-none">
        {letters.map((letter, i) => {
          // Calculate how much each letter bends based on distance from center
          const center = (letters.length - 1) / 2;
          const dist = Math.abs(i - center);
          // Letters in the center bend the most, edges bend the least
          const multiplier = Math.max(0, 1 - (dist / (center || 1)));
          
          const y = useTransform(springY, (val) => val * multiplier);

          return (
            <motion.span key={i} style={{ y }} className="inline-block">
              {letter === " " ? "\u00A0" : letter}
            </motion.span>
          );
        })}
      </h2>
      
      {/* Visual String */}
      <motion.div 
        className="absolute top-1/2 left-0 right-0 h-[2px] bg-rose-500/30 -z-10"
        style={{ y: useTransform(springY, val => val * 0.5) }} // The string bends at half the center letter's Y
      />
    </div>
  );
};