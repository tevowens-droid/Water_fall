export interface FlowStep {
  method: string;
  account: string;
}

export interface Category {
  name: string;
  type: 'F' | 'V';
  target: number | null;
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
