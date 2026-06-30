import { motion } from "framer-motion";

export const ElasticStretchText = ({ text = "STRETCH", duration = 0.5, splitType = "chars" }: any) => {
  const elements = splitType === "words" ? text.split(" ") : Array.from(text);

  return (
    <h2 className={`text-4xl md:text-6xl font-black text-fuchsia-400 flex flex-wrap py-2 px-1 ${splitType === 'words' ? 'gap-2' : ''}`}>
      {elements.map((el, index) => (
        // The outer motion.span retains a stable, unscaled hit-box for the mouse hover
        // This physically prevents the violent stuttering bug when scaleX shrinks the bounding box.
        <motion.span
          key={index}
          whileHover="hover"
          initial="rest"
          animate="rest"
          className="inline-block relative cursor-pointer px-[2px]"
        >
          {/* Inner motion.span handles the visual transformation responding to the parent's hover state */}
          <motion.span
            variants={{
              rest: { scaleY: 1, scaleX: 1 },
              hover: { scaleY: 2.5, scaleX: 0.7 }
            }}
            transition={{ type: "spring", stiffness: 400, damping: 10 }}
            className="inline-block origin-bottom"
          >
            {el === " " && splitType === "chars" ? "\u00A0" : el}
          </motion.span>
        </motion.span>
      ))}
    </h2>
  );
};