import React from 'react';

export default function QuantumLoader() {
  return (
    <div className="relative flex items-center justify-center w-32 h-32">
      <div className="absolute inset-0 border-t-2 border-r-2 border-[#ff6a6f] rounded-full animate-[spin_3s_linear_infinite]" />
      <div className="absolute inset-2 border-b-2 border-l-2 border-cyan-400 rounded-full animate-[spin_2s_linear_infinite_reverse]" />
      <div className="absolute inset-4 border-t-2 border-purple-500 rounded-full animate-[spin_1.5s_ease-in-out_infinite]" />
      
      {/* Core */}
      <div className="absolute w-4 h-4 bg-white rounded-full shadow-[0_0_20px_#fff,0_0_40px_#ff6a6f] animate-pulse" />
      
      {/* Particles */}
      <div className="absolute inset-0 animate-[spin_4s_linear_infinite]">
        <div className="absolute top-0 left-1/2 w-1.5 h-1.5 bg-cyan-300 rounded-full shadow-[0_0_10px_#06b6d4]" />
        <div className="absolute bottom-0 right-1/2 w-1.5 h-1.5 bg-purple-400 rounded-full shadow-[0_0_10px_#a855f7]" />
      </div>
    </div>
  );
}