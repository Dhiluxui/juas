import React, { useState } from "react";

// Simplified tailwind class merger
const cn = (...classes: (string | undefined | null | false)[]) => {
  return classes.filter(Boolean).join(" ");
};

export interface CyberButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  primaryColor?: string;
  secondaryColor?: string;
}

export const CyberButton = ({
  children,
  className,
  primaryColor = "#00E8ED",
  secondaryColor = "#FF008B",
  ...props
}: CyberButtonProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isActive, setIsActive] = useState(false);

  const buttonPath = "M 15 2 L 185 2 L 198 15 L 198 45 L 185 58 L 15 58 L 2 45 L 2 15 Z";
  
  return (
    <button
      className={cn(
        "relative group outline-none transition-transform duration-100 ease-out",
        isActive ? "scale-95" : isHovered ? "scale-105" : "scale-100",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsActive(false);
      }}
      onMouseDown={() => setIsActive(true)}
      onMouseUp={() => setIsActive(false)}
      {...props}
      style={{ width: "200px", height: "60px", ...props.style }}
    >
      <style>
        {`
          .cyber-tracer { animation: dash-spin 3s linear infinite; }
          .cyber-tracer-reverse { animation: dash-spin-reverse 4s linear infinite; }
          @keyframes dash-spin { from { stroke-dashoffset: 100; } to { stroke-dashoffset: 0; } }
          @keyframes dash-spin-reverse { from { stroke-dashoffset: 0; } to { stroke-dashoffset: 100; } }
          .glitch-text { text-shadow: ${isHovered ? `0 0 10px ${primaryColor}, 0 0 20px ${secondaryColor}` : 'none'}; transition: text-shadow 0.3s ease; }
        `}
      </style>

      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl pointer-events-none"
        style={{ background: `linear-gradient(90deg, ${primaryColor}40, ${secondaryColor}40)` }} 
      />

      <svg className="absolute inset-0 w-full h-full drop-shadow-lg" viewBox="0 0 200 60" fill="none">
        <defs>
          <linearGradient id={`grad-${primaryColor}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={primaryColor} />
            <stop offset="100%" stopColor={secondaryColor} />
          </linearGradient>
          <pattern id="grid-pattern" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
          </pattern>
        </defs>

        <path d={buttonPath} fill="#111111" stroke="#333333" strokeWidth="1" className="transition-colors duration-300 group-hover:fill-[#1a1a1a]" />
        <path d={buttonPath} fill="url(#grid-pattern)" opacity={isHovered ? 1 : 0.3} className="transition-opacity duration-300" />
        <path d="M 15 2 L 25 2 M 15 58 L 25 58 M 175 2 L 185 2 M 175 58 L 185 58" stroke={primaryColor} strokeWidth="2" opacity="0.5" />
        
        <g strokeWidth="2" fill="none" strokeDasharray="15 85" pathLength="100">
          <path className="cyber-tracer" d={buttonPath} stroke={primaryColor} opacity={isHovered ? 1 : 0.4} />
          <path className="cyber-tracer-reverse" d={buttonPath} stroke={secondaryColor} strokeDashoffset="50" opacity={isHovered ? 1 : 0.2} />
        </g>

        <path d={buttonPath} stroke={`url(#grad-${primaryColor})`} strokeWidth="2" opacity={isHovered ? 1 : 0} className="transition-opacity duration-300" />
      </svg>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="glitch-text font-bold tracking-[0.2em] text-sm uppercase text-white/90 group-hover:text-white transition-colors z-10">
          {children}
        </span>
      </div>
    </button>
  );
};

export default function App() {
  return (
    <div className="min-w-screen min-h-screen flex items-center justify-center">
      <CyberButton onClick={() => console.log('Action Triggered')}>
        Action
      </CyberButton>
    </div>
  );
}