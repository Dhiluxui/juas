import React from 'react';

export default function GlowingGlassCard() {
  return (
    <div className="relative group p-8 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] overflow-hidden transition-all hover:shadow-[0_8px_32px_0_rgba(255,106,111,0.2)] hover:border-white/20">
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      <div className="absolute -inset-px bg-gradient-to-r from-[#e5484d] to-[#ff6a6f] rounded-2xl opacity-0 group-hover:opacity-20 blur-md transition-opacity duration-500" />
      
      <div className="relative z-10 flex flex-col gap-4">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#e5484d] to-[#ff6a6f] p-0.5 shadow-[0_0_15px_rgba(229,72,77,0.5)]">
          <div className="w-full h-full bg-[#111] rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-[#ff6a6f]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>
        
        <h3 className="text-xl font-bold text-white tracking-tight">Glowing Glass</h3>
        <p className="text-sm text-white/60 leading-relaxed">
          A premium glassmorphic card with a subtle animated gradient glow effect on hover. Perfect for featuring premium content.
        </p>
        
        <button className="mt-2 text-sm font-semibold text-[#ff6a6f] hover:text-white flex items-center gap-1 transition-colors w-fit">
          Learn more 
          <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}