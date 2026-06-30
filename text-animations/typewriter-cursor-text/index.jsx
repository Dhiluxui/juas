import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export const TypewriterCursorText = ({ text = "TERMINAL", duration = 2, splitType = "chars" }: any) => {
  const [displayedText, setDisplayedText] = useState("");
  
  useEffect(() => {
    let i = 0;
    setDisplayedText("");
    
    const timePerChar = text.length > 0 ? (duration * 1000) / text.length : 100;
    
    const interval = setInterval(() => {
      setDisplayedText(text.slice(0, i + 1));
      i++;
      if (i >= text.length) clearInterval(interval);
    }, timePerChar);
    
    return () => clearInterval(interval);
  }, [text, duration]);

  return (
    <h2 className="text-4xl md:text-6xl font-black text-green-400 py-2 px-1 font-mono flex items-center">
      <span>{displayedText}</span>
      <motion.span
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.8, repeat: Infinity, ease: "steps(2)" }}
        className="inline-block w-[0.5em] h-[1em] bg-green-400 ml-1 align-middle"
      />
    </h2>
  );
};