import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, 
  Eye, 
  EyeOff, 
  Wifi, 
  ArrowDownLeft, 
  ArrowUpRight,
  Activity,
  Globe,
  Briefcase
} from 'lucide-react';

const CARDS = [
  {
    id: 'stripe',
    provider: 'Stripe',
    type: 'Corporate',
    holder: 'ALEX SMITH',
    exp: '12/28',
    number: '**** 4242',
    fullNumber: '5524 9910 4242',
    theme: 'from-[#635bff] to-[#423ba1]',
    shadow: 'shadow-indigo-500/40',
    icon: <Activity className="w-6 h-6 text-white" />,
    balance: 45231.89,
    transactions: [
      { id: 1, type: 'debit', merchant: 'Apple Store', date: 'Today, 2:45 PM', amount: 2499.00 },
      { id: 2, type: 'credit', merchant: 'Invoice #0042', date: 'Yesterday', amount: 8500.00 },
      { id: 3, type: 'debit', merchant: 'AWS Services', date: 'Aug 12', amount: 432.50 }
    ]
  },
  {
    id: 'wise',
    provider: 'Wise',
    type: 'Business',
    holder: 'STUDIO LLC',
    exp: '09/27',
    number: '**** 8810',
    fullNumber: '9012 4432 8810',
    theme: 'from-[#9bd86a] to-[#2e4a1a]',
    shadow: 'shadow-lime-500/40',
    icon: <Globe className="w-6 h-6 text-white" />,
    balance: 12450.00,
    transactions: [
      { id: 1, type: 'credit', merchant: 'Upwork Escrow', date: 'Aug 15', amount: 3200.00 },
      { id: 2, type: 'debit', merchant: 'Figma', date: 'Aug 14', amount: 15.00 },
      { id: 3, type: 'debit', merchant: 'GitHub', date: 'Aug 11', amount: 48.00 }
    ]
  },
  {
    id: 'paypal',
    provider: 'PayPal',
    type: 'Freelance',
    holder: 'HELLO@WORK.COM',
    exp: '03/29',
    number: '**** 0094',
    fullNumber: '3312 0045 0094',
    theme: 'from-[#0079C1] to-[#00457C]',
    shadow: 'shadow-blue-500/40',
    icon: <Briefcase className="w-6 h-6 text-white" />,
    balance: 3890.50,
    transactions: [
      { id: 1, type: 'debit', merchant: 'Starbucks', date: 'Today, 8:15 AM', amount: 6.50 },
      { id: 2, type: 'credit', merchant: 'Fiverr Transfer', date: 'Aug 10', amount: 450.00 },
      { id: 3, type: 'debit', merchant: 'Uber', date: 'Aug 09', amount: 24.90 }
    ]
  }
];

export default function App() {
  const [activeCardId, setActiveCardId] = useState(null);
  const [showBalance, setShowBalance] = useState(false);
  const [isWalletHovered, setIsWalletHovered] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  const totalBalance = CARDS.reduce((sum, card) => sum + card.balance, 0);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      setMousePos({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const handleCardClick = (id, e) => {
    e.stopPropagation();
    setActiveCardId(activeCardId === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-[#050508] flex items-center justify-center overflow-hidden font-sans text-slate-200 select-none">
      
      {/* Dynamic Ambient Background */}
      <div 
        className="absolute inset-0 opacity-40 transition-transform duration-1000 ease-out pointer-events-none"
        style={{
          background: `radial-gradient(circle at ${50 + mousePos.x * 30}% ${50 + mousePos.y * 30}%, #2d2b55 0%, #050508 50%)`
        }}
      />

      <div 
        ref={containerRef}
        className="relative w-full max-w-md h-[800px] perspective-[1500px] flex flex-col items-center justify-end"
        onClick={() => setActiveCardId(null)}
      >
        {/* Main 3D Container */}
        <div 
          className="relative w-full h-full flex flex-col items-center justify-end transition-transform duration-700 ease-out transform-style-3d"
          style={{
            transform: `rotateX(${mousePos.y * 8}deg) rotateY(${mousePos.x * 8}deg)`
          }}
        >
          
          {/* Header & Total Balance (Fades out when a card is active) */}
          <div className={`absolute top-20 flex flex-col items-center w-full transition-all duration-700 ${activeCardId ? 'opacity-0 -translate-y-10 pointer-events-none' : 'opacity-100 translate-y-0'}`}>
            <div className="flex items-center gap-2 mb-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-medium tracking-wider text-slate-300 uppercase">Vault Secured</span>
            </div>
            
            <div className="mt-6 flex flex-col items-center group cursor-pointer" onClick={(e) => { e.stopPropagation(); setShowBalance(!showBalance); }}>
              <span className="text-sm text-slate-400 mb-1 font-medium tracking-wide flex items-center gap-2">
                TOTAL BALANCE 
                {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </span>
              <div className="text-5xl font-light tracking-tight text-white transition-all duration-300">
                {showBalance ? formatCurrency(totalBalance) : '••••••••••'}
              </div>
            </div>
          </div>

          {/* Wallet / Pocket Area */}
          <div 
            className="relative w-80 h-[450px] flex justify-center items-end pb-12 z-10"
            onMouseEnter={() => setIsWalletHovered(true)}
            onMouseLeave={() => setIsWalletHovered(false)}
          >
            {/* The Cards */}
            {CARDS.map((card, index) => {
              const isActive = activeCardId === card.id;
              const isOtherActive = activeCardId !== null && !isActive;
              
              // Calculate stacked positions when not active
              const baseTranslateY = isWalletHovered ? -(index * 70) - 20 : -(index * 30);
              const baseScale = 1 - ((CARDS.length - 1 - index) * 0.05);
              const activeTranslateY = -350;
              
              return (
                <div
                  key={card.id}
                  onClick={(e) => handleCardClick(card.id, e)}
                  className={`absolute w-full aspect-[1.586/1] rounded-2xl p-6 cursor-pointer overflow-hidden backdrop-blur-xl border border-white/20 transition-all duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${isActive ? 'z-50 shadow-2xl' : 'shadow-xl hover:shadow-2xl'}`}
                  style={{
                    background: isActive ? `linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0))` : '',
                    zIndex: isActive ? 50 : index,
                    transform: `
                      translateY(${isActive ? activeTranslateY : (isOtherActive ? baseTranslateY + 150 : baseTranslateY)}px)
                      scale(${isActive ? 1.05 : baseScale})
                      rotateX(${isActive ? 0 : (isWalletHovered ? 5 : 0)}deg)
                    `,
                    opacity: isOtherActive ? 0.3 : 1,
                  }}
                >
                  {/* Card Gradients */}
                  <div className={`absolute inset-0 opacity-80 bg-gradient-to-br ${card.theme}`} />
                  
                  {/* Glass Shimmer Effect */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 opacity-0 hover:opacity-100 transition-opacity duration-700 translate-x-[-100%] hover:translate-x-[100%]" />

                  {/* Card Content */}
                  <div className="relative h-full flex flex-col justify-between z-10">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-bold text-white tracking-wide">{card.provider}</h3>
                        <p className="text-xs text-white/70 font-medium">{card.type}</p>
                      </div>
                      <Wifi className="w-6 h-6 text-white/80 rotate-90" />
                    </div>

                    <div className="flex items-center gap-2 my-auto">
                      <div className="w-10 h-7 rounded bg-gradient-to-br from-[#FFD700]/40 to-[#DAA520]/60 border border-yellow-200/30 flex items-center justify-center">
                        <div className="w-6 h-4 rounded-sm border border-yellow-200/20" />
                      </div>
                    </div>

                    <div className="flex justify-between items-end">
                      <div className="space-y-1">
                        <p className="text-xs text-white/60 uppercase tracking-widest">Card Holder</p>
                        <p className="text-sm text-white font-semibold tracking-widest">{card.holder}</p>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="text-xs text-white/60 uppercase tracking-widest">Expires</p>
                        <p className="text-sm text-white font-semibold tracking-widest">{card.exp}</p>
                      </div>
                    </div>

                    {/* Number Overlay */}
                    <div className="absolute inset-x-0 bottom-16 flex justify-between px-1">
                      <p className={`font-mono text-xl tracking-[0.2em] text-white transition-opacity duration-300 ${isActive || isWalletHovered ? 'opacity-100' : 'opacity-0'}`}>
                        {isActive ? card.fullNumber : card.number}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Pocket Front (Glassmorphism overlay to create depth) */}
            <div className="absolute bottom-0 w-[110%] h-32 bg-[#0c0c14]/80 backdrop-blur-md border-t border-white/5 rounded-t-[3rem] z-40 flex justify-center pt-4 pointer-events-none shadow-[0_-20px_40px_rgba(0,0,0,0.5)]">
              <div className="w-20 h-1.5 rounded-full bg-white/10" />
            </div>
          </div>

          {/* Active Card Details Panel */}
          {CARDS.map(card => (
            <div 
              key={`details-${card.id}`}
              className={`absolute bottom-0 w-full h-[400px] bg-slate-900/60 backdrop-blur-2xl border-t border-white/10 rounded-t-3xl p-6 transition-all duration-700 ease-out z-30 ${activeCardId === card.id ? 'translate-y-0 opacity-100 pointer-events-auto' : 'translate-y-full opacity-0 pointer-events-none'}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-8">
                <div>
                  <p className="text-sm text-slate-400 mb-1 font-medium">Available Balance</p>
                  <p className="text-3xl text-white font-light">{formatCurrency(card.balance)}</p>
                </div>
                <div className={`p-3 rounded-2xl bg-gradient-to-br ${card.theme} shadow-lg ${card.shadow}`}>
                  {card.icon}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Recent Transactions</h4>
                {card.transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors group cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${tx.type === 'credit' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-white/5 border-white/10 text-slate-300'}`}>
                        {tx.type === 'credit' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="text-white font-medium group-hover:text-white transition-colors">{tx.merchant}</p>
                        <p className="text-xs text-slate-500">{tx.date}</p>
                      </div>
                    </div>
                    <p className={`font-medium ${tx.type === 'credit' ? 'text-emerald-400' : 'text-white'}`}>
                      {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}

        </div>
      </div>
      
      {/* Global styles required for 3D Perspective */}
      <style dangerouslySetInnerHTML={{__html: `
        .transform-style-3d { transform-style: preserve-3d; }
      `}} />
    </div>
  );
}