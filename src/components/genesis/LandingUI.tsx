'use client';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NeuralOrb } from './NeuralOrb';
import { FloatingFileCard } from './FloatingFileCard';
import { useGenesis } from '../../hooks/useGenesis';
import { GenesisBus, GenesisEvent } from '../../core/ZovoGenesisBus';
import { ZovoBridgeClient } from '../../core/ZovoBridgeClient';

export const LandingUI = () => {
  const { status, projectedFiles } = useGenesis();
  const [inputValue, setInputValue] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue) return;

    const prompt = inputValue;
    setInputValue("");

    let bridge: ZovoBridgeClient | null = null;

    try {
      const res = await fetch("/api/blueprint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, projectId: null }),
      });
      const data = await res.json();
      if (data.jobId) {
        bridge = new ZovoBridgeClient(data.jobId);
      }
    } catch (err) {
      console.error("Erreur de génération Genesis:", err);
    } finally {
      // Laisse le temps au dernier événement (INTEGRATION_COMPLETE) d'arriver
      // avant de fermer la connexion WebSocket de ce job.
      setTimeout(() => bridge?.close(), 2000);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#030305] text-white overflow-hidden flex flex-col font-sans">
      
      {/* BACKGROUND EFFECTS */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,_var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-transparent opacity-50"></div>
        <div className="h-full w-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.15] contrast-150 brightness-50"></div>
      </div>

      {/* HEADER / NAV */}
      <nav className="relative z-50 flex justify-between items-center p-8 backdrop-blur-sm bg-black/10">
        <div className="flex items-center gap-3 group cursor-pointer">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-black italic text-lg shadow-[0_0_20px_rgba(37,99,235,0.4)] group-hover:scale-110 transition-transform">Z</div>
          <span className="text-xl font-bold tracking-[0.2em] uppercase">Zovo<span className="text-blue-500">.ca</span></span>
        </div>
        <div className="hidden md:flex gap-8 text-[10px] font-bold tracking-widest uppercase text-zinc-500">
          <a href="#" className="hover:text-blue-400 transition-colors">Moteur Genesis</a>
          <a href="#" className="hover:text-blue-400 transition-colors">Documentation</a>
          <a href="#" className="hover:text-blue-400 transition-colors text-white border-b border-blue-500 pb-1">Accès Early</a>
          <a href="/login" className="px-4 py-1.5 rounded-full bg-blue-600 text-white hover:bg-blue-500 transition-colors normal-case tracking-normal">Connexion</a>
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6">
        
        {/* TITRE VIRAL */}
        <div className="text-center mb-12">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-6xl md:text-8xl font-black tracking-tighter mb-4"
          >
            L'IA QUI <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-600 shadow-blue-500/20">BÂTIT</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-zinc-500 tracking-[0.4em] text-[10px] md:text-xs uppercase font-bold"
          >
            Ne codez plus. Énoncez votre vision. Genesis matérialise.
          </motion.p>
        </div>

        {/* ORBE CENTRAL & CARTES */}
        <div className="relative flex items-center justify-center w-full h-80 mb-20">
          <NeuralOrb status={status} />
          <AnimatePresence>
            {projectedFiles.map((file, i) => (
              <FloatingFileCard key={file.id} file={file} index={i} />
            ))}
          </AnimatePresence>
        </div>

        {/* INPUT GENESIS ULTIME */}
        <div className="w-full max-w-3xl">
          <form onSubmit={handleSubmit} className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-3xl blur opacity-20 group-focus-within:opacity-50 transition duration-1000"></div>
            <div className="relative bg-black/40 backdrop-blur-3xl border border-white/10 p-2 rounded-3xl shadow-2xl">
              <div className="flex items-center">
                <div className="pl-6 pr-2">
                  <div className={`w-3 h-3 rounded-full ${status === 'thinking' ? 'bg-blue-500 animate-pulse' : 'bg-zinc-700'}`}></div>
                </div>
                <input 
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="flex-1 bg-transparent py-6 text-xl outline-none placeholder:text-zinc-700 font-medium"
                  placeholder="Ex: 'Crée un SaaS de gestion d'inventaire avec Stripe'..."
                />
                <button type="submit" className="h-16 w-16 bg-white text-black rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl flex items-center justify-center group mx-2">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </button>
              </div>
            </div>
          </form>
          
          {/* QUICK SUGGESTIONS */}
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            {['E-commerce App', 'Portfolio 3D', 'Dashboard API'].map((tag) => (
              <button 
                key={tag}
                onClick={() => setInputValue(`Génère un ${tag}`)}
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold tracking-widest text-zinc-500 hover:text-white hover:border-blue-500 transition-all uppercase"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </main>

      {/* FOOTER HUD */}
      <footer className="relative z-50 p-8 flex flex-col md:flex-row justify-between items-center border-t border-white/5 bg-black/20">
        <div className="flex flex-col gap-1 mb-4 md:mb-0">
          <div className="text-[10px] font-black text-blue-500 tracking-widest uppercase">Statut du Système</div>
          <div className="text-xs text-zinc-400 font-mono">Genesis Core v2.4.0-stable // Neural Link Ready</div>
        </div>
        <div className="flex gap-8 text-[10px] font-bold text-zinc-600 tracking-widest uppercase">
          <span className="hover:text-zinc-400 cursor-pointer">Twitter</span>
          <span className="hover:text-zinc-400 cursor-pointer">Discord</span>
          <span className="text-zinc-800">© 2024 ZOVO TECHNOLOGIES</span>
        </div>
      </footer>

    </div>
  );
};
