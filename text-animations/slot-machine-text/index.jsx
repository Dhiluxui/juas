import { motion } from "framer-motion";
import { useState } from "react";

export const SlotMachineText = ({ text = "JACKPOT", duration = 2, splitType = "chars" }: any) => {
  const elements = splitType === "words" ? text.split(" ") : Array.from(text);

  return (
    <h2 className={`text-4xl md:text-6xl font-black text-amber-400 flex flex-wrap py-2 px-1 ${splitType === 'words' ? 'gap-2' : ''}`}>
      {elements.map((el, index) => (
        // Key uniquely destroys and remounts the component on text change
        <SlotElement key={`${index}-${text}`} target={el} delay={index * 0.15} duration={duration} />
      ))}
    </h2>
  );
};

const SlotElement = ({ target, delay, duration }: any) => {
  if (target === " ") return <span>&nbsp;</span>;
  
  // Calculate column synchronously on first render
  const [column] = useState(() => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    const generateRandomString = (length: number) => 
      Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
    
    const col = Array.from({ length: 20 }, () => generateRandomString(target.length));
    col.push(target);
    return col;
  });

  // Calculate perfect percentage offset for Framer Motion to prevent subpixel layout errors
  const yOffset = ((column.length - 1) / column.length) * 100;

  return (
    <span className="relative inline-block overflow-hidden align-bottom">
      {/* 
        The invisible target forces the exact mathematical bounding box.
        Added inline-block and py-2 padding buffer to strictly prevent 
        descender/ascender clipping from overflow-hidden.
      */}
      <span className="opacity-0 whitespace-pre inline-block py-2">{target}</span>
      
      {/* Absolute spinning column pinned to the forced width and height */}
      <motion.span
        initial={{ y: "0%" }}
        animate={{ y: `-${yOffset}%` }}
        transition={{ duration: duration, ease: [0.16, 1, 0.3, 1], delay: delay }}
        className="absolute top-0 left-0 right-0 flex flex-col items-center justify-start"
      >
        {column.map((char, i) => (
          // Matching py-2 padding buffer on every slot element
          <span key={i} className="whitespace-pre inline-block py-2">
            {char}
          </span>
        ))}
      </motion.span>
    </span>
  );
};