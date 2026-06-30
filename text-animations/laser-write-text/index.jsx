import { motion } from "framer-motion";

export const LaserWriteText = ({ text = "LASER", duration = 1.5, splitType = "chars" }: any) => {
  const elements = splitType === "words" ? text.split(" ") : Array.from(text);

  // Distribute the total duration across elements for sequential writing
  const stagger = duration / (elements.length + 1);
  const elementDuration = duration * 0.4;

  return (
    <h2 className={`text-4xl md:text-6xl font-black text-emerald-400 flex flex-wrap py-2 px-1 ${splitType === 'words' ? 'gap-2' : ''}`}>
      {elements.map((el, index) => (
        <span key={index} className="relative inline-block pb-1">
          {/* 
            Laser beam pointer. 
            Fixed: Using 'left' percentages perfectly synchronizes with the clip-path polygon edges.
            Added opacity fade-in/out for a clean ignition/extinguish effect.
          */}
          {el !== " " && (
            <motion.div
              initial={{ left: "0%", opacity: 0 }}
              animate={{ left: "100%", opacity: [0, 1, 1, 0] }}
              transition={{ duration: elementDuration, delay: index * stagger, ease: "linear" }}
              className="absolute top-0 bottom-0 w-[2px] bg-white shadow-[0_0_15px_3px_rgba(255,255,255,0.8),0_0_30px_8px_rgba(52,211,153,0.8)] z-20"
            />
          )}
          {/* Hidden text revealed by clip-path trailing the laser */}
          <motion.span
            initial={{ clipPath: "polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)" }}
            animate={{ clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)" }}
            transition={{ duration: elementDuration, delay: index * stagger, ease: "linear" }}
            className="inline-block relative z-10"
          >
            {el === " " && splitType === "chars" ? "\u00A0" : el}
          </motion.span>
        </span>
      ))}
    </h2>
  );
};