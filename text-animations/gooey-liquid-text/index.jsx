import { motion } from "framer-motion";

export const GooeyLiquidText = ({ text = "LIQUID CHROME", duration = 2, splitType = "chars" }: any) => {
  const elements = splitType === "words" ? text.split(" ") : Array.from(text);

  return (
    <>
      {/* Hidden SVG Filter for Advanced Gooey Effect */}
      <svg className="hidden">
        <defs>
          <filter id="goo-text">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="goo" />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
      </svg>

      <h2 
        className={`text-4xl md:text-6xl font-black text-rose-500 flex flex-wrap py-2 px-1 justify-center ${splitType === 'words' ? 'gap-2' : ''}`}
        style={{ filter: "url(#goo-text)" }}
      >
        {elements.map((el, index) => (
          <motion.span
            key={index}
            initial={{ y: 50, opacity: 0, scale: 0.5 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{ 
              type: "spring", 
              stiffness: 150, 
              damping: 10,
              delay: index * 0.1 
            }}
            whileHover={{ y: -20, scale: 1.2, transition: { duration: 0.2 } }}
            className="inline-block cursor-pointer"
          >
            {el === " " && splitType === "chars" ? "\u00A0" : el}
          </motion.span>
        ))}
      </h2>
    </>
  );
};