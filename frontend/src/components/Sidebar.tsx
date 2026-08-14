import { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon } from './Icons';

interface SidebarProps {
  collapsed: boolean;
  userName: string;
  theme: 'light' | 'dark';
  onThemeChange: (t: 'light' | 'dark') => void;
  activePage: 'tasks' | 'projects' | 'settings';
  onNavChange: (page: 'tasks' | 'projects') => void;
  onSettingsOpen: () => void;
}

export function Sidebar({ collapsed, userName, theme, onThemeChange, activePage, onNavChange, onSettingsOpen }: SidebarProps) {
  const nav = activePage;
  const [workspaceOpen, setWorkspaceOpen] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const [submenu, setSubmenu] = useState<'theme' | 'color' | null>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuBtnRef.current && !menuBtnRef.current.contains(t) && !(t instanceof Element && t.closest('.sb-overlay'))) {
        setMenuOpen(false);
        setSubmenu(null);
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  if (collapsed) {
    return <aside className="sidebar sidebar-collapsed" aria-hidden="true" />;
  }

  const initials = userName
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const openMenu = () => {
    if (menuBtnRef.current) {
      const r = menuBtnRef.current.getBoundingClientRect();
      setMenuPos({ top: r.bottom + 6, left: r.left - 140 });
    }
    setMenuOpen(!menuOpen);
    setSubmenu(null);
  };

  return (
    <aside className="sidebar">
      {/* User profile row */}
      <div className="sb-profile-row">
        <div className="sb-avatar-sm">
          <span className="sb-avatar-sm-inner">{initials || 'U'}</span>
        </div>
        <span className="sb-user-name">{userName}</span>
        <button className="sb-menu-btn" ref={menuBtnRef} onClick={openMenu} title="Menu">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="17 1 21 5 17 9" />
            <path d="M3 11V9a4 4 0 0 1 4-4h14" />
            <polyline points="7 23 3 19 7 15" />
            <path d="M21 13v2a4 4 0 0 1-4 4H3" />
          </svg>
        </button>
      </div>

      {/* Workspace section */}
      <div className="sb-ws-section">
        <button className="sb-ws-head" onClick={() => setWorkspaceOpen(!workspaceOpen)}>
          <span>Workspace</span>
          <ChevronDownIcon
            size={14}
            className={`sb-chevron ${workspaceOpen ? 'open' : ''}`}
          />
        </button>

        {workspaceOpen && (
          <div className="sb-ws-items">
            <button
              className={`sb-ws-item ${nav === 'tasks' ? 'active' : ''}`}
              onClick={() => onNavChange('tasks')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
              <span>Tasks</span>
            </button>
            <button
              className={`sb-ws-item ${nav === 'projects' ? 'active' : ''}`}
              onClick={() => onNavChange('projects')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              <span>Projects</span>
            </button>
          </div>
        )}
      </div>

      {/* Overlay menu — opens from the swap icon */}
      {menuOpen && (
        <>
          <div className="sb-overlay-backdrop" onClick={() => { setMenuOpen(false); setSubmenu(null); }} />
          <div className="sb-overlay" style={{ top: menuPos.top, left: menuPos.left }}>
            {!submenu && (
              <>
                <button className="sb-overlay-item" onClick={() => setSubmenu('theme')}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>
                  <span>Change Theme</span>
                  <svg className="sb-overlay-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
                </button>
                <button className="sb-overlay-item" onClick={() => setSubmenu('color')}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r="2.5" /><circle cx="17.5" cy="10.5" r="2.5" /><circle cx="8.5" cy="7.5" r="2.5" /><circle cx="6.5" cy="12.5" r="2.5" /><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.7-.8 1.7-1.7 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-.9.8-1.7 1.7-1.7H16c3.3 0 6-2.7 6-6 0-5.5-4.5-9-10-9z" /></svg>
                  <span>Color Mode</span>
                  <svg className="sb-overlay-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
                </button>
                <div className="sb-overlay-divider" />
                <button className="sb-overlay-item" onClick={() => { setMenuOpen(false); onSettingsOpen(); }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
                  <span>Settings</span>
                </button>
              </>
            )}

            {submenu === 'theme' && (
              <>
                <button className="sb-overlay-back" onClick={() => setSubmenu(null)}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
                  <span>Change Theme</span>
                </button>
                <div className="sb-overlay-divider" />
                <button
                  className={`sb-overlay-item ${theme === 'light' ? 'active' : ''}`}
                  onClick={() => { onThemeChange('light'); setMenuOpen(false); setSubmenu(null); }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>
                  <span>Light</span>
                  {theme === 'light' && <span className="sb-overlay-check">✓</span>}
                </button>
                <button
                  className={`sb-overlay-item ${theme === 'dark' ? 'active' : ''}`}
                  onClick={() => { onThemeChange('dark'); setMenuOpen(false); setSubmenu(null); }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
                  <span>Dark</span>
                  {theme === 'dark' && <span className="sb-overlay-check">✓</span>}
                </button>
              </>
            )}

            {submenu === 'color' && (
              <>
                <button className="sb-overlay-back" onClick={() => setSubmenu(null)}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
                  <span>Color Mode</span>
                </button>
                <div className="sb-overlay-divider" />
                <div className="sb-overlay-colors">
                  {['#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316', '#22c55e', '#3b82f6'].map((c) => (
                    <button key={c} className="sb-overlay-color" onClick={() => setMenuOpen(false)}>
                      <span style={{ background: c }} />
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </aside>
  );
}
