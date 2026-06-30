import { motion } from "framer-motion";

export const ShreddedText = ({ text = "SHREDDED", duration = 1.5, splitType = "chars" }: any) => {
  const slices = 6; 
  
  return (
    <h2 className="text-4xl md:text-6xl font-black text-purple-400 py-2 px-1 relative overflow-hidden">
      <span className="opacity-0">{text}</span>
      
      {Array.from({ length: slices }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ x: i % 2 === 0 ? "-100%" : "100%" }}
          animate={{ x: "0%" }}
          transition={{ duration: duration, type: "spring", bounce: 0.2, delay: i * 0.1 }}
          className="absolute left-0 top-0 w-full whitespace-nowrap"
          style={{ 
            clipPath: `inset(${(i * 100) / slices}% 0 ${100 - ((i + 1) * 100) / slices}% 0)`
          }}
        >
          {text}
        </motion.div>
      ))}
    </h2>
  );
};