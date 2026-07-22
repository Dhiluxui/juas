import { motion } from "framer-motion";

export const PaperShredText = ({ text = "SHREDDER" }: any) => {
  const slices = 12;

  return (
    <div className="relative py-16 px-4 w-full h-full flex justify-center items-center overflow-hidden rounded-xl">
      <div className="relative text-6xl md:text-9xl font-black text-white uppercase">
        {/* We stack identical text layers, each clipped to a vertical slice */}
        {Array.from({ length: slices }).map((_, i) => {
          const sliceWidth = 100 / slices;
          const clipLeft = i * sliceWidth;
          const clipRight = 100 - (i + 1) * sliceWidth;
          
          return (
            <motion.div
              key={i}
              className="absolute inset-0"
              style={{
                clipPath: `inset(0 ${clipRight}% 0 ${clipLeft}%)`,
                WebkitClipPath: `inset(0 ${clipRight}% 0 ${clipLeft}%)`
              }}
              animate={{ 
                y: [0, 0, 300, 300],
                opacity: [1, 1, 0, 0],
                rotateZ: [0, 0, i % 2 === 0 ? 15 : -15, 0]
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                times: [0, 0.4, 0.8, 1],
                ease: "easeIn",
                delay: i * 0.05 // Staggered shredding
              }}
            >
              {text}
            </motion.div>
          );
        })}
        {/* Invisible base for layout */}
        <div className="opacity-0">{text}</div>
      </div>
    </div>
  );
};