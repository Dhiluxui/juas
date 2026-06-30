import { motion } from "framer-motion";

export const NeonFlickerText = ({ text = "NIGHTLIFE", duration = 2, splitType = "chars" }: any) => {
  const elements = splitType === "words" ? text.split(" ") : Array.from(text);

  return (
    <h2 className={`text-4xl md:text-6xl font-black text-transparent flex flex-wrap py-2 px-1 ${splitType === 'words' ? 'gap-2' : ''}`}>
      {elements.map((el, index) => {
        // Deterministic pseudo-randomness based on index for consistent SSR/hydration
        const isFaulty = (index % 3) === 0;
        const flickerKeyframes = isFaulty 
          ? [0.2, 1, 0.1, 1, 0.8, 0, 1, 1, 0.3, 1] 
          : [1];

        return (
          <motion.span
            key={`${index}-${text}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: flickerKeyframes }}
            transition={{ 
              duration: isFaulty ? 2.5 : 0.1, 
              repeat: isFaulty ? Infinity : 0,
              repeatType: "mirror",
              ease: "circInOut"
            }}
            className="inline-block text-pink-500"
            style={{ 
              textShadow: "0 0 5px #ec4899, 0 0 15px #ec4899, 0 0 30px #ec4899, 0 0 50px #ec4899" 
            }}
          >
            {el === " " && splitType === "chars" ? "\u00A0" : el}
          </motion.span>
        );
      })}
    </h2>
  );
};