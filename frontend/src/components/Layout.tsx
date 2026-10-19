import { CalendarDays, CheckCircle2, ChevronsLeft, ChevronsRight, ClipboardCheck, Clapperboard, Factory, Tv2 } from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useFactoryStatus, useMeta } from '../api/hooks';
import { Skeleton } from './ui/Skeleton';
import { Tip } from './ui/Tip';

const LINKS = [
  { to: '/', label: 'Fábrica', icon: Factory, end: true },
  { to: '/aprovacao', label: 'Aprovação', icon: ClipboardCheck, count: 'awaiting_approval' as const },
  { to: '/agenda', label: 'Agenda', icon: CalendarDays },
  { to: '/shorts', label: 'Shorts', icon: Clapperboard },
  { to: '/publicados', label: 'Publicados', icon: CheckCircle2 },
  { to: '/canais', label: 'Canais', icon: Tv2 },
];

const STORAGE_KEY = 'df:sidebar-collapsed';

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function Layout() {
  const { data: factory } = useFactoryStatus();
  const { data: meta } = useMeta();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(readCollapsed);

  const toggle = () =>
    setCollapsed((prev) => {
      try {
        localStorage.setItem(STORAGE_KEY, prev ? '0' : '1');
      } catch {
        /* sem storage: só não persiste */
      }
      return !prev;
    });

  return (
    <div className="shell" data-collapsed={collapsed}>
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="brand">
            <span className="brand-badge">DF</span>
            <div className="brand-text">
              <div className="brand-name">Dark Factory</div>
              <div className="brand-sub">o escritório dos agentes</div>
            </div>
          </div>
          <Tip label={collapsed ? 'Expandir menu' : 'Recolher menu'} side="right">
            <button className="icon-btn collapse" onClick={toggle} aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}>
              {collapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
            </button>
          </Tip>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {LINKS.map(({ to, label, icon: Icon, end, count: count_key }) => {
            const count = count_key ? factory?.counts[count_key] : undefined;
            return (
              <Tip key={to} label={label} side="right" disabled={!collapsed}>
                <NavLink to={to} end={end} className="nav-link">
                  <span className="nav-main">
                    <Icon size={19} />
                    <span className="nav-label">{label}</span>
                  </span>
                  {count ? <span className="nav-count">{count}</span> : null}
                </NavLink>
              </Tip>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <strong>A IA faz. Você toma café.</strong>
          {meta ? <span>LLM: {meta.integrations.anthropic ? meta.llm_model : 'modo demo'}</span> : <Skeleton width={110} height={10} />}
        </div>
      </aside>
      <main className="main">
        <div className="page-wrap" key={location.pathname}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
