'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { NeuralOrb } from './NeuralOrb';
import { AmbientParticles, AmbientHalo } from './AmbientBackground';
import { useGenesis } from '../../hooks/useGenesis';

const FADE_UP = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.6, ease: 'easeOut' },
} as const;

const SectionBadge = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" className="shrink-0" aria-hidden="true">
    <path d="M12 2L14.2 9.8L22 12L14.2 14.2L12 22L9.8 14.2L2 12L9.8 9.8L12 2Z" fill="#D4AF37" />
  </svg>
);

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center gap-2 mb-4">
    <SectionBadge />
    <div className="text-[10px] font-black text-[#D4AF37] tracking-widest uppercase">{children}</div>
  </div>
);

const scrollToSection = (id: string) => (event: React.MouseEvent<HTMLAnchorElement>) => {
  event.preventDefault();
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
};

export const LandingUI = () => {
  const { status } = useGenesis();

  return (
    <div className="relative min-h-screen w-full bg-black text-white overflow-hidden flex flex-col font-sans">

      {/* BACKGROUND EFFECTS */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,_var(--tw-gradient-stops))] from-[#0A0A0A] via-transparent to-transparent opacity-70"></div>
        <div className="h-full w-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.15] contrast-150 brightness-50"></div>
      </div>
      <AmbientParticles />

      {/* HEADER / NAV */}
      <nav className="relative z-50 flex justify-between items-center p-8 backdrop-blur-sm bg-black/10">
        <div className="flex items-center gap-3 group cursor-pointer">
          <div className="w-10 h-10 bg-[#D4AF37] rounded-xl flex items-center justify-center font-black italic text-lg text-[#0A0A0A] shadow-[0_0_20px_rgba(212,175,55,0.4)] group-hover:scale-110 transition-transform">Z</div>
          <span className="text-xl font-bold tracking-[0.2em] uppercase">Zovo<span className="text-[#D4AF37]">.ca</span></span>
        </div>
        <div className="hidden md:flex gap-8 text-[10px] font-bold tracking-widest uppercase text-zinc-500 items-center">
          <a href="#a-propos" onClick={scrollToSection('a-propos')} className="hover:text-[#F59E0B] transition-colors">À Propos</a>
          <a href="#produits" onClick={scrollToSection('produits')} className="hover:text-[#F59E0B] transition-colors">Produits</a>
          <a href="#technologie" onClick={scrollToSection('technologie')} className="hover:text-[#F59E0B] transition-colors">Technologie</a>
          <a href="/login" className="px-4 py-1.5 rounded-full bg-[#D4AF37] text-[#0A0A0A] hover:bg-[#F59E0B] transition-colors normal-case tracking-normal">Connexion</a>
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <main className="relative z-10 flex-1 flex flex-col items-center px-6">

        {/* HERO */}
        <div className="relative flex flex-col items-center justify-center w-full pt-10 pb-8">
          <AmbientHalo className="w-[28rem] h-[28rem] top-0 left-1/2 -translate-x-1/2" />
          {/* TITRE VIRAL */}
          <div className="text-center mb-4">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-6xl md:text-8xl font-black tracking-tighter mb-4"
            >
              L&apos;IA QUI <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F59E0B] via-[#D4AF37] to-[#B45309] shadow-[#D4AF37]/20">BÂTIT</span>
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

          {/* ORBE CENTRAL */}
          <div className="relative flex items-center justify-center w-full h-80 mb-6">
            <NeuralOrb status={status} />
          </div>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <a
              href="/login"
              className="px-8 py-4 bg-gradient-to-r from-[#F59E0B] to-[#D4AF37] text-black rounded-2xl font-bold text-sm tracking-wide hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)]"
            >
              Essayer ZOVO Builder →
            </a>
            <a
              href="#a-propos"
              onClick={scrollToSection('a-propos')}
              className="px-8 py-4 border border-white/15 rounded-2xl font-bold text-sm tracking-wide text-zinc-300 hover:text-white hover:border-[#D4AF37] transition-all"
            >
              Découvrir ZOVO Dynamics
            </a>
          </div>
        </div>

        {/* QUI SOMMES-NOUS */}
        <motion.section
          id="a-propos"
          {...FADE_UP}
          className="w-full max-w-5xl py-24 border-t border-white/5"
        >
          <SectionLabel>Qui sommes-nous</SectionLabel>
          <h2 className="text-3xl md:text-5xl font-black tracking-tighter mb-6 max-w-3xl">
            ZOVO Dynamics bâtit les outils qui transforment une idée en entreprise numérique.
          </h2>
          <p className="text-zinc-400 text-base md:text-lg leading-relaxed max-w-3xl mb-12">
            Basée au Québec, ZOVO Dynamics conçoit des produits d&apos;intelligence artificielle qui retirent la barrière
            technique de l&apos;entrepreneuriat numérique. Notre moteur, <span className="text-white font-semibold">Genesis</span>,
            transforme une simple description en application fonctionnelle : il planifie l&apos;architecture, écrit le code,
            le valide automatiquement et le livre prêt à l&apos;emploi — sans qu&apos;une seule ligne ne soit écrite à la main.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { label: 'Fonctionnalités détectées automatiquement', value: '38' },
              { label: 'Fournisseurs IA en redondance', value: '7' },
              { label: 'Validation automatique du code livré', value: '100%' },
            ].map((stat) => (
              <div key={stat.label} className="p-6 bg-white/5 border border-amber-500/20 rounded-2xl transition-all duration-300 hover:border-amber-500/50 hover:shadow-[0_0_15px_rgba(245,158,11,0.15)]">
                <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#F59E0B] to-[#D4AF37] mb-2">
                  {stat.value}
                </div>
                <div className="text-[10px] font-bold tracking-widest uppercase text-zinc-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* NOTRE TECHNOLOGIE */}
        <motion.section
          id="technologie"
          {...FADE_UP}
          className="w-full max-w-5xl py-24 border-t border-white/5"
        >
          <SectionLabel>Notre technologie</SectionLabel>
          <h2 className="text-3xl md:text-5xl font-black tracking-tighter mb-12 max-w-3xl">
            Le moteur Genesis, de votre vision à votre application.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { step: '01', title: 'Énoncez votre vision', desc: 'Décrivez votre projet en une phrase, comme vous le feriez à un développeur.' },
              { step: '02', title: 'Genesis planifie', desc: "L'IA analyse la demande et génère l'architecture complète de l'application." },
              { step: '03', title: 'Le code s’écrit', desc: 'Chaque fichier est projeté et rédigé en temps réel, sous vos yeux.' },
              { step: '04', title: 'Validation & livraison', desc: 'Compilation, correction automatique et aperçu instantané avant livraison.' },
            ].map((s) => (
              <div key={s.step} className="p-6 bg-white/5 border border-amber-500/20 rounded-2xl transition-all duration-300 hover:border-amber-500/50 hover:shadow-[0_0_15px_rgba(245,158,11,0.15)]">
                <div className="text-xs font-black text-[#D4AF37] mb-3">{s.step}</div>
                <div className="font-bold mb-2">{s.title}</div>
                <div className="text-sm text-zinc-500 leading-relaxed">{s.desc}</div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* NOS PRODUITS */}
        <motion.section
          id="produits"
          {...FADE_UP}
          className="relative w-full max-w-5xl py-24 border-t border-white/5"
        >
          <AmbientHalo className="w-96 h-96 top-10 right-0" />
          <SectionLabel>Nos produits</SectionLabel>
          <h2 className="text-3xl md:text-5xl font-black tracking-tighter mb-12 max-w-3xl">
            Un écosystème pour bâtir et faire vivre votre projet.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-8 bg-gradient-to-br from-[#D4AF37]/10 to-[#F59E0B]/10 border border-[#D4AF37]/20 rounded-2xl">
              <div className="text-[10px] font-black text-[#F59E0B] tracking-widest uppercase mb-3">Produit phare</div>
              <div className="text-2xl font-black mb-3">ZOVO Builder</div>
              <p className="text-sm text-zinc-400 leading-relaxed mb-6">
                Le générateur d&apos;applications propulsé par Genesis : décrivez votre SaaS, votre site ou votre outil interne,
                et recevez une base de code complète, testée et prête à déployer.
              </p>
              <a href="/pricing" className="text-xs font-bold tracking-widest uppercase text-[#F59E0B] hover:text-[#FCD34D]">
                Voir les forfaits →
              </a>
            </div>
            <div className="p-8 bg-white/5 border border-white/10 rounded-2xl">
              <div className="text-[10px] font-black text-zinc-500 tracking-widest uppercase mb-3">Écosystème</div>
              <div className="text-2xl font-black mb-3">ZOVO Marketplace</div>
              <p className="text-sm text-zinc-400 leading-relaxed mb-6">
                Un réseau d&apos;agences et de créateurs qui prolonge votre projet : gabarits, extensions et accompagnement
                sur mesure pour les besoins qui dépassent la génération automatique.
              </p>
              <a href="/login" className="text-xs font-bold tracking-widest uppercase text-zinc-400 hover:text-white">
                Explorer →
              </a>
            </div>
          </div>
        </motion.section>

        {/* CTA FINAL */}
        <motion.section {...FADE_UP} className="w-full max-w-3xl py-24 border-t border-white/5 text-center">
          <h2 className="text-3xl md:text-5xl font-black tracking-tighter mb-6">
            Prêt à bâtir votre vision ?
          </h2>
          <p className="text-zinc-500 mb-10">Créez un compte et lancez votre première génération en quelques minutes.</p>
          <a
            href="/login"
            className="inline-block px-10 py-4 bg-gradient-to-r from-[#F59E0B] to-[#D4AF37] text-black rounded-2xl font-bold text-sm tracking-wide hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(245,158,11,0.3)]"
          >
            Commencer maintenant →
          </a>
        </motion.section>
      </main>

      {/* FOOTER HUD */}
      <footer className="relative z-50 p-8 flex flex-col md:flex-row justify-between items-center border-t border-white/5 bg-black/20 gap-4">
        <div className="flex flex-col gap-1">
          <div className="text-[10px] font-black text-[#D4AF37] tracking-widest uppercase">Statut du Système</div>
          <div className="text-xs text-zinc-400 font-mono">Genesis Core v2.4.0-stable // Neural Link Ready</div>
        </div>
        <div className="flex gap-8 text-[10px] font-bold text-zinc-600 tracking-widest uppercase items-center">
          <a href="/pricing" className="hover:text-zinc-400 transition-colors">Tarifs</a>
          <a href="/login" className="hover:text-zinc-400 transition-colors">Connexion</a>
          <span className="text-zinc-800">© 2026 ZOVO DYNAMICS</span>
        </div>
      </footer>

    </div>
  );
};
