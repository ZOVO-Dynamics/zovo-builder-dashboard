import React from 'react';
import { NeuralOrb } from './NeuralOrb';
import { FloatingFileCard } from './FloatingFileCard';
import { useGenesis } from '../../hooks/useGenesis';

export const GenesisUI = () => {
  const { status, projectedFiles } = useGenesis();

  return (
    <div className="relative h-screen w-full bg-[#030305] text-white overflow-hidden flex items-center justify-center">
      
      {/* Fond étoilé / HUD */}
      <div className="absolute inset-0 z-0 opacity-30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent"></div>
        <div className="h-full w-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 contrast-150"></div>
      </div>

      {/* Orbe et Cartes */}
      <div className="relative z-10 flex items-center justify-center">
        <NeuralOrb status={status} />
        
        {projectedFiles.map((file, i) => (
          <FloatingFileCard key={file.id} file={file} index={i} />
        ))}
      </div>

      {/* Barre d'entrée Genesis */}
      <div className="absolute bottom-16 z-20 w-full max-w-3xl px-6">
        <div className="bg-white/5 backdrop-blur-3xl border border-white/10 p-2 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] focus-within:border-blue-500/50 transition-all">
          <div className="flex items-center">
            <textarea 
              className="flex-1 bg-transparent p-5 outline-none text-lg placeholder:text-zinc-600 resize-none"
              placeholder="Que voulez-vous générer aujourd'hui ?"
              rows={1}
            />
            <button className="h-14 w-14 bg-white text-black rounded-2xl hover:bg-blue-500 hover:text-white transition-all duration-300 shadow-xl flex items-center justify-center group">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6 group-hover:-translate-y-1 transition-transform">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" />
              </svg>
            </button>
          </div>
        </div>
        <div className="mt-6 flex justify-between px-4 text-[10px] font-bold tracking-[0.4em] text-zinc-600 uppercase">
          <span>Zovo Engine v2.4</span>
          <span className="text-blue-500/50">Neural Link Active</span>
          <span>© 2024</span>
        </div>
      </div>
    </div>
  );
};
