import React, { useState } from 'react';

// --- UTILITIES ---
// Lightweight class merger for standalone usage without dependencies
const cn = (...classes) => classes.filter(Boolean).join(' ');

// --- METAL BUTTON IMPLEMENTATION ---

const metalColorVariants = {
  blue: {
    outer: "bg-gradient-to-b from-[#1e3a8a] to-[#0f172a]",
    inner: "bg-gradient-to-b from-[#60a5fa] via-[#2563eb] to-[#1d4ed8]",
    button: "bg-gradient-to-b from-[#3b82f6] to-[#1d4ed8]",
    textColor: "text-white",
    textShadow: "0 -1px 0 rgba(0,0,0,0.5)",
  }
};

const MetalButton = React.forwardRef(({ 
  children, 
  className, 
  variant = "blue", 
  ...props 
}, ref) => {
  const [isPressed, setIsPressed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  // Default to blue if an invalid variant is passed
  const colors = metalColorVariants[variant] || metalColorVariants.blue;

  return (
    <div 
      className={cn(
        "relative inline-flex rounded-xl p-[2px] transition-all duration-300",
        colors.outer,
        isPressed ? "scale-[0.98]" : "scale-100",
        isHovered && !isPressed ? "shadow-[0_0_20px_rgba(255,255,255,0.1)]" : ""
      )}
    >
      {/* Inner Bevel / Rim Light */}
      <div className={cn(
        "absolute inset-[1px] rounded-lg opacity-80", 
        colors.inner
      )} />
      
      <button
        ref={ref}
        className={cn(
          "relative z-10 m-[1px] inline-flex h-12 min-w-[140px] items-center justify-center overflow-hidden rounded-lg px-6 text-sm font-bold uppercase tracking-wider outline-none transition-all duration-200",
          colors.button,
          colors.textColor,
          className
        )}
        style={{ textShadow: colors.textShadow }}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        onMouseLeave={() => { setIsPressed(false); setIsHovered(false); }}
        onMouseEnter={() => setIsHovered(true)}
        onTouchStart={() => setIsPressed(true)}
        onTouchEnd={() => setIsPressed(false)}
        {...props}
      >
        {/* Animated Shine Effect on Hover */}
        <div className={cn(
          "pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-1000",
          isHovered ? "translate-x-full" : ""
        )} />
        
        {/* Top Edge Highlight for depth */}
        <div className="absolute top-0 left-0 w-full h-[1px] bg-white/30" />
        
        {/* Button Content */}
        <span className="relative z-20 flex items-center gap-2">
          {children}
        </span>
      </button>
    </div>
  );
});

MetalButton.displayName = "MetalButton";

// --- SHOWCASE APP ---

const App = () => {
  return (
      
      <div className="relative z-10 w-full flex items-center justify-center">
        <MetalButton variant="blue" className="w-[240px] text-base h-14">
          Cobalt
        </MetalButton>
      </div>
  );
};

export default App;