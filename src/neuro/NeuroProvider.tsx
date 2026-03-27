import { type ReactNode, useEffect } from 'react';
import { useNeuroLoop } from './hooks';
import { useNeuroStore } from './store';

interface NeuroProviderProps {
  children: ReactNode;
}

export function NeuroProvider({ children }: NeuroProviderProps) {
  useEffect(() => {
    const { init } = useNeuroStore.getState();
    init();
    return () => {
      useNeuroStore.getState().destroy();
    };
  }, []);

  useNeuroLoop();

  return <>{children}</>;
}
