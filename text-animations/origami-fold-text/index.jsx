import { motion } from "framer-motion";

export const OrigamiFoldText = ({ text = "FOLDING" }: any) => {
  const letters = Array.from(text);

  return (
    <div className="relative py-16 px-4 w-full min-h-[300px] flex justify-center items-center rounded-xl overflow-hidden" style={{ perspective: "1000px" }}>
      <h2 className="flex flex-wrap justify-center gap-1 text-5xl md:text-7xl font-black text-rose-900" style={{ transformStyle: "preserve-3d" }}>
        {letters.map((char, i) => (
          <motion.span
            key={i}
            className="inline-block origin-bottom bg-white shadow-md border border-neutral-200 p-2 rounded-sm"
            animate={{ 
              rotateX: [90, 0, 0, 90],
              opacity: [0, 1, 1, 0],
              y: [-20, 0, 0, -20]
            }}
            transition={{ 
              duration: 4, 
              repeat: Infinity, 
              delay: i * 0.15,
              times: [0, 0.2, 0.8, 1],
              ease: "easeInOut" 
            }}
          >
            {char === " " ? "\u00A0" : char}
          </motion.span>
        ))}
      </h2>
    </div>
  );
};