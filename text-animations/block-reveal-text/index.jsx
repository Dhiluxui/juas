import { motion } from "framer-motion";

export const BlockRevealText = ({ text = "REVEALED" }: any) => {
  return (
    <div className="relative py-16 px-4 w-full h-[250px] rounded-xl flex justify-center items-center overflow-hidden">
      <div className="relative overflow-hidden inline-block text-center">
        <motion.h2 
          className="text-5xl md:text-8xl font-black text-white uppercase"
          animate={{ opacity: [0, 0, 1, 1, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear", times: [0, 0.39, 0.4, 0.8, 1] }}
        >
          {text}
        </motion.h2>
        
        {/* Sliding Block */}
        <motion.div 
          className="absolute top-0 left-0 bottom-0 bg-blue-600 z-10"
          animate={{ left: ["0%", "0%", "100%", "100%", "0%"], right: ["100%", "0%", "0%", "100%", "100%"] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", times: [0, 0.3, 0.6, 0.9, 1] }}
        />
      </div>
    </div>
  );
};