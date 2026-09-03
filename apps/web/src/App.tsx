import { APP_NAME } from '@rota/shared';
import { NavLink, Route, Routes } from 'react-router-dom';
import { Avatar } from './components/Avatar.tsx';
import { NotificationsBell } from './components/NotificationsBell.tsx';
import { useCurrentProfile } from './data/profiles.ts';
import { supabase } from './lib/supabase.ts';
import { AdminUsersPage } from './pages/AdminUsers.tsx';
import { FlowPage } from './pages/Flow.tsx';
import { InboxPage } from './pages/Inbox.tsx';
import { PanoramaPage } from './pages/Panorama.tsx';
import { ProcessDetailPage } from './pages/ProcessDetail.tsx';

const navItem = ({ isActive }: { isActive: boolean }) =>
  `nav-item${isActive ? ' nav-item--active' : ''}`;

export function App() {
  const { data: profile } = useCurrentProfile();
  const isAdmin = profile?.role === 'admin';

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">{APP_NAME}</div>
        <nav>
          <NavLink to="/" end className={navItem}>
            Minha Caixa
          </NavLink>
          <NavLink to="/flow" className={navItem}>
            Fluxo
          </NavLink>
          <NavLink to="/panorama" className={navItem}>
            Panorama
          </NavLink>
          {isAdmin && (
            <NavLink to="/admin/users" className={navItem}>
              Usuários
            </NavLink>
          )}
        </nav>
        <div className="sidebar-footer">
          <div>Fase 1 — MVP navegável.</div>
        </div>
      </aside>

      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header className="topbar">
          <div />
          <div className="topbar-actions">
            <NotificationsBell />
            {profile && (
              <div className="row" style={{ gap: 'var(--space-2)' }}>
                <Avatar name={profile.full_name} avatarUrl={profile.avatar_url} size="sm" />
                <div className="text-sm">
                  <div style={{ fontWeight: 600 }}>{profile.full_name}</div>
                  <div className="muted">@{profile.username}</div>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => supabase.auth.signOut()}
                >
                  Sair
                </button>
              </div>
            )}
          </div>
        </header>
        <main className="content">
          <Routes>
            <Route path="/" element={<InboxPage />} />
            <Route path="/flow" element={<FlowPage />} />
            <Route path="/panorama" element={<PanoramaPage />} />
            <Route path="/p/:id" element={<ProcessDetailPage />} />
            {isAdmin && <Route path="/admin/users" element={<AdminUsersPage />} />}
          </Routes>
        </main>
      </div>
    </div>
  );
}
