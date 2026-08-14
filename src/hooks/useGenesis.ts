import { useState, useEffect } from 'react';
import { GenesisBus, GenesisEvent } from '../core/ZovoGenesisBus';

export function useGenesis() {
  const [status, setStatus] = useState<'idle' | 'thinking' | 'writing'>('idle');
  const [projectedFiles, setProjectedFiles] = useState<any[]>([]);

  useEffect(() => {
    GenesisBus.on(GenesisEvent.THINKING_START, () => setStatus('thinking'));
    
    GenesisBus.on(GenesisEvent.FILE_PROJECTED, (fileData) => {
      setProjectedFiles(prev => [...prev, { ...fileData, id: Math.random() }]);
    });

    GenesisBus.on(GenesisEvent.INTEGRATION_COMPLETE, () => {
      setStatus('idle');
      // Animation de sortie avant de vider (optionnel)
      setTimeout(() => setProjectedFiles([]), 1000);
    });

    return () => {
      GenesisBus.removeAllListeners();
    };
  }, []);

  return { status, projectedFiles };
}
