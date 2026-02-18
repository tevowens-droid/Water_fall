'use client';
import { useState, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { calcWaterfall, getMTDMap, fmt } from '@/lib/waterfall';
import { WaterfallResult } from '@/lib/types';

const METHOD_ICONS: Record<string, string> = {
  Transfer: '🔄', Zelle: '💛', Wire: '🏦', ACH: '📋',
  Cash: '💵', Check: '📝', 'Bill Pay': '🧾', Other: '📌',
};

export default function NextWeekPage() {
  const { categories, history, sheetsUrl } = useApp();

  const [payDate, setPayDate] = useState('');
  const [estAmt, setEstAmt] = useState('');
  const [actAmt, setActAmt] = useState('');
  const [mode, setMode] = useState<'est' | 'act'>('est');
  const [results, setResults] = useState<WaterfallResult[] | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [activeTab, setActiveTab] = useState<'wf' | 'flow'>('wf');
  const fillRefs = useRef<HTMLDivElement[]>([]);

  // Auto-set date to this week + 7
  useEffect(() => {
    const base = new Date();
    base.setDate(base.getDate() + 7);
    setPayDate(base.toISOString().split('T')[0]);
  }, []);

  const est = parseFloat(estAmt);
  const act = parseFloat(actAmt);
  const hasEst = !isNaN(est) && est > 0;
  const hasAct = !isNaN(act) && act > 0;
  const diff = hasEst && hasAct ? act - est : null;

  function handleActChange(val: string) {
    setActAmt(val);
    const a = parseFloat(val);
    if (!isNaN(a) && a > 0) setMode('act');
  }

  function runWaterfall() {
    const primary = mode === 'act' && hasAct ? act : est;
    if (!primary || primary <= 0) { alert('Please enter a paycheck amount.'); return; }
    if (!payDate) { alert('Please select a pay date.'); return; }

    const res = calcWaterfall(primary, payDate, categories, history);
    const totalAlloc = res.reduce((s, r) => s + r.allocated, 0);
    setResults(res);
    setRemaining(primary - totalAlloc);
    fillRefs.current = [];
    // Next week runs are NOT saved to history — projections only
  }

  async function syncFromSheets() {
    if (!sheetsUrl) { alert('Configure your Google Sheets URL in ⚙️ Settings first.'); return; }
    try {
      const data = await fetchFromSheets(sheetsUrl);
      if (data.nextWeek) {
        if (data.nextWeek.date) setPayDate(data.nextWeek.date);
        if (data.nextWeek.estimate) setEstAmt(String(data.nextWeek.estimate));
      }
    } catch (e: unknown) {
      alert('Failed to sync: ' + (e instanceof Error ? e.message : String(e)));
    }
  }

  const mtdMap = getMTDMap(payDate || new Date().toISOString().split('T')[0], categories, history);

  const funded  = results?.filter(r => r.status === 'full').length ?? 0;
  const partial = results?.filter(r => r.status === 'partial').length ?? 0;
  const skipped = results?.filter(r => r.status === 'skipped').length ?? 0;
  const totalAlloc = results?.reduce((s, r) => s + r.allocated, 0) ?? 0;
  const fundedRows = results?.filter(r => r.allocated > 0) ?? [];

  const accountMap: Record<string, { account: string; total: number; categories: string[]; method: string }> = {};
  fundedRows.forEach(r => {
    if (!r.flow?.length) return;
    r.flow.forEach(s => {
      if (!s.account) return;
      const key = s.account.trim().toLowerCase();
      if (!accountMap[key]) accountMap[key] = { account: s.account.trim(), total: 0, categories: [], method: s.method };
      accountMap[key].total += r.allocated;
      if (!accountMap[key].categories.includes(r.name)) accountMap[key].categories.push(r.name);
    });
  });

  return (
    <div className="page">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ background: 'rgba(108,99,255,.15)', border: '1px solid rgba(108,99,255,.3)', borderRadius: 8, padding: '7px 14px', fontSize: '.78rem', color: 'var(--accent)' }}>
          📅 Planning ahead — this week&apos;s confirmed allocations will be factored in automatically
        </div>
      </div>

      <div className="budget-grid">
        {/* ── LEFT ── */}
        <div>
          <div className="card">
            <div className="card-title">Paycheck</div>
            <button
              onClick={syncFromSheets}
              style={{ background: 'var(--accent2)', color: '#000', border: 'none', borderRadius: 6, padding: '5px 11px', fontSize: '.75rem', fontWeight: 700, cursor: 'pointer', marginBottom: 10, width: '100%' }}
            >
              📊 Sync from Google Sheets
            </button>

            <div className="input-group">
              <label>Pay Date</label>
              <input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} />
            </div>

            <div className="amount-cols">
              <div className="amount-col est">
                <label>📊 Estimate</label>
                <input type="number" placeholder="e.g. 2870" step="0.01" value={estAmt} onChange={e => setEstAmt(e.target.value)} />
                <div className="field-hint"><span className="dot" />From Google Sheet</div>
              </div>
              <div className="amount-col act">
                <label>✉️ Actual</label>
                <input type="number" placeholder="From email" step="0.01" value={actAmt} onChange={e => handleActChange(e.target.value)} />
                <div className="field-hint">
                  <span className={'dot' + (hasAct ? ' on' : '')} />
                  {hasAct ? 'Confirmed ✓' : 'Pending email'}
                </div>
              </div>
            </div>

            {diff !== null && (
              <div className="diff-bar">
                <span className="lbl">Estimate vs Actual</span>
                {diff > 0
                  ? <span className="diff-pos">+${Math.abs(diff).toFixed(2)} more</span>
                  : diff < 0
                    ? <span className="diff-neg">-${Math.abs(diff).toFixed(2)} less</span>
                    : <span className="diff-zero">Exact match ✓</span>
                }
              </div>
            )}

            <div className="card-title" style={{ marginTop: 2 }}>Run with</div>
            <div className="mode-row">
              <div className={'mode-btn' + (mode === 'est' ? ' m-est' : '')} onClick={() => setMode('est')}>📊 Estimate</div>
              <div className={'mode-btn' + (mode === 'act' ? ' m-act' : '')} onClick={() => setMode('act')}>✉️ Actual</div>
            </div>

            <button className="run-btn" onClick={runWaterfall}>▶ Run Waterfall</button>

            {results && (
              <div className="remaining-row">
                <span className="lbl">Remaining after allocation</span>
                <span className={'val ' + (remaining >= 0 ? 'v-pos' : 'v-neg')}>${remaining.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Category List */}
          <div className="card">
            <div className="card-title">
              Categories <span style={{ fontSize: '.65rem', color: 'var(--accent)', fontWeight: 600, marginLeft: 4 }}>incl. this week&apos;s MTD</span>
            </div>
            {results ? (
              results.map((r, i) => {
                const target    = r.target || 0;
                const prevMTD   = r.mtd || 0;
                const newTotal  = prevMTD + r.allocated;
                const pct       = target > 0 ? Math.min(100, newTotal / target * 100) : (newTotal > 0 ? 100 : 0);
                const prevPct   = target > 0 ? Math.min(100, prevMTD / target * 100) : 0;
                const isFull    = r.status === 'full' || r.status === 'skipped';
                const isSkipped = r.status === 'skipped';
                const numBg     = isFull ? 'var(--green)' : r.allocated > 0 ? 'var(--accent)' : 'var(--border)';
                const numColor  = isFull ? '#000' : r.allocated > 0 ? '#fff' : 'var(--text2)';
                const numLbl    = isFull ? '✓' : r.allocated > 0 ? '+' : String(i + 1);
                const amtColor  = isFull ? 'var(--green)' : r.allocated > 0 ? 'var(--accent)' : 'var(--text2)';
                return (
                  <div key={r.name} style={{ padding: '8px 4px', borderBottom: i < results.length - 1 ? '1px solid rgba(46,51,80,.4)' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: target ? 5 : 0 }}>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', background: numBg, color: numColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.63rem', fontWeight: 700, flexShrink: 0 }}>{numLbl}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '.82rem', fontWeight: 600 }}>{r.name}</span>
                          <span className={`type-badge type-${r.type}`}>{r.type === 'F' ? 'Fixed' : 'Var'}</span>
                          {isSkipped && <span style={{ fontSize: '.63rem', color: 'var(--accent2)', fontWeight: 700 }}>✓ Already paid</span>}
                          {r.allocated > 0 && !isSkipped && <span style={{ fontSize: '.63rem', color: 'var(--accent)', fontWeight: 700 }}>+${r.allocated.toFixed(2)} projected</span>}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: '.8rem', fontWeight: 700, color: amtColor }}>${fmt(newTotal)}</div>
                        {target > 0 && <div style={{ fontSize: '.63rem', color: 'var(--text2)' }}>of ${target.toLocaleString()}</div>}
                      </div>
                    </div>
                    {target > 0 && (
                      <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, marginLeft: 28, overflow: 'hidden', position: 'relative' }}>
                        <div style={{ height: '100%', width: `${prevPct}%`, background: 'var(--surface3)', borderRadius: 2, position: 'absolute', left: 0 }} />
                        <div style={{ height: '100%', width: `${pct}%`, background: isFull ? 'var(--green)' : 'var(--accent)', borderRadius: 2, transition: 'width .7s ease' }} />
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              categories.map((cat, i) => {
                const paid   = mtdMap[cat.name] || 0;
                const target = cat.target || 0;
                const pct    = target > 0 ? Math.min(100, paid / target * 100) : (paid > 0 ? 100 : 0);
                const isFull = target > 0 && paid >= target;
                return (
                  <div key={cat.name} style={{ padding: '8px 4px', borderBottom: i < categories.length - 1 ? '1px solid rgba(46,51,80,.4)' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: target ? 5 : 0 }}>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', background: isFull ? 'var(--green)' : 'var(--border)', color: isFull ? '#000' : 'var(--text2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.63rem', fontWeight: 700, flexShrink: 0 }}>{isFull ? '✓' : i + 1}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ fontSize: '.82rem', fontWeight: 600 }}>{cat.name}</span>
                          <span className={`type-badge type-${cat.type}`}>{cat.type === 'F' ? 'Fixed' : 'Var'}</span>
                          {isFull && <span style={{ fontSize: '.63rem', color: 'var(--green)', fontWeight: 700 }}>Already paid</span>}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '.8rem', fontWeight: 700, color: isFull ? 'var(--green)' : paid > 0 ? 'var(--accent)' : 'var(--text2)' }}>{paid > 0 ? '$' + fmt(paid) : '—'}</div>
                        {target > 0 && <div style={{ fontSize: '.63rem', color: 'var(--text2)' }}>of ${target.toLocaleString()}</div>}
                      </div>
                    </div>
                    {target > 0 && (
                      <div style={{ height: 3, background: 'var(--border)', borderRadius: 2, marginLeft: 28, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: isFull ? 'var(--green)' : pct > 0 ? 'var(--accent)' : 'var(--border)', borderRadius: 2, transition: 'width .6s ease' }} />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── RIGHT ── */}
        <div>
          {diff !== null && diff !== 0 && (
            <div className="banner">
              <span>⚠️</span>
              <span className="msg">
                {diff > 0
                  ? `Actual is $${diff.toFixed(2)} more than estimate.`
                  : `Actual is $${Math.abs(diff).toFixed(2)} less than estimate.`}
              </span>
              <button onClick={() => { setMode('act'); runWaterfall(); }}>Re-run with Actual</button>
            </div>
          )}

          <div className="card">
            <div className="card-title">Summary</div>
            <div className="summary-grid">
              <div className="stat"><div className="v" style={{ color: 'var(--green)' }}>{results ? funded : '—'}</div><div className="l">Funded</div></div>
              <div className="stat"><div className="v" style={{ color: 'var(--accent)' }}>{results ? partial : '—'}</div><div className="l">Partial</div></div>
              <div className="stat"><div className="v" style={{ color: 'var(--accent2)' }}>{results ? skipped : '—'}</div><div className="l">Already Paid</div></div>
              <div className="stat"><div className="v" style={{ color: 'var(--yellow)' }}>{results ? '$' + totalAlloc.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '—'}</div><div className="l">Projected</div></div>
            </div>
          </div>

          <div className="card">
            <div className="tab-bar">
              <div className={'tab' + (activeTab === 'wf' ? ' active' : '')} onClick={() => setActiveTab('wf')}>Waterfall</div>
              <div className={'tab' + (activeTab === 'flow' ? ' active' : '')} onClick={() => setActiveTab('flow')}>💸 Money Flow</div>
            </div>

            {activeTab === 'wf' && (
              <div className="wf-list">
                {!fundedRows.length ? (
                  <div className="empty"><div className="icon">💧</div><p>Hit <strong>Run Waterfall</strong> to see<br />next week&apos;s projected allocations.</p></div>
                ) : (
                  fundedRows.map((r, i) => {
                    const pct = r.target ? Math.min(100, r.allocated / r.target * 100) : 100;
                    const idx = results?.indexOf(r) ?? i;
                    const flowSummary = r.flow?.length
                      ? r.flow.map((s, si) => (
                          <span key={si}><span className="flow-step">{s.account || '—'}</span>{si < r.flow.length - 1 && <span className="flow-arrow"> → </span>}</span>
                        ))
                      : <span style={{ fontSize: '.67rem', color: 'var(--border)' }}>No flow set</span>;
                    return (
                      <div key={r.name} className="wf-row">
                        <div
                          className={`wf-fill ${r.status}`}
                          style={{ width: '0%' }}
                          ref={el => { if (el) { fillRefs.current[i] = el; setTimeout(() => { el.style.width = pct + '%'; }, 50 + i * 55); } }}
                        />
                        <div className="wf-content">
                          <div className={`wf-num ${r.status}`}>{idx + 1}</div>
                          <div className="wf-info">
                            <div className="wf-name-row">
                              <span className="wf-name">{r.name}</span>
                              <span className={`type-badge type-${r.type}`}>{r.type === 'F' ? 'Fixed' : 'Var'}</span>
                            </div>
                            <div className="flow-pill">{flowSummary}</div>
                          </div>
                          <div className="wf-right">
                            <div className={`wf-amt ${r.status}`}>${fmt(r.allocated)}</div>
                            <div className="wf-sub">{r.target ? 'of $' + r.target.toLocaleString() : 'no target'} · {pct.toFixed(0)}%</div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {activeTab === 'flow' && (
              <div className="wf-list">
                {!fundedRows.length
                  ? <div className="empty"><div className="icon">💸</div><p>Hit <strong>Run Waterfall</strong> to see<br />your transfer instructions.</p></div>
                  : (
                    <>
                      {Object.values(accountMap).length > 0 && (
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ fontSize: '.67rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.4px', color: 'var(--text2)', marginBottom: 8 }}>Account Totals</div>
                          {Object.values(accountMap).map(a => (
                            <div key={a.account} style={{ background: 'var(--surface3)', borderRadius: 9, padding: '11px 14px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                              <div style={{ fontSize: '1.3rem' }}>{METHOD_ICONS[a.method] || '📌'}</div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700, fontSize: '.92rem' }}>{a.account}</div>
                                <div style={{ fontSize: '.7rem', color: 'var(--text2)', marginTop: 2 }}>{a.categories.join(', ')}</div>
                              </div>
                              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--accent2)' }}>${fmt(a.total)}</div>
                            </div>
                          ))}
                        </div>
                      )}
                      {fundedRows.map(r => {
                        const amtColor = r.status === 'full' ? 'var(--green)' : r.status === 'partial' ? 'var(--accent)' : 'var(--text2)';
                        return (
                          <div key={r.name} style={{ background: 'var(--surface2)', borderRadius: 10, padding: '12px 15px', marginBottom: 7, border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div className={`wf-num ${r.status}`} style={{ width: 22, height: 22, fontSize: '.68rem' }}>✓</div>
                              <span style={{ fontWeight: 700, fontSize: '.88rem' }}>{r.name}</span>
                              <span className={`type-badge type-${r.type}`}>{r.type === 'F' ? 'Fixed' : 'Var'}</span>
                              <span style={{ marginLeft: 'auto', fontWeight: 700, fontSize: '.93rem', color: amtColor }}>${r.allocated.toFixed(2)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function fetchFromSheets(url: string): Promise<Record<string, { date?: string; estimate?: number }>> {
  return new Promise((resolve, reject) => {
    const cb = 'sc_' + Date.now();
    const script = document.createElement('script');
    (window as unknown as Record<string, unknown>)[cb] = (data: Record<string, { date?: string; estimate?: number }>) => {
      delete (window as unknown as Record<string, unknown>)[cb];
      document.body.removeChild(script);
      resolve(data);
    };
    script.onerror = () => {
      delete (window as unknown as Record<string, unknown>)[cb];
      document.body.removeChild(script);
      reject(new Error('Failed to load Sheets data'));
    };
    script.src = url + '?callback=' + cb;
    document.body.appendChild(script);
  });
}
