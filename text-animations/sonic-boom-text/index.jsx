import { motion } from "framer-motion";

export const SonicBoomText = ({ text = "SONIC BOOM" }: any) => {
  const letters = Array.from(text);
  const center = Math.floor(letters.length / 2);

  return (
    <div className="relative py-16 px-4 w-full h-[250px] flex justify-center items-center overflow-hidden rounded-xl">
      <h2 className="flex flex-wrap justify-center text-4xl md:text-7xl font-black text-cyan-400 uppercase tracking-tighter">
        {letters.map((char, i) => {
          // Calculate distance from center to create outward shockwave
          const distance = Math.abs(center - i);
          
          return (
            <motion.span
              key={i}
              className="inline-block origin-center"
              animate={{ 
                scale: [1, 2.5, 1],
                filter: ["blur(0px)", "blur(12px)", "blur(0px)"],
                y: [0, -20, 0]
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity, 
                ease: "easeInOut",
                delay: distance * 0.1 
              }}
            >
              {char === " " ? "\u00A0" : char}
            </motion.span>
          );
        })}
      </h2>
    </div>
  );
};