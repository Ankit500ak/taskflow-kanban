import { useState } from 'react';
import { SearchIcon } from './Icons';

interface SettingsPageProps {
  userName: string;
  theme: 'light' | 'dark';
  onThemeChange: (t: 'light' | 'dark') => void;
  onBack: () => void;
}

type SettingsTab = 'profile' | 'theme' | 'color';

const COLORS = [
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Violet', value: '#8b5cf6' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Blue', value: '#3b82f6' },
];

export function SettingsPage({ userName, theme, onThemeChange, onBack }: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [search, setSearch] = useState('');
  const [accentColor, setAccentColor] = useState('#6366f1');

  const initials = userName
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const tabs: { key: SettingsTab; label: string; icon: JSX.Element }[] = [
    {
      key: 'profile',
      label: 'Profile',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      ),
    },
    {
      key: 'theme',
      label: 'Theme',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ),
    },
    {
      key: 'color',
      label: 'Color',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M12 3v18" />
          <path d="M3 12h18" />
        </svg>
      ),
    },
  ];

  const filteredTabs = tabs.filter((t) =>
    t.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="settings-page">
      {/* Settings sidebar */}
      <div className="settings-sidebar">
        <button className="settings-back" onClick={onBack}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          <span>Back to app</span>
        </button>

        <div className="settings-search">
          <SearchIcon size={14} className="settings-search-icon" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
          />
        </div>

        <nav className="settings-nav">
          {filteredTabs.map((tab) => (
            <button
              key={tab.key}
              className={`settings-nav-item ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Settings content */}
      <div className="settings-content">
        {activeTab === 'profile' && (
          <div className="settings-section">
            <h2 className="settings-title">Profile</h2>

            <div className="settings-card">
              <div className="settings-row">
                <span className="settings-row-label">Profile picture</span>
                <div className="settings-avatar settings-avatar-gradient">
                  <span>{initials}</span>
                </div>
              </div>

              <div className="settings-row">
                <span className="settings-row-label">Email</span>
                <div className="settings-row-value">
                  <span>{userName.toLowerCase().replace(/\s+/g, '.')}@example.com</span>
                  <button className="settings-edit-btn" title="Edit email">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="settings-row">
                <span className="settings-row-label">Full name</span>
                <input className="settings-input" defaultValue={userName} />
              </div>

              <div className="settings-row">
                <div className="settings-row-label-group">
                  <span className="settings-row-label">Title</span>
                  <span className="settings-row-sub">Your job title or role</span>
                </div>
                <input className="settings-input" defaultValue="Designer" />
              </div>

              <div className="settings-row settings-row-last">
                <div className="settings-row-label-group">
                  <span className="settings-row-label">Username</span>
                  <span className="settings-row-sub">One word, like a nickname or first name</span>
                </div>
                <input className="settings-input" defaultValue="Dexuser" />
              </div>
            </div>

            <h3 className="settings-subtitle">Workspace access</h3>
            <div className="settings-card">
              <div className="settings-row settings-row-last">
                <span className="settings-row-muted">Remove yourself from the workspace</span>
                <button className="settings-leave-btn">Leave Workspace</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'theme' && (
          <div className="settings-section">
            <h2 className="settings-title">Theme</h2>
            <div className="settings-card">
              <div className="settings-theme-options">
                <button
                  className={'settings-theme-option' + (theme === 'light' ? ' active' : '')}
                  onClick={() => onThemeChange('light')}
                >
                  <div className="settings-theme-preview settings-theme-light">
                    <div className="settings-theme-sidebar" />
                    <div className="settings-theme-main">
                      <div className="settings-theme-bar" />
                      <div className="settings-theme-content" />
                    </div>
                  </div>
                  <span>Light</span>
                </button>
                <button
                  className={'settings-theme-option' + (theme === 'dark' ? ' active' : '')}
                  onClick={() => onThemeChange('dark')}
                >
                  <div className="settings-theme-preview settings-theme-dark">
                    <div className="settings-theme-sidebar" />
                    <div className="settings-theme-main">
                      <div className="settings-theme-bar" />
                      <div className="settings-theme-content" />
                    </div>
                  </div>
                  <span>Dark</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'color' && (
          <div className="settings-section">
            <h2 className="settings-title">Color</h2>
            <div className="settings-card">
              <div className="settings-color-options">
                {COLORS.map((c) => (
                  <button
                    key={c.value}
                    className={'settings-color-option' + (accentColor === c.value ? ' active' : '')}
                    onClick={() => setAccentColor(c.value)}
                  >
                    <span className="settings-color-swatch" style={{ background: c.value }} />
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
