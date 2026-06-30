import { motion } from "framer-motion";

export const NewtonCradleText = ({ text = "CRADLE", duration = 0.5, splitType = "chars" }: any) => {
  const elements = splitType === "words" ? text.split(" ") : Array.from(text);

  return (
    <h2 className={`text-4xl md:text-6xl font-black text-neutral-300 flex py-2 px-1 ${splitType === 'words' ? 'gap-2' : ''}`}>
      {elements.map((el, index) => {
        const isFirst = index === 0;
        const isLast = index === elements.length - 1;

        let animation = {};
        if (isFirst) {
          animation = {
            rotate: [0, 45, 0, 0, 0],
            transformOrigin: "top center",
            transition: { duration: 1.5, repeat: Infinity, times: [0, 0.2, 0.4, 0.5, 1], ease: "easeInOut" }
          };
        } else if (isLast) {
          animation = {
            rotate: [0, 0, 0, -45, 0],
            transformOrigin: "top center",
            transition: { duration: 1.5, repeat: Infinity, times: [0, 0.4, 0.5, 0.7, 1], ease: "easeInOut" }
          };
        }

        return (
          <motion.span
            key={index}
            animate={animation}
            className="inline-block"
          >
            {el === " " && splitType === "chars" ? "\u00A0" : el}
          </motion.span>
        );
      })}
    </h2>
  );
};