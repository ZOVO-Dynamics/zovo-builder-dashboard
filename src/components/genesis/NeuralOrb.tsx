import { motion } from 'framer-motion';

export const NeuralOrb = ({ status }: { status: string }) => {
  return (
    <div className="relative flex items-center justify-center scale-125 md:scale-150">
      {/* Halo diffus d'arriere-plan (backlight) - detache le globe du fond noir */}
      <div className="absolute w-[26rem] h-[26rem] bg-[#C9A227] rounded-full blur-[160px] opacity-[0.12] pointer-events-none" />

      {/* Aura Massive */}
      <motion.div
        animate={{
          scale: status === 'thinking' ? [1, 1.4, 1] : [1, 1.1, 1],
          opacity: status === 'thinking' ? [0.2, 0.5, 0.2] : [0.1, 0.2, 0.1]
        }}
        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
        className="absolute w-64 h-64 bg-[#C9A227] rounded-full blur-[120px] pointer-events-none"
      />

      {/* Anneau Orbital */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
        className="absolute w-48 h-48 border border-[#C9A227]/30 rounded-full border-t-[#E8C34A] pointer-events-none"
      />

      {/* Noyau */}
      <motion.div
        animate={{
          rotate: -360,
          boxShadow: status === 'thinking' ? "0 0 80px rgba(201, 162, 39, 0.8)" : "0 0 40px rgba(201, 162, 39, 0.4)"
        }}
        transition={{
          rotate: { repeat: Infinity, duration: 25, ease: "linear" },
          boxShadow: { duration: 1 }
        }}
        className="relative w-32 h-32 rounded-full bg-gradient-to-tr from-[#0A0A0C] via-[#7A6118] to-[#1A1508] z-10 border border-[#C9A227]/30 overflow-hidden"
      >
        {/* Point chaud - simule une source de lumiere sur le reseau */}
        <div className="absolute -top-2 left-4 w-10 h-10 rounded-full bg-[radial-gradient(circle,_#FFFFFF_0%,_#F5E3A1_40%,_transparent_75%)] blur-md opacity-90 mix-blend-screen"></div>

        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-40 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent"></div>
      </motion.div>
    </div>
  );
};
