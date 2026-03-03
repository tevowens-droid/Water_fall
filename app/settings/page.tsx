'use client';
import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { FlowStep } from '@/lib/types';

const METHODS = ['Transfer', 'Zelle', 'Wire', 'ACH', 'Cash', 'Check', 'Bill Pay', 'Other'];

export default function SettingsPage() {
  const { flows, setFlows } = useApp();
  const [cats, setCats]   = useState<{ name: string; monthlyTarget: number }[]>([]);
  const [draft, setDraft] = useState<Record<string, FlowStep[]>>({});
  const [toast, setToast] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadCats = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/sheets');
      const json = await res.json();
      const names = (json.thisWeek?.rows ?? []).map((r: { category: string; monthlyNeed: number }) => ({
        name: r.category,
        monthlyTarget: r.monthlyNeed,
      }));
      setCats(names);
      // Merge: keep existing flow steps, add empty arrays for new categories
      setDraft(prev => {
        const merged = { ...flows };
        names.forEach((c: { name: string }) => { if (!merged[c.name]) merged[c.name] = []; });
        return merged;
      });
    } catch { /* use existing draft */ }
    setLoading(false);
  }, [flows]);

  useEffect(() => { loadCats(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function addStep(cat: string) {
    setDraft(prev => ({ ...prev, [cat]: [...(prev[cat] ?? []), { method: 'Transfer', account: '' }] }));
  }

  function updateStep(cat: string, si: number, field: keyof FlowStep, value: string) {
    setDraft(prev => {
      const steps = (prev[cat] ?? []).map((s, i) => i === si ? { ...s, [field]: value } : s);
      return { ...prev, [cat]: steps };
    });
  }

  function removeStep(cat: string, si: number) {
    setDraft(prev => ({ ...prev, [cat]: (prev[cat] ?? []).filter((_, i) => i !== si) }));
  }

  function save() {
    setFlows(draft);
    setToast(true);
    setTimeout(() => setToast(false), 2000);
  }

  const catList = cats.length > 0 ? cats : Object.keys(draft).map(name => ({ name, monthlyTarget: 0 }));

  return (
    <div className="page">
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-title">Money Flow Instructions</div>
        <p style={{ fontSize: '.8rem', color: 'var(--text2)', marginBottom: 18 }}>
          For each category, define where the money goes and how it gets there.
          Categories are pulled live from your Google Sheet.
          {loading && <span style={{ color: 'var(--text2)', marginLeft: 6, fontSize: '.72rem' }}>Loading…</span>}
        </p>

        {catList.map(cat => (
          <div key={cat.name} style={{ marginBottom: 22, paddingBottom: 20, borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontWeight: 700, fontSize: '.88rem' }}>{cat.name}</span>
              {cat.monthlyTarget > 0 && <span style={{ fontSize: '.75rem', color: 'var(--text2)' }}>${cat.monthlyTarget.toLocaleString()}/mo</span>}
            </div>

            <div className="flow-editor">
              {(draft[cat.name] ?? []).length === 0 && (
                <div style={{ fontSize: '.78rem', color: 'var(--text2)', marginBottom: 6 }}>No steps yet.</div>
              )}
              {(draft[cat.name] ?? []).map((s, si) => (
                <span key={si}>
                  {si > 0 && <div style={{ fontSize: '.7rem', color: 'var(--text2)', padding: '2px 0 2px 4px' }}>then ↓</div>}
                  <div className="flow-step-row">
                    <select value={s.method} onChange={e => updateStep(cat.name, si, 'method', e.target.value)}>
                      {METHODS.map(m => <option key={m}>{m}</option>)}
                    </select>
                    <input
                      type="text"
                      placeholder="Landing account name"
                      value={s.account}
                      onChange={e => updateStep(cat.name, si, 'account', e.target.value)}
                    />
                    <button className="icon-btn del" onClick={() => removeStep(cat.name, si)}>✕</button>
                  </div>
                </span>
              ))}
            </div>
            <button className="add-btn" style={{ marginTop: 6 }} onClick={() => addStep(cat.name)}>+ Add Step</button>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button className="save-btn" onClick={save}>💾 Save Flow Instructions</button>
        <span className={'saved-toast' + (toast ? ' show' : '')}>Saved ✓</span>
      </div>
    </div>
  );
}
