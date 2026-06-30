import { motion } from "framer-motion";

export const MagneticSqueezeText = ({ text = "SQUEEZE", duration = 0.5, splitType = "chars" }: any) => {
  const elements = splitType === "words" ? text.split(" ") : Array.from(text);

  return (
    <h2 className={`text-4xl md:text-6xl font-black text-rose-500 flex flex-wrap py-2 px-1 group ${splitType === 'words' ? 'gap-2' : ''}`}>
      {elements.map((el, index) => (
        <motion.span
          key={index}
          whileHover={{ scale: 1.4, zIndex: 10, margin: "0 -8px" }}
          transition={{ type: "spring", stiffness: 500, damping: 15 }}
          className="inline-block relative cursor-pointer"
          style={{ originY: 1 }}
        >
          {el === " " && splitType === "chars" ? "\u00A0" : el}
        </motion.span>
      ))}
    </h2>
  );
};