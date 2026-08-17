import { motion } from 'framer-motion';

export const NeuralOrb = ({ status }: { status: string }) => {
  return (
    <div className="relative flex items-center justify-center scale-125 md:scale-150">
      {/* Aura Massive */}
      <motion.div 
        animate={{ 
          scale: status === 'thinking' ? [1, 1.4, 1] : [1, 1.1, 1],
          opacity: status === 'thinking' ? [0.2, 0.5, 0.2] : [0.1, 0.2, 0.1]
        }}
        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
        className="absolute w-64 h-64 bg-blue-500 rounded-full blur-[120px] pointer-events-none"
      />
      
      {/* Anneau Orbital */}
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
        className="absolute w-48 h-48 border border-blue-500/30 rounded-full border-t-blue-400 pointer-events-none"
      />

      {/* Noyau */}
      <motion.div
        animate={{ 
          rotate: -360,
          boxShadow: status === 'thinking' ? "0 0 80px rgba(59, 130, 246, 0.8)" : "0 0 40px rgba(59, 130, 246, 0.4)"
        }}
        transition={{ 
          rotate: { repeat: Infinity, duration: 25, ease: "linear" },
          boxShadow: { duration: 1 }
        }}
        className="relative w-32 h-32 rounded-full bg-gradient-to-tr from-indigo-950 via-blue-700 to-purple-900 z-10 border border-white/20 overflow-hidden"
      >
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-40 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent"></div>
      </motion.div>
    </div>
  );
};
