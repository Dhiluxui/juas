import React from 'react';

export default function CyberpunkButton() {
  return (
    <button className="relative group overflow-hidden px-8 py-4 font-bold text-white bg-[#050505] border border-cyan-500/30 uppercase tracking-widest text-sm transition-all hover:bg-cyan-500/10 hover:border-cyan-400">
      <span className="absolute inset-0 w-full h-full -translate-x-full group-hover:animate-[glitch_0.4s_cubic-bezier(0.25,0.46,0.45,0.94)_both] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent skew-x-12" />
      <span className="relative z-10 flex items-center gap-2">
        <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        Initialize System
      </span>
      {/* Corner decorations */}
      <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-cyan-400 opacity-50 group-hover:opacity-100 transition-opacity" />
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-cyan-400 opacity-50 group-hover:opacity-100 transition-opacity" />
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes glitch {
          0% { transform: translateX(-100%) skewX(12deg); }
          100% { transform: translateX(200%) skewX(12deg); }
        }
      `}} />
    </button>
  );
}