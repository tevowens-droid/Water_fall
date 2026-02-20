'use client';
import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Category, FlowStep } from '@/lib/types';

const METHODS = ['Transfer', 'Zelle', 'Wire', 'ACH', 'Cash', 'Check', 'Bill Pay', 'Other'];

export default function SettingsPage() {
  const { categories, setCategories, sheetsUrl, setSheetsUrl } = useApp();

  // Work on a local draft so unsaved edits don't affect live waterfall
  const [draft, setDraft] = useState<Category[]>([]);
  const [toast, setToast] = useState(false);
  const [sheetsInput, setSheetsInput] = useState(sheetsUrl);
  const [sheetsStatus, setSheetsStatus] = useState('');

  useEffect(() => {
    setDraft(categories.map(c => ({ ...c, flow: c.flow.map(f => ({ ...f })) })));
  }, [categories]);

  function updateCat(i: number, field: keyof Category, value: unknown) {
    const next = draft.map((c, idx) => idx === i ? { ...c, [field]: value } : c);
    setDraft(next);
  }

  function moveCat(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= draft.length) return;
    const next = [...draft];
    [next[i], next[j]] = [next[j], next[i]];
    setDraft(next);
  }

  function deleteCat(i: number) {
    if (!confirm(`Remove "${draft[i].name}"?`)) return;
    setDraft(draft.filter((_, idx) => idx !== i));
  }

  function addCat() {
    setDraft([...draft, { name: 'New Category', type: 'F', target: null, weeklyTarget: null, flow: [] }]);
    setTimeout(() => {
      const inputs = document.querySelectorAll<HTMLInputElement>('#catTableBody tr:last-child input[type=text]');
      if (inputs[0]) { inputs[0].focus(); inputs[0].select(); }
    }, 50);
  }

  // Flow editor helpers
  function addFlowStep(ci: number) {
    const next = draft.map((c, i) => i !== ci ? c : { ...c, flow: [...c.flow, { method: 'Transfer', account: '' }] });
    setDraft(next);
  }

  function updateFlowStep(ci: number, si: number, field: keyof FlowStep, value: string) {
    const next = draft.map((c, i) => {
      if (i !== ci) return c;
      const flow = c.flow.map((s, j) => j === si ? { ...s, [field]: value } : s);
      return { ...c, flow };
    });
    setDraft(next);
  }

  function removeFlowStep(ci: number, si: number) {
    const next = draft.map((c, i) => {
      if (i !== ci) return c;
      return { ...c, flow: c.flow.filter((_, j) => j !== si) };
    });
    setDraft(next);
  }

  function saveSettings() {
    setCategories(draft);
    if (sheetsInput.trim()) setSheetsUrl(sheetsInput.trim());
    setToast(true);
    setTimeout(() => setToast(false), 2000);
  }

  async function testSheetsConnection() {
    const url = sheetsInput.trim();
    if (!url) { setSheetsStatus('❌ Please enter a URL first'); return; }
    setSheetsStatus('⏳ Testing...');
    try {
      const data = await fetchFromSheets(url);
      if (data.thisWeek && data.nextWeek) {
        setSheetsStatus('✓ Connected! Found This Week & Next Week data.');
        setSheetsUrl(url);
      } else {
        setSheetsStatus('⚠️ Connected but unexpected format.');
      }
    } catch {
      setSheetsStatus('❌ Connection failed.');
    }
  }

  function showSheetsHelp() {
    alert(`📊 GOOGLE SHEETS INTEGRATION SETUP

1. Open your Google Sheet
2. Go to Extensions → Apps Script
3. Paste the Apps Script code
4. Update cell references to match your sheet
5. Save and Deploy → New deployment
6. Choose "Web app", set "Anyone" access
7. Copy the Web App URL and paste it above
8. Click "Test Connection"`);
  }

  return (
    <div className="page">
      <div className="settings-grid">

        {/* Categories table */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-title">Categories &amp; Targets</div>
          <table className="settings-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Category Name</th>
                <th>Type</th>
                <th>Monthly Target ($)</th>
                <th>Weekly Cap ($)</th>
                <th></th>
              </tr>
            </thead>
            <tbody id="catTableBody">
              {draft.map((cat, i) => (
                <tr key={i}>
                  <td style={{ color: 'var(--text2)', fontSize: '.8rem', textAlign: 'center' }}>{i + 1}</td>
                  <td>
                    <input
                      type="text"
                      value={cat.name}
                      onChange={e => updateCat(i, 'name', e.target.value)}
                    />
                  </td>
                  <td>
                    <select value={cat.type} onChange={e => updateCat(i, 'type', e.target.value as 'F' | 'V')}>
                      <option value="F">Fixed</option>
                      <option value="V">Variable</option>
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      value={cat.target ?? ''}
                      placeholder="—"
                      step={0.01}
                      onChange={e => updateCat(i, 'target', e.target.value ? parseFloat(e.target.value) : null)}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={cat.weeklyTarget ?? ''}
                      placeholder="—"
                      step={0.01}
                      title="Max this category takes per paycheck (leave blank for no cap)"
                      onChange={e => updateCat(i, 'weeklyTarget', e.target.value ? parseFloat(e.target.value) : null)}
                    />
                  </td>
                  <td>
                    <button className="icon-btn" title="Move up" onClick={() => moveCat(i, -1)}>↑</button>
                    <button className="icon-btn" title="Move down" onClick={() => moveCat(i, 1)}>↓</button>
                    <button className="icon-btn del" title="Delete" onClick={() => deleteCat(i)}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="add-btn" onClick={addCat}>+ Add Category</button>
        </div>

        {/* Flow instructions */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-title">Money Flow Instructions</div>
          <p style={{ fontSize: '.8rem', color: 'var(--text2)', marginBottom: 14 }}>
            For each category, define where the money goes and how it gets there.
          </p>
          {draft.map((cat, ci) => (
            <div key={ci} style={{ marginBottom: 20, paddingBottom: 18, borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontWeight: 700, fontSize: '.88rem' }}>{cat.name}</span>
                <span className={`type-badge type-${cat.type}`}>{cat.type === 'F' ? 'Fixed' : 'Var'}</span>
                {cat.target && <span style={{ fontSize: '.75rem', color: 'var(--text2)' }}>${cat.target.toLocaleString()}</span>}
              </div>
              <div className="flow-editor">
                {cat.flow.length === 0 && (
                  <div style={{ fontSize: '.78rem', color: 'var(--text2)', marginBottom: 6 }}>No steps yet.</div>
                )}
                {cat.flow.map((s, si) => (
                  <span key={si}>
                    {si > 0 && <div style={{ fontSize: '.7rem', color: 'var(--text2)', padding: '2px 0 2px 4px' }}>then ↓</div>}
                    <div className="flow-step-row">
                      <select value={s.method} onChange={e => updateFlowStep(ci, si, 'method', e.target.value)}>
                        {METHODS.map(m => <option key={m}>{m}</option>)}
                      </select>
                      <input
                        type="text"
                        placeholder="Landing account name"
                        value={s.account}
                        onChange={e => updateFlowStep(ci, si, 'account', e.target.value)}
                      />
                      <button className="icon-btn del" onClick={() => removeFlowStep(ci, si)}>✕</button>
                    </div>
                  </span>
                ))}
              </div>
              <button className="add-btn" style={{ marginTop: 6 }} onClick={() => addFlowStep(ci)}>+ Add Step</button>
            </div>
          ))}
        </div>

        {/* Google Sheets Integration */}
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          <div className="card-title">📊 Google Sheets Integration</div>
          <p style={{ fontSize: '.8rem', color: 'var(--text2)', marginBottom: 14 }}>
            Auto-sync paycheck dates and estimates from your Google Sheet.{' '}
            <a href="#" onClick={e => { e.preventDefault(); showSheetsHelp(); }} style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
              Setup instructions
            </a>
          </p>
          <div className="input-group">
            <label>Google Apps Script Web App URL</label>
            <input
              type="text"
              value={sheetsInput}
              onChange={e => setSheetsInput(e.target.value)}
              placeholder="https://script.google.com/macros/s/AKfycby.../exec"
              style={{ fontFamily: 'monospace', fontSize: '.8rem' }}
            />
            <div style={{ fontSize: '.7rem', color: 'var(--text2)', marginTop: 4 }}>
              Paste the URL from your deployed Google Apps Script here.{' '}
              <span style={{ fontWeight: 700, color: sheetsStatus.startsWith('✓') ? 'var(--green)' : sheetsStatus.startsWith('❌') ? 'var(--red)' : 'var(--text2)' }}>
                {sheetsStatus}
              </span>
            </div>
          </div>
          <button
            className="save-btn"
            onClick={testSheetsConnection}
            style={{ background: 'var(--accent2)', marginTop: 8 }}
          >
            🔗 Test Connection
          </button>
        </div>
      </div>

      <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
        <button className="save-btn" onClick={saveSettings}>💾 Save Settings</button>
        <span className={'saved-toast' + (toast ? ' show' : '')}>Saved ✓</span>
      </div>
    </div>
  );
}

function fetchFromSheets(url: string): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const cb = 'sc_' + Date.now();
    const script = document.createElement('script');
    (window as unknown as Record<string, unknown>)[cb] = (data: Record<string, unknown>) => {
      delete (window as unknown as Record<string, unknown>)[cb];
      document.body.removeChild(script);
      resolve(data);
    };
    script.onerror = () => {
      delete (window as unknown as Record<string, unknown>)[cb];
      document.body.removeChild(script);
      reject(new Error('Failed to load'));
    };
    script.src = url + '?callback=' + cb;
    document.body.appendChild(script);
  });
}
