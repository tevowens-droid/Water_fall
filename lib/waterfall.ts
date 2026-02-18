import { Category, HistoryEntry, WaterfallResult } from './types';

export function getMTD(
  categoryName: string,
  payDate: string,
  history: HistoryEntry[]
): number {
  const pd = new Date(payDate + 'T00:00:00');
  const month = pd.getMonth();
  const year = pd.getFullYear();
  return history
    .filter(h => {
      const hd = new Date(h.date);
      return (
        h.category === categoryName &&
        hd.getMonth() === month &&
        hd.getFullYear() === year
      );
    })
    .reduce((sum, h) => sum + h.allocated, 0);
}

export function getMTDMap(
  payDate: string,
  categories: Category[],
  history: HistoryEntry[]
): Record<string, number> {
  const map: Record<string, number> = {};
  categories.forEach(cat => {
    map[cat.name] = getMTD(cat.name, payDate, history);
  });
  return map;
}

export function calcWaterfall(
  amount: number,
  payDate: string,
  categories: Category[],
  history: HistoryEntry[]
): WaterfallResult[] {
  const mtd = getMTDMap(payDate, categories, history);
  let rem = amount;

  return categories.map(cat => {
    const fullTarget = cat.target || 0;
    const alreadyPaid = mtd[cat.name] || 0;
    const stillNeeded = Math.max(0, fullTarget - alreadyPaid);

    if (fullTarget > 0 && alreadyPaid >= fullTarget) {
      return { ...cat, allocated: 0, mtd: alreadyPaid, stillNeeded: 0, status: 'skipped' as const };
    }

    if (!fullTarget) {
      if (rem <= 0) return { ...cat, allocated: 0, mtd: alreadyPaid, stillNeeded: 0, status: 'empty' as const };
      const a = rem; rem = 0;
      return { ...cat, allocated: a, mtd: alreadyPaid, stillNeeded: 0, status: 'full' as const };
    }

    if (rem <= 0) return { ...cat, allocated: 0, mtd: alreadyPaid, stillNeeded, status: 'empty' as const };

    if (rem >= stillNeeded) {
      rem -= stillNeeded;
      return { ...cat, allocated: stillNeeded, mtd: alreadyPaid, stillNeeded, status: 'full' as const };
    }

    const a = rem; rem = 0;
    return { ...cat, allocated: a, mtd: alreadyPaid, stillNeeded, status: 'partial' as const };
  });
}

export function fmt(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
