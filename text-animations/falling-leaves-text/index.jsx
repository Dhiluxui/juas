import { motion } from "framer-motion";

export const FallingLeavesText = ({ text = "AUTUMN", duration = 2, splitType = "chars" }: any) => {
  const elements = splitType === "words" ? text.split(" ") : Array.from(text);

  return (
    <h2 className={`text-4xl md:text-6xl font-black text-orange-400 flex flex-wrap py-2 px-1 ${splitType === 'words' ? 'gap-2' : ''}`} style={{ perspective: "1000px" }}>
      {elements.map((el, index) => (
        <motion.span
          key={index}
          initial={{ y: -100, opacity: 0, rotateX: 90, rotateY: 45, rotateZ: 45 }}
          animate={{ y: 0, opacity: 1, rotateX: 0, rotateY: 0, rotateZ: 0 }}
          transition={{ 
            duration: duration, 
            delay: index * 0.1, 
            type: "spring", 
            stiffness: 50, 
            damping: 12 
          }}
          className="inline-block"
          style={{ transformStyle: "preserve-3d" }}
        >
          {el === " " && splitType === "chars" ? "\u00A0" : el}
        </motion.span>
      ))}
    </h2>
  );
};