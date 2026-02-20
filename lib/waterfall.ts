import { Category, HistoryEntry, WaterfallResult } from './types';

/**
 * Safely parse any date string we store:
 *   ISO  "YYYY-MM-DD"  → local midnight (unambiguous)
 *   Legacy "M/D/YYYY"  → built manually to avoid locale-parsing bugs
 */
export function parseHistoryDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date(dateStr + 'T00:00:00');
  }
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const [m, d, y] = parts.map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(dateStr);
}

/** "Feb 6, 2026" from any stored date string */
export function displayDate(dateStr: string): string {
  return parseHistoryDate(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

/** "YYYY-MM" from any stored date string */
export function toYearMonth(dateStr: string): string {
  const d = parseHistoryDate(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Current month as "YYYY-MM" */
export function currentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/** "YYYY-MM" → "February 2026" */
export function monthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function getMTD(
  categoryName: string,
  payDate: string,
  history: HistoryEntry[]
): number {
  const pd    = parseHistoryDate(payDate);
  const month = pd.getMonth();
  const year  = pd.getFullYear();
  return history
    .filter(h => {
      const hd = parseHistoryDate(h.date);
      return (
        h.category       === categoryName &&
        hd.getMonth()    === month        &&
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
    const fullTarget  = cat.target || 0;
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
