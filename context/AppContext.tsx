'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Category, HistoryEntry } from '@/lib/types';
import { initialCategories, initialHistory } from '@/lib/initialData';

interface AppContextType {
  categories: Category[];
  setCategories: (cats: Category[]) => void;
  history: HistoryEntry[];
  setHistory: (h: HistoryEntry[]) => void;
  sheetsUrl: string;
  setSheetsUrl: (url: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [categories, setCategoriesState] = useState<Category[]>(initialCategories);
  const [history, setHistoryState] = useState<HistoryEntry[]>(initialHistory);
  const [sheetsUrl, setSheetsUrlState] = useState('');
  const [hydrated, setHydrated] = useState(false);

  // Load persisted state from localStorage on mount
  useEffect(() => {
    setCategoriesState(loadFromStorage('wf_categories', initialCategories));
    setHistoryState(loadFromStorage('wf_history', initialHistory));
    setSheetsUrlState(localStorage.getItem('sheetsUrl') || '');
    setHydrated(true);
  }, []);

  const setCategories = (cats: Category[]) => {
    setCategoriesState(cats);
    localStorage.setItem('wf_categories', JSON.stringify(cats));
  };

  const setHistory = (h: HistoryEntry[]) => {
    setHistoryState(h);
    localStorage.setItem('wf_history', JSON.stringify(h));
  };

  const setSheetsUrl = (url: string) => {
    setSheetsUrlState(url);
    localStorage.setItem('sheetsUrl', url);
  };

  if (!hydrated) return null;

  return (
    <AppContext.Provider value={{ categories, setCategories, history, setHistory, sheetsUrl, setSheetsUrl }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
