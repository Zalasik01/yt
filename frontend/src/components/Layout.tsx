import { NavLink, Outlet } from 'react-router-dom';
import { useFactoryStatus, useMeta } from '../api/hooks';

const LINKS = [
  { to: '/', label: 'Fábrica', end: true },
  { to: '/aprovacao', label: 'Aprovação', count: 'awaiting_approval' as const },
  { to: '/agenda', label: 'Agenda' },
  { to: '/shorts', label: 'Shorts' },
  { to: '/publicados', label: 'Publicados' },
  { to: '/canais', label: 'Canais' },
];

export function Layout() {
  const { data: factory } = useFactoryStatus();
  const { data: meta } = useMeta();

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-badge">DF</span>
          <div>
            <div className="brand-name">Dark Factory</div>
            <div className="brand-sub">o escritório dos agentes</div>
          </div>
        </div>
        {LINKS.map((link) => {
          const count = link.count ? factory?.counts[link.count] : undefined;
          return (
            <NavLink key={link.to} to={link.to} end={link.end} className="nav-link">
              {link.label}
              {count ? <span className="nav-count">{count}</span> : null}
            </NavLink>
          );
        })}
        <div className="sidebar-footer">
          <strong>A IA faz. Você toma café.</strong>
          {meta && (
            <span>
              LLM: {meta.integrations.anthropic ? meta.llm_model : 'modo demo'}
            </span>
          )}
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
