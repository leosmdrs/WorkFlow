import { APP_NAME } from '@rota/shared';
import { NavLink, Route, Routes } from 'react-router-dom';
import { FlowPage } from './pages/Flow.tsx';
import { InboxPage } from './pages/Inbox.tsx';
import { PanoramaPage } from './pages/Panorama.tsx';

const navItem = ({ isActive }: { isActive: boolean }) =>
  `nav-item${isActive ? ' nav-item--active' : ''}`;

export function App() {
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
        </nav>
        <div className="sidebar-footer">Fase 0 — fundação.</div>
      </aside>
      <main className="content">
        <Routes>
          <Route path="/" element={<InboxPage />} />
          <Route path="/flow" element={<FlowPage />} />
          <Route path="/panorama" element={<PanoramaPage />} />
        </Routes>
      </main>
    </div>
  );
}
