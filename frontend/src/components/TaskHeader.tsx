import { useState, useRef, useEffect } from 'react';
import { SearchIcon, SlidersIcon, FunnelIcon, PlusIcon } from './Icons';
import { FieldsDropdown } from './FieldsDropdown';
import { FieldKey, FieldVisibility, ViewMode } from '../types';

interface TaskHeaderProps {
  search: string;
  onSearchChange: (value: string) => void;
  onOpenCreate: () => void;
  onLogout: () => void;
  userName: string;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  fields: FieldVisibility;
  onToggleField: (key: FieldKey) => void;
}

export function TaskHeader({
  search,
  onSearchChange,
  onOpenCreate,
  onLogout,
  userName,
  viewMode,
  onViewModeChange,
  fields,
  onToggleField,
}: TaskHeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [fieldsOpen, setFieldsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const fieldsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (fieldsRef.current && !fieldsRef.current.contains(e.target as Node)) {
        setFieldsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const initials = userName.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="tasks-header">
      <h1 className="page-title">Tasks</h1>

      <div className="tasks-header-actions">
        {searchOpen ? (
          <div className="topbar-search">
            <SearchIcon size={14} className="topbar-search-icon" />
            <input
              autoFocus
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              onBlur={() => setSearchOpen(false)}
              placeholder="Search tasks..."
              aria-label="Search tasks"
            />
          </div>
        ) : (
          <button
            className="th-btn th-icon"
            onClick={() => setSearchOpen(true)}
            aria-label="Search tasks"
          >
            <SearchIcon size={15} />
          </button>
        )}

        <div className="dropdown-anchor" ref={fieldsRef}>
          <button
            className={`th-btn th-text ${fieldsOpen ? 'active' : ''}`}
            onClick={() => setFieldsOpen((v) => !v)}
            aria-label="Toggle fields"
            aria-expanded={fieldsOpen}
          >
            <SlidersIcon size={14} />
            <span>Fields</span>
          </button>
          {fieldsOpen && (
            <FieldsDropdown
              viewMode={viewMode}
              onViewModeChange={onViewModeChange}
              fields={fields}
              onToggleField={onToggleField}
            />
          )}
        </div>

        <button className="th-btn th-icon" aria-label="Filter tasks">
          <FunnelIcon size={15} />
        </button>

        <button className="th-add" onClick={onOpenCreate}>
          <PlusIcon size={14} />
          <span>Add Task</span>
        </button>

        <div className="dropdown-anchor">
          <button
            className="th-avatar"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Account menu"
          >
            {initials || 'U'}
          </button>
          {menuOpen && (
            <div className="dropdown-menu account-menu">
              <div className="account-name">{userName}</div>
              <button className="dropdown-item" onClick={onLogout}>
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
