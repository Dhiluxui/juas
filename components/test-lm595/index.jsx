import React, { useState } from 'react';

interface Props {
  // Original Props
  title?: string;
  description?: string;
  label?: string;
  variant?: "primary" | "secondary" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  accentColor?: string;
  onClick?: () => void;
  // New Layout & Behavior Props
  disabled?: boolean;
  className?: string;
  fullWidth?: boolean;
}

export default function App({
  title = "React Canvas",
  description = "Paste any component code to preview it instantly.",
  label = "Increment",
  variant = "primary",
  size = "md",
  accentColor = "#e5484d",
  onClick,
  disabled = false,
  className = "",
  fullWidth = false
}: Props) {
  const [count, setCount] = useState(0);

  const handleAction = () => {
    if (disabled) return;
    setCount(c => c + 1);
    if (onClick) onClick();
  };

  // Button Size Variants
  const sizeClasses = {
    sm: "h-9 px-4 text-xs",
    md: "h-11 px-6 text-sm",
    lg: "h-14 px-8 text-base",
  }[size];

  // Button Style Variants
  const variantClasses = {
    primary: "bg-white hover:bg-zinc-200 text-black border-transparent shadow-[0_0_20px_rgba(255,255,255,0.2)]",
    secondary: "bg-zinc-800 hover:bg-zinc-700 text-white border-transparent",
    ghost: "bg-transparent hover:bg-zinc-800 text-white border-transparent",
    outline: "bg-transparent hover:bg-zinc-800 text-white border border-zinc-600",
  }[variant];

  // Layout Logic
  const widthClass = fullWidth ? "w-full" : "w-full max-w-md";
  const disabledClasses = disabled ? "opacity-50 cursor-not-allowed" : "active:scale-95";

  return (
    <div className={`p-8 bg-base rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-subtle relative overflow-hidden group ${widthClass} ${className}`.trim()}>
      
      {/* Dynamic Background Gradient */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at top, ${accentColor}20, transparent 50%)`
        }} 
      />
      
      {/* Text Content */}
      <h1 className="text-2xl font-bold text-primary mb-2 tracking-tight">
        {title}
      </h1>
      <p className="text-secondary mb-8 font-medium">
        {description}
      </p>
      
      {/* Dynamic Button */}
      <button 
        onClick={handleAction}
        disabled={disabled}
        className={`${sizeClasses} ${variantClasses} ${disabledClasses} font-bold rounded-full transition-all z-10 relative`}
      >
        {label === "Increment" ? `Increment: ${count}` : label}
      </button>
      
    </div>
  );
}