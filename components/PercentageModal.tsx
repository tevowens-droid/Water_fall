'use client';
import { useState } from 'react';
import { Category, HistoryEntry } from '@/lib/types';
import { fmt } from '@/lib/waterfall';

interface Props {
  remaining: number;
  date: string;        // ISO "YYYY-MM-DD"
  categories: Category[];
  onAllocate: (entries: HistoryEntry[]) => void;
  onClose: () => void;
}

export default function PercentageModal({ remaining, date, categories, onAllocate, onClose }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const inv1Cat = categories.find(c => c.name === 'Investment 1');
  const inv1Default = inv1Cat?.target
    ? Math.min(inv1Cat.target / 4, remaining)
    : Math.min(250, remaining);

  const [inv1Amt, setInv1Amt] = useState(inv1Default);
  const [percents, setPercents] = useState<number[]>(categories.map(() => 0));

  const afterInv1 = Math.max(0, remaining - inv1Amt);
  const totalPct  = percents.reduce((a, b) => a + b, 0);
  const totalAmt  = afterInv1 * Math.min(totalPct, 100) / 100;
  const pctColor  = Math.abs(totalPct - 100) < 0.1 ? 'var(--green)' : totalPct > 100 ? 'var(--red)' : 'var(--text)';

  function handleAllocate() {
    const entries: HistoryEntry[] = [];
    if (inv1Amt > 0) {
      entries.push({ date, category: 'Investment 1', allocated: parseFloat(inv1Amt.toFixed(2)), target: null, isOverflow: true });
    }
    categories.forEach((cat, i) => {
      const pct = percents[i];
      if (pct <= 0) return;
      const amt = parseFloat((afterInv1 * pct / 100).toFixed(2));
      if (amt > 0) entries.push({ date, category: cat.name, allocated: amt, target: null, isOverflow: true });
    });
    onAllocate(entries);
  }

  function setPct(i: number, val: number) {
    const next = [...percents];
    next[i] = Math.max(0, val);
    setPercents(next);
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-title">🎉 All Buckets Full!</div>
        <div className="modal-sub">
          You have <strong style={{ color: 'var(--green)' }}>${fmt(remaining)}</strong> left over after all
          buckets are fully funded.<br />Ready to allocate by percentage?
        </div>

        {step === 1 && (
          <div className="modal-actions">
            <button className="btn-yes" onClick={() => setStep(2)}>Yes, allocate!</button>
            <button className="btn-no" onClick={onClose}>No thanks</button>
          </div>
        )}

        {step === 2 && (
          <>
            <div className="inv1-fixed-box">
              <div style={{ fontSize: '.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.1px', color: 'var(--fixed)', marginBottom: 10 }}>
                Investment 1 — Fixed Priority
              </div>
              <div className="pct-row" style={{ border: 'none', padding: 0 }}>
                <span className="pct-label" style={{ color: 'var(--text2)' }}>Auto-allocate to Investment 1</span>
                <input
                  className="pct-input"
                  type="number"
                  min={0}
                  step={0.01}
                  value={inv1Amt}
                  onChange={e => setInv1Amt(Math.max(0, parseFloat(e.target.value) || 0))}
                  style={{ width: 90 }}
                />
                <span className="pct-dollar" style={{ color: 'var(--fixed)' }}>${fmt(inv1Amt)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: '.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text2)' }}>
                Remaining to distribute by %
              </div>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--accent2)' }}>${fmt(afterInv1)}</div>
            </div>

            <div>
              {categories.map((cat, i) => (
                <div key={cat.name} className="pct-row">
                  <span className="pct-label">
                    {cat.name}{' '}
                    <span className={`type-badge type-${cat.type}`}>{cat.type === 'F' ? 'Fixed' : 'Var'}</span>
                  </span>
                  <input
                    className="pct-input"
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={percents[i] || ''}
                    placeholder="0%"
                    onChange={e => setPct(i, parseFloat(e.target.value) || 0)}
                  />
                  <span className="pct-dollar">${fmt(afterInv1 * (percents[i] || 0) / 100)}</span>
                </div>
              ))}
            </div>

            <div className="pct-total-bar">
              <span style={{ color: 'var(--text2)' }}>
                Total: <span style={{ fontWeight: 700, color: pctColor }}>{totalPct.toFixed(1)}%</span>
              </span>
              <span style={{ color: 'var(--text2)' }}>
                Amount: <span style={{ fontWeight: 700, color: 'var(--accent)' }}>${fmt(totalAmt)}</span>
              </span>
            </div>

            <div className="modal-actions" style={{ marginTop: 14 }}>
              <button className="btn-yes" onClick={handleAllocate}>Allocate &amp; Save</button>
              <button className="btn-no" onClick={onClose}>Cancel</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
