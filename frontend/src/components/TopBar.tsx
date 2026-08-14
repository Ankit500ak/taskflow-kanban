import { MenuIcon } from './Icons';

interface TopBarProps {
  onToggleSidebar: () => void;
}

export function TopBar({ onToggleSidebar }: TopBarProps) {
  return (
    <header className="topbar">
      <button className="topbar-icon-btn" onClick={onToggleSidebar} aria-label="Toggle sidebar">
        <MenuIcon size={18} />
      </button>
    </header>
  );
}
