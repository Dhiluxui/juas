import { motion } from "framer-motion";

export const VortexText = ({ text = "VORTEX EFFECT", duration = 1.5, splitType = "chars" }: any) => {
  const elements = splitType === "words" ? text.split(" ") : Array.from(text);

  return (
    <motion.h2 className="text-4xl md:text-6xl font-black text-fuchsia-400 flex flex-wrap py-2 px-1 justify-center">
      {elements.map((el, index) => {
        // Mathematical spiral calculation
        const radius = 300;
        const angle = (index / elements.length) * Math.PI * 4; // 2 full geometric rotations
        const initialX = Math.cos(angle) * radius;
        const initialY = Math.sin(angle) * radius;
        
        return (
          <motion.span
            key={index}
            initial={{ x: initialX, y: initialY, scale: 0, rotate: 360, opacity: 0 }}
            animate={{ x: 0, y: 0, scale: 1, rotate: 0, opacity: 1 }}
            transition={{ 
              duration: duration, 
              ease: [0.16, 1, 0.3, 1], // Custom spring-like deceleration
              delay: index * 0.02
            }}
            className="inline-block"
          >
            {el === " " && splitType === "chars" ? "\u00A0" : el}
          </motion.span>
        );
      })}
    </motion.h2>
  );
};