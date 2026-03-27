import { useEffect, type ReactNode } from 'react';
import { useNeuroLoop } from './hooks';
import { useNeuroStore } from './store';

interface NeuroProviderProps {
  children: ReactNode;
}

export function NeuroProvider({ children }: NeuroProviderProps) {
  const init = useNeuroStore((s) => s.init);
  const destroy = useNeuroStore((s) => s.destroy);

  useEffect(() => {
    init();
    return () => destroy();
  }, [init, destroy]);

  useNeuroLoop();

  return <>{children}</>;
}
