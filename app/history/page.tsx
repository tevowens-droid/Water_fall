'use client';
import { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { HistoryEntry } from '@/lib/types';
import { toYearMonth, currentYearMonth, monthLabel, displayDate } from '@/lib/waterfall';

export default function HistoryPage() {
  const { history, setHistory } = useApp();

  // Compute unique months from history, sorted newest first
  const months = useMemo(() => {
    const set = new Set(history.map(r => toYearMonth(r.date)));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [history]);

  const defaultMonth = useMemo(() => {
    const cur = currentYearMonth();
    return months.includes(cur) ? cur : (months[0] ?? cur);
  }, [months]);

  const [selectedMonth, setSelectedMonth] = useState<string>(defaultMonth);

  // Update selectedMonth if defaultMonth changes (e.g. first load)
  const filtered = history
    .map((r, originalIndex) => ({ ...r, originalIndex }))
    .filter(r => toYearMonth(r.date) === selectedMonth);

  function updateAllocated(originalIndex: number, value: string) {
    const v = parseFloat(value);
    if (!isNaN(v) && v >= 0) {
      const next = [...history];
      next[originalIndex] = { ...next[originalIndex], allocated: v };
      setHistory(next);
    }
  }

  function deleteRow(originalIndex: number) {
    const entry = history[originalIndex];
    if (!confirm(`Delete entry for "${entry.category}" ($${entry.allocated.toFixed(2)})?`)) return;
    const next = [...history];
    next.splice(originalIndex, 1);
    setHistory(next);
  }

  function getStatus(r: HistoryEntry) {
    if (!r.target) return 'full';
    const pct = r.allocated / r.target * 100;
    return pct >= 100 ? 'full' : pct > 0 ? 'partial' : 'empty';
  }

  return (
    <div className="page">
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div className="card-title" style={{ marginBottom: 0 }}>Allocation History</div>
          {months.length > 0 && (
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              style={{ fontSize: '.85rem', padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text1)' }}
            >
              {months.map(m => (
                <option key={m} value={m}>{monthLabel(m)}</option>
              ))}
            </select>
          )}
        </div>

        {history.length === 0 ? (
          <div className="empty">
            <div className="icon">📋</div>
            <p>No history yet.<br />Run a waterfall to see allocations here.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty">
            <div className="icon">📋</div>
            <p>No entries for {monthLabel(selectedMonth)}.</p>
          </div>
        ) : (
          <table className="hist-table">
            <thead>
              <tr>
                <th>Pay Date</th>
                <th>Category</th>
                <th>Allocated (click to edit)</th>
                <th>Target</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const status = getStatus(r);
                const label = status === 'full' ? 'Funded' : status === 'partial' ? 'Partial' : 'Unfunded';
                return (
                  <tr key={r.originalIndex}>
                    <td>{displayDate(r.date)}</td>
                    <td>
                      {r.category}
                      {r.isOverflow && <span className="overflow-badge">overflow %</span>}
                    </td>
                    <td>
                      <input
                        className="hist-edit-input"
                        type="number"
                        defaultValue={r.allocated.toFixed(2)}
                        min={0}
                        step={0.01}
                        title="Click to edit"
                        onFocus={e => e.target.select()}
                        onBlur={e => updateAllocated(r.originalIndex, e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                      />
                    </td>
                    <td style={{ color: 'var(--text2)' }}>
                      {r.target ? '$' + r.target.toLocaleString() : '—'}
                    </td>
                    <td>
                      <span className={`pill pill-${status}`}>{label}</span>
                    </td>
                    <td>
                      <button className="hist-del-btn" title="Delete row" onClick={() => deleteRow(r.originalIndex)}>✕</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
