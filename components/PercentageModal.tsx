'use client';
import { useState, useEffect } from 'react';
import { fmt } from '@/lib/waterfall';

interface Props {
  excess: number;
  categoryNames: string[];
  onClose: () => void;
}

interface PctRow {
  category: string;
  pct: string;
}

export default function PercentageModal({ excess, categoryNames, onClose }: Props) {
  const [rows, setRows] = useState<PctRow[]>([]);

  useEffect(() => {
    setRows(categoryNames.map(name => ({ category: name, pct: '' })));
  }, [categoryNames]);

  function updatePct(i: number, val: string) {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, pct: val } : r));
  }

  const totalPct = rows.reduce((s, r) => s + (parseFloat(r.pct) || 0), 0);
  const remaining = 100 - totalPct;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div className="card-title" style={{ marginBottom: 0 }}>Distribute Excess</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)', fontSize: '1.1rem' }}>✕</button>
        </div>

        <div style={{ background: 'rgba(0,212,170,.1)', borderRadius: 8, padding: '10px 14px', marginBottom: 16 }}>
          <div style={{ fontSize: '.72rem', color: 'var(--text2)', marginBottom: 2 }}>Available to distribute</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent2)' }}>${fmt(excess)}</div>
        </div>

        <div style={{ fontSize: '.75rem', color: 'var(--text2)', marginBottom: 12 }}>
          Enter what % of the excess goes to each category. Leave blank to skip.
        </div>

        <div style={{ maxHeight: '45vh', overflowY: 'auto', marginBottom: 14 }}>
          {rows.map((r, i) => {
            const amt = (parseFloat(r.pct) || 0) / 100 * excess;
            return (
              <div key={r.category} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid rgba(46,51,80,.3)' }}>
                <div style={{ flex: 1, fontSize: '.85rem', fontWeight: 600 }}>{r.category}</div>
                <div style={{ position: 'relative', width: 70 }}>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    placeholder="0"
                    value={r.pct}
                    onChange={e => updatePct(i, e.target.value)}
                    style={{ width: '100%', paddingRight: 18 }}
                  />
                  <span style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', fontSize: '.75rem', color: 'var(--text2)', pointerEvents: 'none' }}>%</span>
                </div>
                <div style={{ width: 70, textAlign: 'right', fontSize: '.85rem', fontWeight: 700, color: amt > 0 ? 'var(--accent2)' : 'var(--text2)' }}>
                  {amt > 0 ? `$${fmt(amt)}` : '—'}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderTop: '1px solid var(--border)', marginBottom: 14 }}>
          <span style={{ fontSize: '.82rem', color: 'var(--text2)' }}>Total assigned</span>
          <span style={{ fontWeight: 800, color: Math.abs(remaining) < 0.01 ? 'var(--green)' : remaining < 0 ? 'var(--red)' : 'var(--yellow)' }}>
            {totalPct.toFixed(1)}% · ${fmt(totalPct / 100 * excess)}
          </span>
        </div>

        {remaining > 0.01 && (
          <div style={{ fontSize: '.75rem', color: 'var(--yellow)', marginBottom: 10 }}>
            ⚠ {remaining.toFixed(1)}% unassigned (${fmt(remaining / 100 * excess)})
          </div>
        )}
        {remaining < -0.01 && (
          <div style={{ fontSize: '.75rem', color: 'var(--red)', marginBottom: 10 }}>
            ✕ Over by {Math.abs(remaining).toFixed(1)}% — reduce some percentages
          </div>
        )}

        <div style={{ fontSize: '.72rem', color: 'var(--text2)', marginBottom: 14, lineHeight: 1.5 }}>
          These are your transfer instructions. Execute them manually or update your sheet.
        </div>

        <button className="run-btn" onClick={onClose} style={{ width: '100%' }}>Done</button>
      </div>
    </div>
  );
}
