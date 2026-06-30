import { motion } from "framer-motion";

export const LiquidFillText = ({ text = "AQUAMARINE", duration = 2, splitType = "chars" }: any) => {
  return (
    <h2 className="text-4xl md:text-6xl font-black relative py-2 px-1">
      {/* Outline text anchor */}
      <span className="text-transparent absolute z-0" style={{ WebkitTextStroke: "2px rgba(6, 182, 212, 0.4)" }}>
        {text}
      </span>
      
      {/* Animated Liquid Wave Fill via SVG background string */}
      <motion.span
        initial={{ backgroundPosition: "0% 100%" }}
        animate={{ backgroundPosition: "100% 0%" }}
        transition={{ duration: duration * 1.5, ease: "linear", repeat: Infinity }}
        className="text-transparent bg-clip-text relative z-10"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill='%2306b6d4' d='M0,100 C50,150 150,50 200,100 L200,200 L0,200 Z' /%3E%3C/svg%3E")`,
          backgroundSize: "200% 200%",
          backgroundRepeat: "repeat-x",
          WebkitBackgroundClip: "text",
          color: "transparent"
        }}
      >
        {text}
      </motion.span>
    </h2>
  );
};