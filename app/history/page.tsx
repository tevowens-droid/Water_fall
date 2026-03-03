'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { HistoryRow } from '@/lib/types';
import { parseHistoryDate, toYearMonth, currentYearMonth, monthLabel, displayDate } from '@/lib/waterfall';

export default function HistoryPage() {
  const [history, setHistory]   = useState<HistoryRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  const fetchHistory = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/sheets/history');
      if (!res.ok) { const t = await res.text(); throw new Error(t); }
      setHistory(await res.json());
    } catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  // Build sorted unique months from history
  const months = useMemo(() => {
    const set = new Set(history.map(r => toYearMonth(r.date)));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [history]);

  const defaultMonth = useMemo(() => {
    const cur = currentYearMonth();
    return months.includes(cur) ? cur : (months[0] ?? cur);
  }, [months]);

  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);

  // Update selected month if months change (first load)
  useEffect(() => {
    if (months.length > 0 && !months.includes(selectedMonth)) {
      setSelectedMonth(months[0]);
    }
  }, [months, selectedMonth]);

  const filtered = history.filter(r => toYearMonth(r.date) === selectedMonth);

  // Group by date within the month
  const byDate = filtered.reduce<Record<string, HistoryRow[]>>((acc, r) => {
    (acc[r.date] = acc[r.date] ?? []).push(r);
    return acc;
  }, {});
  const sortedDates = Object.keys(byDate).sort((a, b) =>
    parseHistoryDate(b).getTime() - parseHistoryDate(a).getTime()
  );

  const monthTotal = filtered.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="page">
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="card-title" style={{ marginBottom: 0 }}>Allocation History</div>
            <button onClick={fetchHistory} title="Refresh"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: '1rem', padding: 0 }}>↻</button>
          </div>
          {months.length > 0 && (
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              style={{ fontSize: '.85rem', padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text1)' }}
            >
              {months.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
            </select>
          )}
        </div>

        {loading && <div style={{ color: 'var(--text2)', padding: '20px 0' }}>⏳ Loading…</div>}

        {error && (
          <div style={{ color: 'var(--red)', fontSize: '.85rem', marginBottom: 10 }}>
            {error} — <button onClick={fetchHistory} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline' }}>Retry</button>
          </div>
        )}

        {!loading && !error && history.length === 0 && (
          <div className="empty"><div className="icon">📋</div><p>No history yet in your Google Sheet.</p></div>
        )}

        {!loading && !error && history.length > 0 && filtered.length === 0 && (
          <div className="empty"><div className="icon">📋</div><p>No entries for {monthLabel(selectedMonth)}.</p></div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <>
            <div style={{ fontSize: '.72rem', color: 'var(--text2)', marginBottom: 12 }}>
              {filtered.length} entries · Month total: <strong style={{ color: 'var(--accent2)' }}>${monthTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
            </div>

            {sortedDates.map(date => {
              const rows      = byDate[date];
              const dateTotal = rows.reduce((s, r) => s + r.amount, 0);
              return (
                <div key={date} style={{ marginBottom: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ fontSize: '.78rem', fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '.8px' }}>
                      {displayDate(date)}
                    </div>
                    <div style={{ fontSize: '.78rem', fontWeight: 700, color: 'var(--accent2)' }}>${dateTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  </div>
                  <table className="hist-table">
                    <thead>
                      <tr>
                        <th>Category</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr key={i}>
                          <td>{r.category}</td>
                          <td style={{ color: 'var(--accent2)', fontWeight: 700 }}>${r.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
