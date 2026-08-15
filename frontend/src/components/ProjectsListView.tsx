import { useState, useEffect, useRef, RefObject } from 'react';
import { createPortal } from 'react-dom';
import { Project, Assignee, FieldVisibility, FieldKey, ViewMode } from '../types';
import { DotsIcon, ChevronDownIcon, PlusIcon, SearchIcon, SlidersIcon, FunnelIcon } from './Icons';
import { assigneeColor, initials, formatDueDate, dueStatus } from '../utils/task';
import { api } from '../api';
import { FieldsDropdown } from './FieldsDropdown';

const ASSIGNEES: Assignee[] = ['Admin', 'Designer', 'Developer', 'QA', 'Security'];
const PRIORITY_ORDER = { High: 0, Medium: 1, Low: 2 };
const PRIO_META: Record<string, { glyph: string; cls: string }> = {
  High: { glyph: '↗', cls: 'prio-high' },
  Medium: { glyph: '→', cls: 'prio-medium' },
  Low: { glyph: '↘', cls: 'prio-low' },
};

type SortKey = 'title' | 'priority' | 'lead' | 'due';
type SortState = { key: SortKey; dir: 'asc' | 'desc' };

const compare = (a: Project, b: Project, key: SortKey) => {
  switch (key) {
    case 'title':
      return a.title.localeCompare(b.title);
    case 'priority':
      return (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9);
    case 'lead':
      return (a.lead || '').localeCompare(b.lead || '');
    case 'due': {
      const da = new Date(a.due_date || 0).getTime();
      const db = new Date(b.due_date || 0).getTime();
      return da - db;
    }
  }
};

function sortProjects(list: Project[], sort: SortState): Project[] {
  const dir = sort.dir === 'asc' ? 1 : -1;
  return [...list].sort((a, b) => compare(a, b, sort.key) * dir);
}

interface ProjectsListViewProps {
  projects: Project[];
  onRefresh: () => void;
  onOpen: (project: Project) => void;
  userName: string;
}

export function ProjectsListView({ projects, onRefresh, onOpen, userName }: ProjectsListViewProps) {
  const [sort, setSort] = useState<SortState>({ key: 'priority', dir: 'asc' });
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const quickAddRef = useRef<HTMLInputElement>(null);
  const editRef = useRef<HTMLInputElement>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [fieldsOpen, setFieldsOpen] = useState(false);
  const fieldsRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [fields, setFields] = useState<FieldVisibility>({
    priority: true,
    members: true,
    collaborators: true,
    dueDate: true,
    labels: false,
    status: false,
    reporter: false,
  });

  useEffect(() => {
    if (quickAddOpen && quickAddRef.current) quickAddRef.current.focus();
  }, [quickAddOpen]);

  useEffect(() => {
    if (editingId !== null && editRef.current) editRef.current.focus();
  }, [editingId]);

  const requestSort = (key: SortKey) =>
    setSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }
    );

  const toggleField = (key: FieldKey) =>
    setFields((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleQuickAdd = async () => {
    const title = quickAddTitle.trim();
    if (!title) {
      setQuickAddOpen(false);
      return;
    }
    try {
      await api.createProject({ title });
      setQuickAddTitle('');
      setQuickAddOpen(false);
      onRefresh();
    } catch (err) {
      console.error('Failed to create project', err);
    }
  };

  const handleInlineEdit = async (id: number) => {
    const title = editingTitle.trim();
    if (!title) {
      setEditingId(null);
      return;
    }
    try {
      await api.updateProject(id, { title });
      setEditingId(null);
      onRefresh();
    } catch (err) {
      console.error('Failed to update project', err);
    }
  };

  const sorted = sortProjects(projects, sort);

  const headerCols: { label: string; key: SortKey }[] = [
    { label: 'Projects', key: 'title' },
    { label: 'Priority', key: 'priority' },
    { label: 'Lead', key: 'lead' },
    { label: 'Due Date', key: 'due' },
  ];

  const userInitials = userName.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

  // Stats
  const totalProjects = projects.length;
  const highPriority = projects.filter((p) => p.priority === 'High').length;
  const dueSoon = projects.filter((p) => {
    if (!p.due_date) return false;
    const diff = new Date(p.due_date).getTime() - Date.now();
    return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
  }).length;
  const totalTasks = projects.reduce((acc, p) => acc + (p.task_count || 0), 0);

  return (
    <div className="list-view">
      {/* Header */}
      <div className="tasks-header">
        <h1 className="page-title">Projects</h1>
        <div className="tasks-header-actions">
          {searchOpen ? (
            <div className="topbar-search">
              <SearchIcon size={14} className="topbar-search-icon" />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onBlur={() => setSearchOpen(false)}
                placeholder="Search projects..."
                aria-label="Search projects"
              />
            </div>
          ) : (
            <button className="th-btn th-icon" onClick={() => setSearchOpen(true)} aria-label="Search projects">
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
                onViewModeChange={setViewMode}
                fields={fields}
                onToggleField={toggleField}
              />
            )}
          </div>

          <button className="th-btn th-icon" aria-label="Filter projects">
            <FunnelIcon size={15} />
          </button>

          <button className="th-add" onClick={() => setQuickAddOpen(true)}>
            <PlusIcon size={14} />
            <span>Add Project</span>
          </button>

          <div className="dropdown-anchor">
            <button className="th-avatar" aria-label="Account menu">
              {userInitials || 'U'}
            </button>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      {projects.length > 0 && (
        <div className="project-stats-bar">
          <div className="project-stat">
            <div className="project-stat-icon project-stat-total">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
            </div>
            <div className="project-stat-info">
              <span className="project-stat-value">{totalProjects}</span>
              <span className="project-stat-label">Projects</span>
            </div>
          </div>
          <div className="project-stat">
            <div className="project-stat-icon project-stat-high">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
            </div>
            <div className="project-stat-info">
              <span className="project-stat-value">{highPriority}</span>
              <span className="project-stat-label">High Priority</span>
            </div>
          </div>
          <div className="project-stat">
            <div className="project-stat-icon project-stat-due">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
            </div>
            <div className="project-stat-info">
              <span className="project-stat-value">{dueSoon}</span>
              <span className="project-stat-label">Due Soon</span>
            </div>
          </div>
          <div className="project-stat">
            <div className="project-stat-icon project-stat-tasks">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
            </div>
            <div className="project-stat-info">
              <span className="project-stat-value">{totalTasks}</span>
              <span className="project-stat-label">Total Tasks</span>
            </div>
          </div>
        </div>
      )}

      {projects.length === 0 && !quickAddOpen ? (
        <div className="project-empty-state">
          <div className="project-empty-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              <line x1="12" y1="11" x2="12" y2="17" />
              <line x1="9" y1="14" x2="15" y2="14" />
            </svg>
          </div>
          <h3 className="project-empty-title">No projects yet</h3>
          <p className="project-empty-desc">Create your first project to start organizing tasks.</p>
          <button className="project-empty-btn" onClick={() => setQuickAddOpen(true)}>
            <PlusIcon size={14} />
            Create Project
          </button>
        </div>
      ) : viewMode === 'list' ? (
      <section className="list-group">
        <table className="lg-table">
          <colgroup>
            <col className="lg-task-col" />
            <col className="lg-prio-col" />
            <col className="lg-members-col" />
            <col className="lg-due-col" />
            <col className="lg-actions-col" />
          </colgroup>

          <thead>
            <tr>
              {headerCols.map((h) => (
                <th
                  key={h.label}
                  className={`lg-th lg-th-${h.key}`}
                  onClick={() => requestSort(h.key)}
                  aria-sort={sort.key === h.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                >
                  <span className="lg-th-inner sortable">
                    {h.label}
                    {sort.key === h.key && (
                      <span className="lg-sort" aria-hidden="true">
                        {sort.dir === 'asc' ? '▲' : '▼'}
                      </span>
                    )}
                  </span>
                </th>
              ))}
              <th className="lg-th lg-th-actions">
                <span className="lg-th-inner">Actions</span>
              </th>
            </tr>
          </thead>

          <tbody>
            {sorted.length === 0 && !quickAddOpen ? (
              <tr className="lg-empty-row">
                <td colSpan={5}>No projects</td>
              </tr>
            ) : (
              sorted.map((project) => (
                <ProjectRow
                  key={project.id}
                  project={project}
                  editingId={editingId}
                  editingTitle={editingTitle}
                  setEditingId={setEditingId}
                  setEditingTitle={setEditingTitle}
                  editRef={editRef}
                  onInlineEdit={handleInlineEdit}
                  onRefresh={onRefresh}
                  onOpen={onOpen}
                />
              ))
            )}

            {quickAddOpen ? (
              <tr className="lg-add-row">
                <td colSpan={5}>
                  <input
                    ref={quickAddRef}
                    className="lg-quick-add-input"
                    placeholder="Project name..."
                    value={quickAddTitle}
                    onChange={(e) => setQuickAddTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleQuickAdd();
                      if (e.key === 'Escape') { setQuickAddOpen(false); setQuickAddTitle(''); }
                    }}
                    onBlur={handleQuickAdd}
                  />
                </td>
              </tr>
            ) : (
              <tr className="lg-add-row">
                <td colSpan={5}>
                  <button className="list-group-add" onClick={() => setQuickAddOpen(true)}>
                    <PlusIcon size={12} />
                    <span>Add Projects</span>
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
      ) : (
        /* Board View */
        <div className="projects-board">
          <div className="projects-board-grid">
            {sorted.map((project) => {
              const due = formatDueDate(project.due_date);
              const dueState = dueStatus(project.due_date);
              const taskCount = project.task_count || 0;
              const progress = taskCount > 0 ? Math.min(100, Math.round((taskCount / Math.max(taskCount + 2, 5)) * 100)) : 0;
              return (
                <div
                  key={project.id}
                  className="project-board-card"
                  onClick={() => onOpen(project)}
                >
                  <div className="pbc-header">
                    <span className="pbc-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
                    </span>
                    <div className="pbc-header-text">
                      <h4 className="pbc-title">{project.title}</h4>
                      {project.lead && (
                        <span className="pbc-lead-badge">
                          <span className="pbc-lead-avatar" style={{ background: assigneeColor(project.lead) }}>
                            {initials(project.lead)}
                          </span>
                          {project.lead}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pbc-progress-section">
                    <div className="pbc-progress-bar">
                      <div className="pbc-progress-fill" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="pbc-progress-text">{taskCount} tasks</span>
                  </div>

                  <div className="pbc-bottom">
                    <div className={`pbc-priority pbc-priority-${project.priority.toLowerCase()}`}>
                      <span className="pbc-prio-glyph">
                        {project.priority === 'High' ? '↗' : project.priority === 'Medium' ? '→' : '↘'}
                      </span>
                      {project.priority}
                    </div>

                    {due && (
                      <span className={`task-due due-${dueState}`}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                        {due}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            <button className="project-board-add" onClick={() => setQuickAddOpen(true)}>
              <PlusIcon size={16} />
              <span>Add Project</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface ProjectRowProps {
  project: Project;
  editingId: number | null;
  editingTitle: string;
  setEditingId: (id: number | null) => void;
  setEditingTitle: (title: string) => void;
  editRef: RefObject<HTMLInputElement>;
  onInlineEdit: (id: number) => void;
  onRefresh: () => void;
  onOpen: (project: Project) => void;
}

function ProjectRow({
  project,
  editingId,
  editingTitle,
  setEditingId,
  setEditingTitle,
  editRef,
  onInlineEdit,
  onRefresh,
  onOpen,
}: ProjectRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ x: number; y: number; right: number } | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const actionsRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const membersRef = useRef<HTMLElement>(null);
  const membersBtnRef = useRef<HTMLButtonElement>(null);

  const prio = PRIO_META[project.priority] || PRIO_META.Medium;
  const due = formatDueDate(project.due_date);
  const dueState = dueStatus(project.due_date);

  useEffect(() => {
    if (!menuOpen && !pickerOpen) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (popRef.current?.contains(t)) return;
      if (actionsRef.current?.contains(t)) return;
      if (membersRef.current?.contains(t)) return;
      if (membersBtnRef.current?.contains(t)) return;
      setMenuOpen(false);
      setPickerOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen, pickerOpen]);

  const openMenu = () => {
    if (menuOpen) { setMenuOpen(false); return; }
    setPickerOpen(false);
    const rect = actionsRef.current?.getBoundingClientRect();
    if (rect) setAnchor({ x: rect.left, y: rect.bottom + 4, right: rect.right });
    setMenuOpen(true);
  };

  const openPicker = () => {
    if (pickerOpen) { setPickerOpen(false); return; }
    setMenuOpen(false);
    const rect = (membersBtnRef.current || membersRef.current)?.getBoundingClientRect();
    if (rect) setAnchor({ x: rect.left, y: rect.bottom + 4, right: rect.right });
    setPickerOpen(true);
  };

  const handleDelete = async () => {
    setMenuOpen(false);
    try {
      await api.deleteProject(project.id);
      onRefresh();
    } catch (err) {
      console.error('Failed to delete project', err);
    }
  };

  const handlePriorityChange = async (priority: 'Low' | 'Medium' | 'High') => {
    setMenuOpen(false);
    try {
      await api.updateProject(project.id, { priority });
      onRefresh();
    } catch (err) {
      console.error('Failed to update project', err);
    }
  };

  const handleLeadChange = async (lead: string) => {
    setPickerOpen(false);
    try {
      await api.updateProject(project.id, { lead: lead || undefined });
      onRefresh();
    } catch (err) {
      console.error('Failed to update project', err);
    }
  };

  const handleDueChange = async (due_date: string | null) => {
    setMenuOpen(false);
    try {
      await api.updateProject(project.id, { due_date: due_date || undefined });
      onRefresh();
    } catch (err) {
      console.error('Failed to update project', err);
    }
  };

  const isEditing = editingId === project.id;

  return (
    <tr className="lg-row">
      <td className="lg-td lg-td-task">
        {isEditing ? (
          <input
            ref={editRef}
            className="lg-quick-add-input"
            value={editingTitle}
            onChange={(e) => setEditingTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onInlineEdit(project.id);
              if (e.key === 'Escape') { setEditingId(null); }
            }}
            onBlur={() => onInlineEdit(project.id)}
          />
        ) : (
          <button
            className="lg-task-btn"
            title={project.title}
            onClick={() => onOpen(project)}
            onDoubleClick={() => { setEditingId(project.id); setEditingTitle(project.title); }}
          >
            {project.title}
          </button>
        )}
      </td>

      <td className="lg-td lg-td-prio">
        <span className={`prio ${prio.cls}`}>
          <span className="prio-glyph" aria-hidden="true">{prio.glyph}</span>
          {project.priority}
        </span>
      </td>

      <td className="lg-td lg-td-members">
        {project.lead ? (
          <span
            ref={membersRef}
            className="member-avatar"
            style={{ background: assigneeColor(project.lead) }}
            title={`Lead: ${project.lead}`}
            onClick={openPicker}
          >
            {initials(project.lead)}
          </span>
        ) : (
          <button
            ref={membersBtnRef}
            className="member-add"
            title="Assign lead"
            onClick={openPicker}
          >
            +
          </button>
        )}
      </td>

      <td className="lg-td lg-td-due">
        {due ? (
          <span className={`lg-due-text due-${dueState}`} title={due}>{due}</span>
        ) : (
          <span className="lg-muted">—</span>
        )}
      </td>

      <td className="lg-td lg-td-actions">
        <button
          ref={actionsRef}
          className="icon-btn"
          aria-label={`More options for ${project.title}`}
          onClick={openMenu}
        >
          <DotsIcon size={14} />
        </button>
      </td>

      {pickerOpen && anchor && createPortal(
        <MemberPicker
          popRef={popRef}
          anchor={anchor}
          lead={project.lead}
          onAssign={handleLeadChange}
        />,
        document.body
      )}

      {menuOpen && anchor && createPortal(
        <div className="row-menu" ref={popRef} style={{ top: anchor.y, right: window.innerWidth - anchor.right }}>
          <button className="row-menu-item" onClick={() => { setMenuOpen(false); setEditingId(project.id); setEditingTitle(project.title); }}>Edit</button>

          <div className="row-menu-sub">
            <button className="row-menu-item" onClick={() => setMenuOpen(false)}>
              <span>Change priority</span>
              <ChevronDownIcon size={12} className="sub-chevron" />
            </button>
            <div className="row-submenu">
              {(['High', 'Medium', 'Low'] as const).map((p) => (
                <button key={p} className="row-menu-item" onClick={() => handlePriorityChange(p)}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          <button className="row-menu-item" onClick={() => {
            setMenuOpen(false);
            const input = document.createElement('input');
            input.type = 'date';
            input.value = project.due_date || '';
            input.onchange = () => handleDueChange(input.value || null);
            input.click();
          }}>Change due date</button>

          <button className="row-menu-item row-menu-danger" onClick={handleDelete}>Delete</button>
        </div>,
        document.body
      )}
    </tr>
  );
}

function MemberPicker({
  popRef,
  anchor,
  lead,
  onAssign,
}: {
  popRef: RefObject<HTMLDivElement>;
  anchor: { x: number; y: number; right: number };
  lead: string | null;
  onAssign: (lead: string) => void;
}) {
  return (
    <div className="member-picker" ref={popRef} style={{ top: anchor.y, left: anchor.x }}>
      <div className="member-picker-title">Assign lead</div>
      <button className="row-menu-item" onClick={() => onAssign('')}>Unassigned</button>
      {ASSIGNEES.map((a) => (
        <button
          key={a}
          className={`row-menu-item ${lead === a ? 'selected' : ''}`}
          onClick={() => onAssign(a)}
        >
          <span className="member-picker-avatar" style={{ background: assigneeColor(a) }}>
            {initials(a)}
          </span>
          {a}
        </button>
      ))}
    </div>
  );
}
