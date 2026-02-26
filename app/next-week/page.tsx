'use client';
import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { SheetData, SheetRow } from '@/lib/types';
import { parseHistoryDate, fmt } from '@/lib/waterfall';

const METHOD_ICONS: Record<string, string> = {
  Transfer: '🔄', Zelle: '💛', Wire: '🏦', ACH: '📋',
  Cash: '💵', Check: '📝', 'Bill Pay': '🧾', Other: '📌',
};

function fmtDate(s: string) {
  if (!s) return '';
  try {
    return parseHistoryDate(s).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return s; }
}

export default function NextWeekPage() {
  const { flows } = useApp();
  const [data, setData]       = useState<SheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [activeTab, setActiveTab] = useState<'flow' | 'alloc'>('flow');
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [saving, setSaving]   = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/sheets');
      if (!res.ok) { const t = await res.text(); throw new Error(t); }
      const json: SheetData = await res.json();
      setData(json);
      const init: Record<string, string> = {};
      json.nextWeek.rows.forEach(r => {
        if (r.override !== null) init[r.category] = String(r.override);
      });
      setOverrides(init);
    } catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function saveOverride(row: SheetRow) {
    const val = overrides[row.category];
    if (val === undefined || val === String(row.override ?? '')) return;
    setSaving(row.category);
    try {
      const value = val.trim() === '' ? null : parseFloat(val);
      await fetch('/api/sheets/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rowNumber: row.rowNumber, value, week: 'nextWeek' }),
      });
      await fetchData();
    } finally { setSaving(null); }
  }

  const week = data?.nextWeek;
  const effAmt = (r: SheetRow) => r.override ?? r.allocation;
  const fundedRows = week?.rows.filter(r => effAmt(r) > 0) ?? [];

  const accountMap: Record<string, { account: string; total: number; categories: string[]; method: string }> = {};
  fundedRows.forEach(r => {
    (flows[r.category] ?? []).forEach(s => {
      if (!s.account) return;
      const key = s.account.trim().toLowerCase();
      if (!accountMap[key]) accountMap[key] = { account: s.account.trim(), total: 0, categories: [], method: s.method };
      accountMap[key].total += effAmt(r);
      if (!accountMap[key].categories.includes(r.category)) accountMap[key].categories.push(r.category);
    });
  });

  return (
    <div className="page">
      {loading && (
        <div className="loading-wrap">
          <div className="spinner" />
          Loading
        </div>
      )}
      {error && (
        <div className="card" style={{ borderColor: 'var(--red)' }}>
          <strong style={{ color: 'var(--red)' }}>Could not load Sheets data</strong>
          <p style={{ fontSize: '.8rem', color: 'var(--text2)', margin: '6px 0 10px' }}>{error}</p>
          <button className="run-btn" onClick={fetchData}>Retry</button>
        </div>
      )}

      {!loading && !error && data && week && (
        <div className="budget-grid">

          <div className="budget-paycheck">
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div className="card-title" style={{ marginBottom: 0 }}>Next Week</div>
                <button onClick={fetchData} title="Refresh" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: '1rem', padding: 0 }}>↻</button>
              </div>

              <div className="input-group">
                <label>Pay Date</label>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text1)', padding: '8px 0' }}>{fmtDate(week.payDate)}</div>
              </div>

              <div className="input-group">
                <label>Estimated Amount</label>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent)' }}>${fmt(week.amount)}</div>
              </div>

              {week.left > 0.01 && (
                <div style={{ background: 'rgba(255,199,0,.08)', border: '1px solid var(--yellow)', borderRadius: 10, padding: '10px 14px', marginTop: 10 }}>
                  <div style={{ fontSize: '.72rem', fontWeight: 700, color: 'var(--yellow)' }}>Projected Excess</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--yellow)' }}>${fmt(week.left)}</div>
                </div>
              )}

              <div style={{ fontSize: '.72rem', color: 'var(--text2)', marginTop: 12, lineHeight: 1.5 }}>
                Projection only — no changes saved to history until pay day.
              </div>
            </div>
          </div>

          <div className="budget-results">
            <div className="card">
              <div className="tab-bar">
                <div className={'tab' + (activeTab === 'flow' ? ' active' : '')} onClick={() => setActiveTab('flow')}>💸 Money Flow</div>
                <div className={'tab' + (activeTab === 'alloc' ? ' active' : '')} onClick={() => setActiveTab('alloc')}>Allocations</div>
              </div>

              {activeTab === 'flow' && (
                <div className="wf-list">
                  {fundedRows.length === 0 ? (
                    <div className="empty"><div className="icon">💸</div><p>No projected allocations yet.</p></div>
                  ) : (
                    <>
                      {Object.keys(accountMap).length > 0 && (
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ fontSize: '.67rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.4px', color: 'var(--text2)', marginBottom: 8 }}>Account Totals</div>
                          {Object.values(accountMap).map(a => (
                            <div key={a.account} style={{ background: 'var(--surface3)', borderRadius: 9, padding: '11px 14px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                              <div style={{ fontSize: '1.3rem' }}>{METHOD_ICONS[a.method] || '📌'}</div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 700, fontSize: '.92rem' }}>{a.account}</div>
                                <div style={{ fontSize: '.7rem', color: 'var(--text2)', marginTop: 2 }}>{a.categories.join(', ')}</div>
                              </div>
                              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--accent)' }}>${fmt(a.total)}</div>
                            </div>
                          ))}
                          <div style={{ fontSize: '.67rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.4px', color: 'var(--text2)', margin: '12px 0 8px' }}>Per Category</div>
                        </div>
                      )}
                      {fundedRows.map(r => {
                        const amt      = effAmt(r);
                        const catFlows = flows[r.category] ?? [];
                        return (
                          <div key={r.category} style={{ background: 'var(--surface2)', borderRadius: 10, padding: '12px 15px', marginBottom: 7, border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: catFlows.length ? 9 : 0 }}>
                              <div className="wf-num full" style={{ width: 22, height: 22, fontSize: '.68rem' }}>✓</div>
                              <span style={{ fontWeight: 700, fontSize: '.88rem', flex: 1 }}>{r.category}</span>
                              {r.override !== null && <span style={{ fontSize: '.63rem', background: 'rgba(255,199,0,.15)', color: 'var(--yellow)', fontWeight: 700, padding: '2px 6px', borderRadius: 4 }}>override</span>}
                              <span style={{ fontWeight: 700, fontSize: '.93rem', color: 'var(--accent)' }}>${fmt(amt)}</span>
                            </div>
                            {catFlows.length === 0 ? (
                              <div style={{ fontSize: '.75rem', color: 'var(--text2)', fontStyle: 'italic' }}>No flow set — add steps in ⚙️ Settings.</div>
                            ) : (
                              <div className="flow-step-list">
                                {catFlows.map((s, si) => (
                                  <span key={si}>
                                    {si > 0 && <div className="step-connector" />}
                                    <div className="flow-step-item">
                                      <div className="step-circle">{si + 1}</div>
                                      <div className="step-text">
                                        <span className="step-method">{METHOD_ICONS[s.method] || '📌'} {s.method}</span>
                                        <span style={{ color: 'var(--text2)' }}> → </span>
                                        <span className="step-account">{s.account || '—'}</span>
                                      </div>
                                    </div>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              )}

              {activeTab === 'alloc' && (
                <div className="wf-list">
                  <div style={{ fontSize: '.7rem', color: 'var(--text2)', marginBottom: 10 }}>
                    Projected allocations. Override writes back to your sheet.
                  </div>
                  {week.rows.map(r => (
                    <div key={r.category} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(46,51,80,.4)' }}>
                      <div style={{ flex: 1, fontSize: '.85rem', fontWeight: 600 }}>{r.category}</div>
                      <div style={{ textAlign: 'right', minWidth: 70 }}>
                        <div style={{ fontSize: '.85rem', fontWeight: 700, color: r.allocation > 0 ? 'var(--accent)' : 'var(--text2)' }}>${fmt(r.allocation)}</div>
                        {r.monthlyNeed > 0 && <div style={{ fontSize: '.63rem', color: 'var(--text2)' }}>need ${fmt(r.monthlyNeed)}</div>}
                      </div>
                      <input
                        className="hist-edit-input"
                        type="number"
                        placeholder="override"
                        value={overrides[r.category] ?? (r.override !== null ? String(r.override) : '')}
                        step={0.01}
                        onChange={e => setOverrides(prev => ({ ...prev, [r.category]: e.target.value }))}
                        onBlur={() => saveOverride(r)}
                        onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                        style={{ width: 90, opacity: saving === r.category ? 0.5 : 1 }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="budget-cats">
            <div className="card">
              <div className="card-title">Monthly Progress</div>
              {week.rows.map((r, i) => {
                const isFull = r.remaining === 0;
                const pct    = r.monthlyNeed > 0 ? Math.min(100, (r.monthlyNeed - r.remaining) / r.monthlyNeed * 100) : (isFull ? 100 : 0);
                return (
                  <div key={r.category} style={{ padding: '8px 4px', borderBottom: i < week.rows.length - 1 ? '1px solid rgba(46,51,80,.4)' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: r.monthlyNeed > 0 ? 5 : 0 }}>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', background: isFull ? 'var(--green)' : 'var(--border)', color: isFull ? '#000' : 'var(--text2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.63rem', fontWeight: 700, flexShrink: 0 }}>
                        {isFull ? '✓' : i + 1}
                      </div>
                      <span style={{ flex: 1, fontSize: '.82rem', fontWeight: 600 }}>{r.category}</span>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: '.8rem', fontWeight: 700, color: isFull ? 'var(--green)' : r.remaining > 0 ? 'var(--accent)' : 'var(--text2)' }}>
                          {isFull ? 'Funded' : r.remaining > 0 ? `$${fmt(r.remaining)} left` : '—'}
                        </div>
                        {r.monthlyNeed > 0 && <div style={{ fontSize: '.63rem', color: 'var(--text2)' }}>of ${r.monthlyNeed.toLocaleString()}</div>}
                      </div>
                    </div>
                    {r.monthlyNeed > 0 && (
                      <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, marginLeft: 28, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: isFull ? 'var(--green)' : pct > 0 ? 'var(--accent)' : 'var(--border)', borderRadius: 2, transition: 'width .6s ease' }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
