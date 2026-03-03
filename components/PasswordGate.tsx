'use client';
import { useState, useEffect, useCallback } from 'react';

const LS_KEY = 'wf_authed';

export default function PasswordGate({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed]   = useState<boolean | null>(null); // null = checking
  const [pw, setPw]           = useState('');
  const [showPw, setShowPw]   = useState(false);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setAuthed(localStorage.getItem(LS_KEY) === '1');
  }, []);

  const submit = useCallback(async () => {
    if (!pw.trim()) return;
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      });
      if (res.ok) {
        localStorage.setItem(LS_KEY, '1');
        setAuthed(true);
      } else {
        setError('Incorrect password');
        setPw('');
      }
    } catch {
      setError('Network error — try again');
    }
    setLoading(false);
  }, [pw]);

  // Still checking localStorage
  if (authed === null) return null;

  // Authenticated — render the app
  if (authed) return <>{children}</>;

  // Password gate
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px',
      zIndex: 9999,
    }}>
      <div style={{
        width: '100%', maxWidth: 340,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0,
      }}>
        {/* Logo */}
        <div style={{ fontSize: '2.4rem', marginBottom: 10 }}>💧</div>
        <div style={{ fontSize: '1.3rem', fontWeight: 800, letterSpacing: '-.4px', marginBottom: 4 }}>
          Waterfall
        </div>
        <div style={{ fontSize: '.8rem', color: 'var(--text2)', marginBottom: 32 }}>
          Personal budget tracker
        </div>

        {/* Password input */}
        <div style={{ width: '100%', position: 'relative', marginBottom: 12 }}>
          <input
            type={showPw ? 'text' : 'password'}
            placeholder="Enter password"
            value={pw}
            autoFocus
            onChange={e => { setPw(e.target.value); setError(''); }}
            onKeyDown={e => { if (e.key === 'Enter') submit(); }}
            style={{
              width: '100%',
              background: 'var(--surface)',
              border: `1px solid ${error ? 'var(--red)' : 'var(--border)'}`,
              borderRadius: 12,
              color: 'var(--text1)',
              padding: '14px 48px 14px 16px',
              fontSize: '1rem',
              outline: 'none',
              transition: 'border-color .2s',
            }}
          />
          <button
            onClick={() => setShowPw(v => !v)}
            style={{
              position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text2)', fontSize: '1rem', padding: 4,
              lineHeight: 1,
            }}
            tabIndex={-1}
            aria-label={showPw ? 'Hide password' : 'Show password'}
          >
            {showPw ? '🙈' : '👁'}
          </button>
        </div>

        {error && (
          <div style={{ color: 'var(--red)', fontSize: '.82rem', marginBottom: 10, alignSelf: 'flex-start' }}>
            {error}
          </div>
        )}

        <button
          onClick={submit}
          disabled={loading || !pw.trim()}
          style={{
            width: '100%',
            background: loading || !pw.trim() ? 'var(--surface)' : 'var(--green)',
            color: loading || !pw.trim() ? 'var(--text2)' : '#000',
            border: 'none',
            borderRadius: 12,
            padding: '14px',
            fontSize: '.95rem',
            fontWeight: 700,
            cursor: loading || !pw.trim() ? 'default' : 'pointer',
            transition: 'background .2s, color .2s',
            letterSpacing: '-.1px',
          }}
        >
          {loading ? 'Checking…' : 'Unlock'}
        </button>
      </div>
    </div>
  );
}
