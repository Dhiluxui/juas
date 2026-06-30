import { useEffect, useState } from "react";
import { generateRandomChars } from "../../utils/math/physics";
import { motion } from "framer-motion";

export const DecryptedMatrixText = ({ text = "ACCESS GRANTED", duration = 2 }: { text?: string, duration?: number }) => {
  const [displayText, setDisplayText] = useState(text);

  useEffect(() => {
    let iteration = 0;
    // Assume 60 frames per second for high-refresh decryption math
    const totalFrames = (duration * 60); 
    let animationFrame: number;

    const decode = () => {
      setDisplayText((current) => {
        return current
          .split("")
          .map((letter, index) => {
            if (index < iteration) {
              return text[index];
            }
            return generateRandomChars(1);
          })
          .join("");
      });
      
      if (iteration >= text.length) {
        cancelAnimationFrame(animationFrame);
        return;
      }
      
      // Control speed by incrementing iteration fractionally
      iteration += (text.length / totalFrames);
      animationFrame = requestAnimationFrame(decode);
    };

    animationFrame = requestAnimationFrame(decode);

    return () => cancelAnimationFrame(animationFrame);
  }, [text, duration]);

  return (
    <motion.h2 
      className="text-4xl md:text-6xl font-mono font-bold text-green-500 tracking-widest drop-shadow-[0_0_15px_rgba(34,197,94,0.4)]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {displayText}
    </motion.h2>
  );
};