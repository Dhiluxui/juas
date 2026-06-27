import React, { useState } from 'react';

export default function GlassLoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div className="w-full max-w-md p-8 rounded-[24px] bg-black/40 backdrop-blur-xl border border-white/10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute -top-32 -left-32 w-64 h-64 bg-purple-500/30 rounded-full blur-[80px]" />
      <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-cyan-500/30 rounded-full blur-[80px]" />
      
      <div className="relative z-10 flex flex-col gap-8">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Welcome back</h2>
          <p className="text-white/50 text-sm mt-2">Enter your credentials to access your account.</p>
        </div>

        <form className="flex flex-col gap-5" onSubmit={e => e.preventDefault()}>
          {/* Email Input */}
          <div className="relative group">
            <input 
              type="email" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 pt-6 pb-2 text-white outline-none focus:border-purple-500/50 focus:bg-white/10 transition-all peer"
              required 
            />
            <label className={\`absolute left-4 transition-all duration-300 pointer-events-none \${email ? 'top-2 text-[10px] text-purple-400' : 'top-4 text-sm text-white/40 peer-focus:top-2 peer-focus:text-[10px] peer-focus:text-purple-400'}\`}>
              Email address
            </label>
          </div>

          {/* Password Input */}
          <div className="relative group">
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 pt-6 pb-2 text-white outline-none focus:border-cyan-500/50 focus:bg-white/10 transition-all peer"
              required 
            />
            <label className={\`absolute left-4 transition-all duration-300 pointer-events-none \${password ? 'top-2 text-[10px] text-cyan-400' : 'top-4 text-sm text-white/40 peer-focus:top-2 peer-focus:text-[10px] peer-focus:text-cyan-400'}\`}>
              Password
            </label>
          </div>

          <div className="flex items-center justify-between mt-1">
            <label className="flex items-center gap-2 text-xs text-white/60 cursor-pointer hover:text-white transition-colors">
              <input type="checkbox" className="rounded border-white/20 bg-transparent accent-purple-500" />
              Remember me
            </label>
            <a href="#" className="text-xs text-purple-400 hover:text-purple-300 transition-colors">Forgot password?</a>
          </div>

          <button type="submit" className="mt-4 w-full py-3.5 rounded-xl bg-white text-black font-bold text-sm hover:bg-gray-200 hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)]">
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}