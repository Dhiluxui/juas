import { motion } from "framer-motion";

export const CardFlipCascadeText = ({ text = "CASCADE" }: any) => {
  const letters = Array.from(text);

  return (
    <div className="relative py-16 px-4 w-full h-[250px] flex justify-center items-center overflow-hidden rounded-xl" style={{ perspective: "1000px" }}>
      <h2 className="flex flex-wrap justify-center gap-1 md:gap-2">
        {letters.map((char, i) => (
          <motion.div
            key={i}
            className="relative w-12 h-16 md:w-20 md:h-28"
            style={{ transformStyle: "preserve-3d" }}
            animate={{ rotateY: [0, 180, 360] }}
            transition={{ 
              duration: 3, 
              repeat: Infinity, 
              ease: "easeInOut",
              delay: i * 0.15 
            }}
          >
            {/* Front of card */}
            <div 
              className="absolute inset-0 flex justify-center items-center bg-zinc-800 border border-zinc-700 rounded-md text-3xl md:text-5xl font-black text-white uppercase"
              style={{ backfaceVisibility: "hidden" }}
            >
              {char}
            </div>
            
            {/* Back of card */}
            <div 
              className="absolute inset-0 flex justify-center items-center bg-indigo-600 border border-indigo-500 rounded-md text-3xl md:text-5xl font-black text-white uppercase"
              style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
            >
              {char}
            </div>
          </motion.div>
        ))}
      </h2>
    </div>
  );
};