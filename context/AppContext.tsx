'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { FlowStep } from '@/lib/types';

// AppContext now only manages flow instructions (which account/method each
// category uses). Everything else — allocations, history, categories —
// is read live from Google Sheets via the /api/sheets routes.

interface AppContextValue {
  flows: Record<string, FlowStep[]>;
  setFlows: (flows: Record<string, FlowStep[]>) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [flows, setFlowsState] = useState<Record<string, FlowStep[]>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('wf_flows');
      if (stored) setFlowsState(JSON.parse(stored));
    } catch { /* ignore parse errors */ }
    setReady(true);
  }, []);

  function setFlows(f: Record<string, FlowStep[]>) {
    setFlowsState(f);
    try { localStorage.setItem('wf_flows', JSON.stringify(f)); } catch { /* ignore */ }
  }

  if (!ready) return null;

  return (
    <AppContext.Provider value={{ flows, setFlows }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
