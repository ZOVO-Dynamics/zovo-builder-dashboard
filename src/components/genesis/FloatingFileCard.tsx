import { motion } from 'framer-motion';

export const FloatingFileCard = ({ file, index }: { file: any, index: number }) => {
  // Calcul de la trajectoire orbitale
  const angle = (index * 0.8) + 0.5;
  const xDist = Math.cos(angle) * 280;
  const yDist = Math.sin(angle) * 180;

  return (
    <motion.div
      initial={{ scale: 0, x: 0, y: 0, opacity: 0, rotate: 0 }}
      animate={{ 
        scale: 1, 
        x: xDist, 
        y: yDist, 
        opacity: 1,
        rotate: (index % 2 === 0 ? 5 : -5)
      }}
      whileHover={{ scale: 1.1, rotate: 0, zIndex: 50 }}
      className="absolute p-4 bg-white/5 backdrop-blur-2xl rounded-2xl w-64 border border-white/10 shadow-2xl group cursor-pointer"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-2 h-2 rounded-full animate-pulse ${file.action === 'create' ? 'bg-green-400 shadow-[0_0_8px_#4ade80]' : 'bg-blue-400 shadow-[0_0_8px_#60a5fa]'}`} />
        <span className="text-[10px] font-mono text-zinc-400 truncate">{file.file}</span>
      </div>
      
      <div className="space-y-2">
        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: '100%' }}
            transition={{ duration: 2 }}
            className={`h-full ${file.action === 'create' ? 'bg-green-500' : 'bg-blue-500'}`}
          />
        </div>
        <p className="text-[11px] text-zinc-300 leading-tight">
          {file.message || "Analyse structurelle en cours..."}
        </p>
      </div>
      
      <div className="mt-3 flex justify-end">
        <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 group-hover:text-white transition-colors">
          Genesis Module
        </span>
      </div>
    </motion.div>
  );
};
