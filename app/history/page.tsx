'use client';
import { useApp } from '@/context/AppContext';
import { HistoryEntry } from '@/lib/types';

export default function HistoryPage() {
  const { history, setHistory } = useApp();

  function updateAllocated(index: number, value: string) {
    const v = parseFloat(value);
    if (!isNaN(v) && v >= 0) {
      const next = [...history];
      next[index] = { ...next[index], allocated: v };
      setHistory(next);
    }
  }

  function deleteRow(index: number) {
    const entry = history[index];
    if (!confirm(`Delete entry for "${entry.category}" ($${entry.allocated.toFixed(2)})?`)) return;
    const next = [...history];
    next.splice(index, 1);
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
        <div className="card-title">Allocation History</div>
        {history.length === 0 ? (
          <div className="empty">
            <div className="icon">📋</div>
            <p>No history yet.<br />Run a waterfall to see allocations here.</p>
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
              {history.map((r, i) => {
                const status = getStatus(r);
                const label = status === 'full' ? 'Funded' : status === 'partial' ? 'Partial' : 'Unfunded';
                return (
                  <tr key={i}>
                    <td>{r.date}</td>
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
                        onBlur={e => updateAllocated(i, e.target.value)}
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
                      <button className="hist-del-btn" title="Delete row" onClick={() => deleteRow(i)}>✕</button>
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
