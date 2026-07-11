import { motion } from "framer-motion";

export const PeelingStickerText = ({ text = "PEEL ME" }: any) => {
  const letters = Array.from(text);

  return (
    <div className="relative w-full py-16 flex justify-center items-center bg-neutral-100 rounded-xl overflow-hidden border border-neutral-200">
      <h2 className="text-5xl md:text-8xl font-black text-neutral-900 flex flex-wrap justify-center gap-2" style={{ perspective: "1000px" }}>
        {letters.map((char, i) => (
          <motion.span
            key={i}
            className="relative inline-block cursor-pointer bg-neutral-900 text-white px-3 py-1 rounded-sm origin-bottom-right"
            whileHover={{ 
              rotateX: 30, 
              rotateY: -30, 
              rotateZ: -5,
              scale: 1.05,
              boxShadow: "-15px 20px 20px rgba(0,0,0,0.3)" 
            }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
          >
            {/* Faux sticky back exposed on hover using an absolute gradient */}
            <motion.div 
              className="absolute inset-0 opacity-0 bg-gradient-to-tr from-white/30 to-transparent pointer-events-none rounded-sm mix-blend-screen"
              whileHover={{ opacity: 1 }}
            />
            {char === " " ? "\u00A0" : char}
          </motion.span>
        ))}
      </h2>
    </div>
  );
};