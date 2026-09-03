import { APP_NAME, APP_TAGLINE } from '@rota/shared';
import { type CSSProperties, type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase.ts';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    // Fase 0: login por e-mail direto no Supabase. Fase 1 troca por
    // username via RPC segura (ver lib/supabase.ts::signInWithUsername).
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (err) {
      setError('Não foi possível entrar. Verifique credenciais.');
      return;
    }
    navigate('/', { replace: true });
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
      }}
    >
      <form className="card" onSubmit={onSubmit} style={{ width: 340 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>{APP_NAME}</h1>
        <p style={{ marginTop: 4, marginBottom: 20, color: 'var(--color-fg-muted)' }}>
          {APP_TAGLINE}
        </p>
        <label htmlFor="rota-email" style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>
          E-mail
        </label>
        <input
          id="rota-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
        />
        <label
          htmlFor="rota-password"
          style={{ display: 'block', fontSize: 13, margin: '14px 0 6px' }}
        >
          Senha
        </label>
        <input
          id="rota-password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
        />
        {error && (
          <div style={{ marginTop: 12, color: 'var(--color-danger)', fontSize: 13 }}>{error}</div>
        )}
        <button type="submit" disabled={busy} style={submitStyle}>
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
        <p style={{ marginTop: 16, fontSize: 12, color: 'var(--color-fg-muted)' }}>
          Novos usuários entram por convite do administrador da área.
        </p>
      </form>
    </main>
  );
}

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid var(--color-border)',
  background: 'var(--color-bg)',
  color: 'var(--color-fg)',
  font: 'inherit',
};

const submitStyle: CSSProperties = {
  marginTop: 20,
  width: '100%',
  padding: '10px 12px',
  borderRadius: 8,
  border: 'none',
  background: 'var(--color-accent)',
  color: 'var(--color-accent-fg)',
  fontWeight: 600,
  cursor: 'pointer',
};
