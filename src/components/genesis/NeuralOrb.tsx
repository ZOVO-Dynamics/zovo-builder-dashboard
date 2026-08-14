import { motion } from 'framer-motion';

export const NeuralOrb = ({ status }: { status: string }) => {
  return (
    <div className="relative flex items-center justify-center">
      {/* Glow infini en arrière-plan */}
      <motion.div 
        animate={{ 
          scale: status === 'thinking' ? [1, 1.3, 1] : 1,
          opacity: status === 'thinking' ? [0.3, 0.6, 0.3] : 0.2
        }}
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
        className="absolute w-80 h-80 bg-blue-600 rounded-full blur-[100px]"
      />
      
      {/* Noyau de l'Orbe */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
        className="w-40 h-40 rounded-full bg-gradient-to-br from-blue-400 via-indigo-600 to-purple-700 shadow-[0_0_60px_rgba(59,130,246,0.6)] z-10 border border-white/20"
      >
        <div className="w-full h-full rounded-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-30 mix-blend-overlay"></div>
      </motion.div>
    </div>
  );
};
