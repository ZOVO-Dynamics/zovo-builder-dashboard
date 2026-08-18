import { motion } from 'framer-motion';

const PARTICLES = [
  { top: 'calc(50% + 44px)', left: 'calc(50% + 122px)', size: 4, duration: 3.2, delay: 0 },
  { top: 'calc(50% + 128px)', left: 'calc(50% - 23px)', size: 3, duration: 3.8, delay: 0.4 },
  { top: 'calc(50% + 48px)', left: 'calc(50% - 132px)', size: 3.5, duration: 4.2, delay: 0.9 },
  { top: 'calc(50% - 84px)', left: 'calc(50% - 71px)', size: 2.5, duration: 3.5, delay: 1.3 },
  { top: 'calc(50% - 130px)', left: 'calc(50% + 75px)', size: 3, duration: 4, delay: 0.6 },
];

export const NeuralOrb = ({ status }: { status: string }) => {
  return (
    <div className="relative flex items-center justify-center scale-125 md:scale-150">
      {/* Halo diffus d'arriere-plan (backlight) - saignement de lumiere dore chaud, detache le globe du fond noir */}
      <div className="absolute w-[26rem] h-[26rem] rounded-full blur-[160px] pointer-events-none" style={{ backgroundColor: 'rgba(245, 158, 11, 0.25)' }} />

      {/* Particules dorees flottantes - energie et mouvement autour du globe */}
      {PARTICLES.map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            top: p.top,
            left: p.left,
            width: p.size,
            height: p.size,
            backgroundColor: '#FCD34D',
            boxShadow: '0 0 6px 1px rgba(252, 211, 77, 0.8)',
          }}
          animate={{
            y: [0, -10, 0],
            opacity: [0.3, 1, 0.3],
          }}
          transition={{
            repeat: Infinity,
            duration: p.duration,
            delay: p.delay,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Aura Massive */}
      <motion.div
        animate={{
          scale: status === 'thinking' ? [1, 1.4, 1] : [1, 1.1, 1],
          opacity: status === 'thinking' ? [0.2, 0.5, 0.2] : [0.1, 0.2, 0.1]
        }}
        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
        className="absolute w-64 h-64 bg-[#F59E0B] rounded-full blur-[120px] pointer-events-none"
      />

      {/* Anneau Orbital */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
        className="absolute w-48 h-48 border border-[#D4AF37]/30 rounded-full border-t-[#F59E0B] pointer-events-none"
      />

      {/* Noyau - globe reseau 3D : sphere eclairee + maillage wireframe rotatif */}
      <motion.div
        animate={{
          boxShadow: status === 'thinking' ? "0 0 80px rgba(245, 158, 11, 0.8)" : "0 0 20px rgba(245, 158, 11, 0.3)"
        }}
        transition={{ boxShadow: { duration: 1 } }}
        className="relative w-32 h-32 rounded-full z-10 border border-[#D4AF37]/40 overflow-hidden"
        style={{ background: 'radial-gradient(circle at 30% 28%, #FEF08A 0%, #D4AF37 45%, #92400E 100%)' }}
      >
        {/* Maillage reseau (latitude/longitude) - rotation lente independante */}
        <motion.svg
          viewBox="0 0 100 100"
          className="absolute inset-0 w-full h-full"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 40, ease: "linear" }}
        >
          <g fill="none" stroke="#FDE68A" strokeOpacity={0.3} strokeWidth={0.6}>
            {/* Meridiens (longitude) */}
            <ellipse cx="50" cy="50" rx="42" ry="48" />
            <ellipse cx="50" cy="50" rx="28" ry="48" />
            <ellipse cx="50" cy="50" rx="14" ry="48" />
            <line x1="50" y1="2" x2="50" y2="98" />
            {/* Paralleles (latitude) */}
            <ellipse cx="50" cy="50" rx="46" ry="10" />
            <ellipse cx="50" cy="32" rx="38" ry="7" />
            <ellipse cx="50" cy="68" rx="38" ry="7" />
            <ellipse cx="50" cy="18" rx="22" ry="4" />
            <ellipse cx="50" cy="82" rx="22" ry="4" />
          </g>
        </motion.svg>

        {/* Point chaud - source de lumiere en haut a gauche */}
        <div className="absolute top-3 left-3 w-10 h-10 rounded-full bg-[radial-gradient(circle,_#FFFFFF_0%,_#FEF08A_40%,_transparent_75%)] blur-md opacity-80 mix-blend-screen pointer-events-none"></div>

        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-25 mix-blend-overlay pointer-events-none"></div>
      </motion.div>
    </div>
  );
};
