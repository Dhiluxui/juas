import React, { useState, useRef } from "react";

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
  const [transform, setTransform] = useState("");
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const buttonPath = "M 15 2 H 140 L 150 12 H 185 L 198 25 V 45 L 185 58 H 60 L 50 48 H 15 L 2 35 V 15 Z";

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -20;
    const rotateY = ((x - centerX) / centerX) * 20;
    
    setTransform(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.05, 1.05, 1.05)`);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setIsActive(false);
    setTransform("");
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (200 / rect.width);
    const y = (e.clientY - rect.top) * (60 / rect.height);

    const newRipple = { id: Date.now(), x, y };
    setRipples((prev) => [...prev, newRipple]);

    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
    }, 800);

    if (props.onClick) props.onClick(e);
  };
  
  return (
    <button
      ref={buttonRef}
      className={cn(
        "relative group outline-none transition-transform duration-300 ease-out",
        isActive ? "scale-[0.95]" : "scale-100",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseDown={() => setIsActive(true)}
      onMouseUp={() => setIsActive(false)}
      onClick={handleClick}
      {...props}
      style={{ 
        width: "200px", 
        height: "60px", 
        transform: isHovered && !isActive ? transform : isActive ? `${transform} scale3d(0.95, 0.95, 0.95)` : "",
        transformStyle: "preserve-3d",
        ...props.style 
      }}
    >
      <style>
        {`
          .cyber-tracer { animation: dash-spin 4s linear infinite; }
          .cyber-tracer-reverse { animation: dash-spin-reverse 5s linear infinite; }
          @keyframes dash-spin { from { stroke-dashoffset: 200; } to { stroke-dashoffset: 0; } }
          @keyframes dash-spin-reverse { from { stroke-dashoffset: 0; } to { stroke-dashoffset: 200; } }
          .scanner-beam { animation: scan-sweep 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
          @keyframes scan-sweep { 0% { transform: translateX(-100%) skewX(-15deg); } 100% { transform: translateX(200%) skewX(-15deg); } }
          .data-stream { animation: stream-fall linear infinite; }
          @keyframes stream-fall { 0% { transform: translateY(-60px); } 100% { transform: translateY(60px); } }
          .ripple-anim { animation: ripple-expand 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards; }
          @keyframes ripple-expand { 0% { r: 0; opacity: 1; stroke-width: 4; } 100% { r: 150; opacity: 0; stroke-width: 0; } }
          .text-glitch-layer-1 { animation: glitch-1 2s linear infinite alternate; }
          .text-glitch-layer-2 { animation: glitch-2 2.5s linear infinite alternate-reverse; }
          @keyframes glitch-1 { 0%, 10%, 20%, 30%, 100% { clip-path: inset(0 0 0 0); transform: translate(0, 0); } 15% { clip-path: inset(20% 0 80% 0); transform: translate(-2px, 1px); } 25% { clip-path: inset(60% 0 10% 0); transform: translate(2px, -1px); } }
          @keyframes glitch-2 { 0%, 10%, 20%, 30%, 100% { clip-path: inset(0 0 0 0); transform: translate(0, 0); } 12% { clip-path: inset(10% 0 60% 0); transform: translate(2px, -1px); } 28% { clip-path: inset(80% 0 5% 0); transform: translate(-2px, 1px); } }
        `}
      </style>

      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl pointer-events-none -z-10"
        style={{ 
          background: `linear-gradient(135deg, ${primaryColor}60, ${secondaryColor}60)`,
          transform: "translateZ(-20px)"
        }} 
      />

      <svg
        className="absolute inset-0 w-full h-full drop-shadow-lg"
        viewBox="0 0 200 60"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ transform: "translateZ(0px)" }}
      >
        <defs>
          <linearGradient id={`grad-${primaryColor}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={primaryColor} />
            <stop offset="100%" stopColor={secondaryColor} />
          </linearGradient>
          <linearGradient id="scanner-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="50%" stopColor={primaryColor} stopOpacity="0.4" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
          <linearGradient id="stream-grad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="50%" stopColor={primaryColor} stopOpacity="0.8" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
          <pattern id="hex-pattern" width="14" height="24" patternUnits="userSpaceOnUse" patternTransform="scale(0.5)">
             <path d="M7 0L14 4V12L7 16L0 12V4L7 0Z M7 24L14 20V12L7 16L0 20V24Z" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1"/>
          </pattern>
          <clipPath id="button-clip">
            <path d={buttonPath} />
          </clipPath>
        </defs>

        <g clipPath="url(#button-clip)">
          <rect width="200" height="60" fill="#09090b" className="transition-colors duration-300 group-hover:fill-[#111115]" />
          <rect width="200" height="60" fill="url(#hex-pattern)" className="opacity-40 group-hover:opacity-100 transition-opacity duration-500" />
          <g className={cn("transition-opacity duration-500", isHovered ? "opacity-100" : "opacity-0")}>
            <rect x="30" width="1" height="40" fill="url(#stream-grad)" className="data-stream" style={{ animationDuration: '1.2s', animationDelay: '0s' }} />
            <rect x="70" width="1.5" height="50" fill="url(#stream-grad)" className="data-stream" style={{ animationDuration: '1.5s', animationDelay: '0.4s' }} />
            <rect x="130" width="0.5" height="30" fill="url(#stream-grad)" className="data-stream" style={{ animationDuration: '0.9s', animationDelay: '0.2s' }} />
            <rect x="170" width="2" height="60" fill="url(#stream-grad)" className="data-stream" style={{ animationDuration: '1.8s', animationDelay: '0.7s' }} />
          </g>
          <g className={cn("transition-opacity duration-300", isHovered ? "opacity-100" : "opacity-0")}>
            <rect x="0" y="0" width="100" height="60" fill="url(#scanner-grad)" className="scanner-beam" style={{ mixBlendMode: 'screen' }} />
          </g>
          {ripples.map(ripple => (
            <circle
              key={ripple.id}
              cx={ripple.x}
              cy={ripple.y}
              r="0"
              fill="none"
              stroke="url(#grad-[#00E8ED])"
              className="ripple-anim"
              style={{ stroke: `url(#grad-${primaryColor})` }}
            />
          ))}
        </g>

        <path d={buttonPath} stroke="#27272a" strokeWidth="1.5" className="transition-colors duration-300 group-hover:stroke-[#3f3f46]" />
        <path d="M 135 2 H 145 M 55 58 H 65 M 2 20 V 30 M 198 30 V 40" stroke={primaryColor} strokeWidth="3" opacity="0.4" />
        <g strokeWidth="1.5" fill="none" strokeDasharray="20 180" pathLength="200">
          <path className="cyber-tracer" d={buttonPath} stroke={primaryColor} opacity={isHovered ? 1 : 0.5} strokeLinecap="round" />
          <path className="cyber-tracer-reverse" d={buttonPath} stroke={secondaryColor} strokeDashoffset="100" opacity={isHovered ? 1 : 0.3} strokeLinecap="round" />
        </g>
        <path d={buttonPath} stroke={`url(#grad-${primaryColor})`} strokeWidth="1.5" opacity={isHovered ? 1 : 0} className="transition-opacity duration-300" />
        <g className={cn("transition-all duration-500", isHovered ? "opacity-100" : "opacity-0")}>
          <path d="M 8 6 H 12 M 10 4 V 8" stroke={primaryColor} strokeWidth="0.5" />
          <path d="M 188 54 H 192 M 190 52 V 56" stroke={secondaryColor} strokeWidth="0.5" />
          <rect x="16" y="52" width="4" height="2" fill={primaryColor} />
          <rect x="22" y="52" width="12" height="2" fill={primaryColor} opacity="0.5" />
          <rect x="165" y="6" width="6" height="2" fill={secondaryColor} opacity="0.5" />
          <rect x="173" y="6" width="4" height="2" fill={secondaryColor} />
          <text x="38" y="54" fontSize="4" fill={primaryColor} letterSpacing="1" opacity="0.8" className="font-mono">SYS.RDY</text>
          <text x="140" y="8" fontSize="4" fill={secondaryColor} letterSpacing="1" opacity="0.8" className="font-mono">0xA9F</text>
        </g>
      </svg>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden" style={{ transform: "translateZ(20px)" }}>
        <span className={cn("absolute text-2xl font-light transition-all duration-300 ease-out delay-75", isHovered ? "left-8 opacity-100 scale-100" : "left-0 opacity-0 scale-75")} style={{ color: primaryColor, textShadow: `0 0 10px ${primaryColor}` }}>[</span>
        <div className="relative flex items-center justify-center">
          {isHovered && (
            <>
              <span className="absolute font-bold tracking-[0.25em] text-sm uppercase z-0 text-glitch-layer-1 mix-blend-screen" style={{ color: primaryColor }}>{children}</span>
              <span className="absolute font-bold tracking-[0.25em] text-sm uppercase z-0 text-glitch-layer-2 mix-blend-screen" style={{ color: secondaryColor }}>{children}</span>
            </>
          )}
          <span className="font-bold tracking-[0.25em] text-sm uppercase text-white/70 group-hover:text-white transition-colors z-10 drop-shadow-md" style={{ textShadow: isHovered ? `0 0 8px ${primaryColor}80` : 'none' }}>{children}</span>
        </div>
        <span className={cn("absolute text-2xl font-light transition-all duration-300 ease-out delay-75", isHovered ? "right-8 opacity-100 scale-100" : "right-0 opacity-0 scale-75")} style={{ color: secondaryColor, textShadow: `0 0 10px ${secondaryColor}` }}>]</span>
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