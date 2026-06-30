import { motion } from "framer-motion";

export const BlurryRevealText = ({ text = "FOCUS", duration = 1, splitType = "chars" }: any) => {
  const elements = splitType === "words" ? text.split(" ") : Array.from(text);

  return (
    <h2 className={`text-4xl md:text-6xl font-black text-neutral-100 flex flex-wrap py-2 px-1 ${splitType === 'words' ? 'gap-2' : ''}`}>
      {elements.map((el, index) => (
        <motion.span
          key={index}
          initial={{ filter: "blur(20px)", opacity: 0, scale: 1.5, x: 20 }}
          animate={{ filter: "blur(0px)", opacity: 1, scale: 1, x: 0 }}
          transition={{ duration: duration, delay: index * 0.08, ease: "easeOut" }}
          className="inline-block"
        >
          {el === " " && splitType === "chars" ? "\u00A0" : el}
        </motion.span>
      ))}
    </h2>
  );
};