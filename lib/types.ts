// ── Local types (flow instructions, stored in localStorage) ──────────────────
export interface FlowStep {
  method: string;
  account: string;
}

// ── Sheets API types (data sourced from Google Sheets) ────────────────────────
export interface SheetRow {
  category: string;
  allocation: number;
  remaining: number;
  override: number | null;
  monthlyNeed: number;
  rowNumber: number; // 1-indexed row in Paycheck_Input sheet, used for override writes
}

export interface WeekData {
  payDate: string;   // "M/D/YYYY" as returned by Sheets FORMATTED_VALUE
  amount: number;    // Paycheck Amount
  left: number;      // Paycheck Left (excess after all allocations)
  rows: SheetRow[];
}

export interface SheetCategory {
  name: string;
  type: 'F' | 'V';
  monthlyTarget: number;
  mtd: number;       // Month-to-date allocated (SUMIFS in Sheets)
}

export interface SheetData {
  thisWeek: WeekData;
  nextWeek: WeekData;
}

export interface HistoryRow {
  date: string;      // "M/D/YYYY"
  category: string;
  amount: number;
}

// ── Legacy types (kept for waterfall.ts helpers, initialData) ─────────────────
export interface Category {
  name: string;
  type: 'F' | 'V';
  target: number | null;
  weeklyTarget?: number | null;
  flow: FlowStep[];
}

export interface HistoryEntry {
  date: string;
  category: string;
  allocated: number;
  target: number | null;
  isOverflow?: boolean;
}

export interface WaterfallResult extends Category {
  allocated: number;
  mtd: number;
  stillNeeded: number;
  status: 'full' | 'partial' | 'empty' | 'skipped';
}
