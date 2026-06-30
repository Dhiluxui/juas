// ✦ Juas.dev Canvas
function App() {
  const [count, setCount] = React.useState(0);
  return (
    <div className="p-8 max-w-md w-full bg-[#111] rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-[#2d2d2d] relative overflow-hidden group">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(229,72,77,0.1),transparent_50%)] pointer-events-none" />
      <h1 className="text-2xl font-bold text-primary mb-2 tracking-tight">React Canvas</h1>
      <p className="text-[#888] mb-8 font-medium">Paste any component code to preview it instantly.</p>
      <button onClick={() => setCount(c => c + 1)} className="h-11 px-6 bg-white hover:bg-zinc-200 text-black font-bold rounded-full text-sm transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] active:scale-95">
        Increment: {count}
      </button>
    </div>
  );
}