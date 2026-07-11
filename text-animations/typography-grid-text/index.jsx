import { motion } from "framer-motion";

export const TypographyGridText = ({ text = "GRID" }: any) => {
  return (
    <div className="relative py-12 px-4 w-full min-h-[350px] flex justify-center items-center rounded-xl overflow-hidden">
      <motion.div 
        className="grid grid-cols-3 grid-rows-3 gap-2 md:gap-6 w-full max-w-[800px] justify-items-center items-center cursor-pointer p-8"
        whileHover="hover"
        initial="rest"
      >
        {Array.from({ length: 9 }).map((_, i) => {
          const isCenter = i === 4;
          return (
            <motion.h2
              key={i}
              className={`text-xl md:text-4xl font-black uppercase whitespace-nowrap ${isCenter ? 'text-indigo-400' : 'text-neutral-700'}`}
              variants={{
                rest: { scale: 1, opacity: isCenter ? 1 : 0.4, x: 0, y: 0 },
                hover: { 
                  scale: isCenter ? 2.5 : 0.6, 
                  opacity: isCenter ? 1 : 0.1,
                  x: i % 3 === 0 ? -60 : i % 3 === 2 ? 60 : 0,
                  y: i < 3 ? -60 : i > 5 ? 60 : 0
                }
              }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
            >
              {text}
            </motion.h2>
          );
        })}
      </motion.div>
    </div>
  );
};