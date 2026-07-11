import { motion } from "framer-motion";

export const PerspectiveFoldText = ({ text = "FOLDING", splitType = "chars" }: any) => {
  const elements = splitType === "words" ? text.split(" ") : Array.from(text);

  return (
    <h2 className="text-4xl md:text-6xl font-black text-amber-500 flex gap-1 py-4 px-2" style={{ perspective: "800px" }}>
      {elements.map((el, index) => {
        const isLeft = index < elements.length / 2;
        return (
          <motion.span
            key={index}
            initial={{ rotateY: isLeft ? 90 : -90, opacity: 0, scale: 0.8 }}
            whileInView={{ rotateY: 0, opacity: 1, scale: 1 }}
            viewport={{ once: false, amount: 0.5 }}
            transition={{
              duration: 0.8,
              delay: Math.abs(index - elements.length / 2) * 0.1, // Center folds out first
              type: "spring",
              bounce: 0.4
            }}
            style={{ transformOrigin: isLeft ? "right center" : "left center" }}
            className="inline-block"
          >
            {el === " " && splitType === "chars" ? "\u00A0" : el}
          </motion.span>
        );
      })}
    </h2>
  );
};