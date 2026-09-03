import type { UserRole } from '@rota/db-types';
import { useState } from 'react';
import { Avatar } from '../components/Avatar.tsx';
import { Dialog } from '../components/Dialog.tsx';
import { useAllProfiles, useUpdateProfile } from '../data/profiles.ts';
import { supabase } from '../lib/supabase.ts';

type InviteMode = 'invite' | 'temporary_password';

interface InviteState {
  email: string;
  username: string;
  full_name: string;
  role: UserRole;
  unit: string;
  mode: InviteMode;
}

const EMPTY_INVITE: InviteState = {
  email: '',
  username: '',
  full_name: '',
  role: 'member',
  unit: '',
  mode: 'invite',
};

export function AdminUsersPage() {
  const { data: profiles = [], isLoading, refetch } = useAllProfiles();
  const update = useUpdateProfile();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState<InviteState>(EMPTY_INVITE);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  async function sendInvite() {
    setInviteBusy(true);
    setInviteError(null);
    setTempPassword(null);
    try {
      const { data, error } = await supabase.functions.invoke('invite-user', {
        body: invite,
      });
      if (error) {
        setInviteError(error.message);
        return;
      }
      const payload = data as { temporary_password?: string | null };
      if (payload?.temporary_password) setTempPassword(payload.temporary_password);
      await refetch();
      if (!payload?.temporary_password) closeInvite();
    } finally {
      setInviteBusy(false);
    }
  }

  function closeInvite() {
    setInviteOpen(false);
    setInvite(EMPTY_INVITE);
    setTempPassword(null);
    setInviteError(null);
  }

  return (
    <>
      <div className="row row--between" style={{ marginBottom: 'var(--space-4)' }}>
        <div>
          <h1 className="page-title">Usuários</h1>
          <p className="page-lead" style={{ margin: 0 }}>
            Convide colegas, promova a admin, desative quem sai.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setInviteOpen(true)}>
          Novo usuário
        </button>
      </div>

      {isLoading ? (
        <div className="empty">Carregando…</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Pessoa</th>
              <th>Papel</th>
              <th>Unidade</th>
              <th>Estado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {profiles.map((p) => (
              <tr key={p.id}>
                <td>
                  <div className="row">
                    <Avatar name={p.full_name} avatarUrl={p.avatar_url} />
                    <div>
                      <div style={{ fontWeight: 600 }}>{p.full_name}</div>
                      <div className="muted text-sm">@{p.username}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <select
                    className="select"
                    value={p.role}
                    onChange={(e) =>
                      update.mutate({ id: p.id, patch: { role: e.target.value as UserRole } })
                    }
                  >
                    <option value="member">Membro</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td className="muted">{p.unit ?? '—'}</td>
                <td>
                  {p.is_active ? (
                    <span className="pill pill--ok">Ativo</span>
                  ) : (
                    <span className="pill">Inativo</span>
                  )}
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => update.mutate({ id: p.id, patch: { is_active: !p.is_active } })}
                  >
                    {p.is_active ? 'Desativar' : 'Reativar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Dialog
        open={inviteOpen}
        onClose={closeInvite}
        title="Novo usuário"
        wide
        actions={
          tempPassword ? (
            <button type="button" className="btn btn-primary" onClick={closeInvite}>
              Fechar
            </button>
          ) : (
            <>
              <button type="button" className="btn btn-ghost" onClick={closeInvite}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={inviteBusy || !invite.email || !invite.username || !invite.full_name}
                onClick={sendInvite}
              >
                {inviteBusy ? 'Enviando…' : 'Criar'}
              </button>
            </>
          )
        }
      >
        {tempPassword ? (
          <div className="stack">
            <p>Usuário criado. A senha temporária, mostrada só uma vez, é:</p>
            <div className="mono card" style={{ textAlign: 'center', fontSize: 18 }}>
              {tempPassword}
            </div>
            <p className="muted text-sm">
              Passe fora do Rota (chat institucional, presencialmente). Peça para a pessoa trocar no
              primeiro login.
            </p>
          </div>
        ) : (
          <div className="stack">
            <div className="row" style={{ gap: 'var(--space-3)' }}>
              <div className="field grow">
                <label htmlFor="new-name" className="field-label">
                  Nome completo
                </label>
                <input
                  id="new-name"
                  className="input"
                  value={invite.full_name}
                  onChange={(e) => setInvite({ ...invite, full_name: e.target.value })}
                />
              </div>
              <div className="field grow">
                <label htmlFor="new-username" className="field-label">
                  Username
                </label>
                <input
                  id="new-username"
                  className="input"
                  value={invite.username}
                  onChange={(e) => setInvite({ ...invite, username: e.target.value })}
                />
              </div>
            </div>
            <div className="row" style={{ gap: 'var(--space-3)' }}>
              <div className="field grow">
                <label htmlFor="new-email" className="field-label">
                  E-mail institucional
                </label>
                <input
                  id="new-email"
                  type="email"
                  className="input"
                  value={invite.email}
                  onChange={(e) => setInvite({ ...invite, email: e.target.value })}
                />
              </div>
              <div className="field" style={{ width: 140 }}>
                <label htmlFor="new-role" className="field-label">
                  Papel
                </label>
                <select
                  id="new-role"
                  className="select"
                  value={invite.role}
                  onChange={(e) => setInvite({ ...invite, role: e.target.value as UserRole })}
                >
                  <option value="member">Membro</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="field">
              <label htmlFor="new-unit" className="field-label">
                Unidade (opcional)
              </label>
              <input
                id="new-unit"
                className="input"
                value={invite.unit}
                onChange={(e) => setInvite({ ...invite, unit: e.target.value })}
              />
            </div>
            <div className="field">
              <span className="field-label">Como o usuário entra</span>
              <div className="row" style={{ gap: 'var(--space-4)' }}>
                <label className="row" style={{ gap: 6 }}>
                  <input
                    type="radio"
                    checked={invite.mode === 'invite'}
                    onChange={() => setInvite({ ...invite, mode: 'invite' })}
                  />
                  Convite por e-mail
                </label>
                <label className="row" style={{ gap: 6 }}>
                  <input
                    type="radio"
                    checked={invite.mode === 'temporary_password'}
                    onChange={() => setInvite({ ...invite, mode: 'temporary_password' })}
                  />
                  Senha temporária
                </label>
              </div>
            </div>
            {inviteError && (
              <div className="field-error">Não foi possível criar: {inviteError}</div>
            )}
          </div>
        )}
      </Dialog>
    </>
  );
}
