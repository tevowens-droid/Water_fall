import { Category, HistoryEntry } from './types';

export const initialCategories: Category[] = [
  { name: 'Bills',        type: 'F', target: 871.39,  flow: [] },
  { name: 'Saving 1',     type: 'F', target: 1147.5,  flow: [] },
  { name: 'Investment 1', type: 'F', target: 1000,    weeklyTarget: 250, flow: [] },
  { name: 'Chase cc',     type: 'V', target: 1952,    flow: [] },
  { name: 'Saving 2',     type: 'F', target: 833.3,   flow: [] },
  { name: 'Investment 2', type: 'F', target: 500,     flow: [] },
  { name: 'Discover',     type: 'F', target: 185.66,  flow: [] },
  { name: 'Wedding',      type: 'F', target: 277.5,   flow: [] },
  { name: 'Chase 2',      type: 'F', target: 520,     flow: [] },
  { name: 'Amex',         type: 'V', target: null,    flow: [] },
];

// Dates stored as ISO "YYYY-MM-DD" for unambiguous month-math
export const initialHistory: HistoryEntry[] = [
  { date: '2026-02-13', category: 'Amex',         allocated: 1074,   target: null   },
  { date: '2026-02-13', category: 'Investment 1', allocated: 250,    target: 1000   },
  { date: '2026-02-13', category: 'Saving 2',     allocated: 580,    target: 833.3  },
  { date: '2026-02-13', category: 'Investment 2', allocated: 500,    target: 500    },
  { date: '2026-02-13', category: 'Discover',     allocated: 500,    target: 185.66 },
  { date: '2026-02-06', category: 'Bills',        allocated: 871.39, target: 871.39 },
  { date: '2026-02-06', category: 'Saving 1',     allocated: 1147.5, target: 1147.5 },
  { date: '2026-02-06', category: 'Investment 1', allocated: 250,    target: 1000   },
  { date: '2026-02-06', category: 'Wedding',      allocated: 277.5,  target: 277.5  },
  { date: '2026-02-06', category: 'Saving 2',     allocated: 253,    target: 833.3  },
];
