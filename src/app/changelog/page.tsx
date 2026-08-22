import Link from 'next/link';
import { CHANGELOG } from '../../lib/changelog';

export default function ChangelogPage() {
  return (
    <div className="relative min-h-screen w-full bg-black text-white overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_20%,_var(--tw-gradient-stops))] from-[#0A0A0A] via-transparent to-transparent opacity-70"></div>
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-6 py-20">
        <Link
          href="/"
          className="text-xs font-bold tracking-widest uppercase text-zinc-500 hover:text-[#F59E0B] transition-colors"
        >
          &larr; Retour à l&apos;accueil
        </Link>

        <h1 className="mt-6 text-4xl md:text-5xl font-black tracking-tighter">
          Journal des <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F59E0B] via-[#D4AF37] to-[#B45309]">mises à jour</span>
        </h1>
        <p className="mt-3 text-zinc-500 text-sm">Les dernières évolutions de ZOVO Builder.</p>

        <div className="mt-14 space-y-10">
          {CHANGELOG.map((entry) => (
            <div
              key={entry.version}
              className="p-6 md:p-8 bg-white/5 border border-amber-500/20 rounded-2xl transition-all duration-300 hover:border-amber-500/40"
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="text-[10px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30">
                  v{entry.version}
                </span>
                <h2 className="text-lg font-bold">{entry.title}</h2>
              </div>
              <ul className="space-y-2">
                {entry.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-zinc-400 leading-relaxed">
                    <span className="mt-1.5 h-1 w-1 rounded-full bg-[#D4AF37] shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
