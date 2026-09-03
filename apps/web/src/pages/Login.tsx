import { APP_NAME, APP_TAGLINE } from '@rota/shared';
import { type CSSProperties, type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithUsername } from '../lib/supabase.ts';

/**
 * Login por username. Erros de credencial são deliberadamente
 * indistinguíveis de "username inexistente" para não facilitar
 * enumeração (ver signInWithUsername).
 */
export function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: err } = await signInWithUsername(username, password);
    setBusy(false);
    if (err) {
      setError('Usuário ou senha inválidos.');
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
        <label htmlFor="rota-username" style={{ display: 'block', fontSize: 13, marginBottom: 6 }}>
          Usuário
        </label>
        <input
          id="rota-username"
          type="text"
          required
          autoComplete="username"
          autoCapitalize="none"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
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
