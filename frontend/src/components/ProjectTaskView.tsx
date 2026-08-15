import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Project, ProjectTask, TaskStatus, Assignee, FieldVisibility, FieldKey, ViewMode } from '../types';
import { ChevronDownIcon, PlusIcon, DotsIcon, ChevronRightIcon, SearchIcon, SlidersIcon, FunnelIcon, CalendarIcon } from './Icons';
import { assigneeColor, initials, formatDueDate, dueStatus, parseLabels } from '../utils/task';
import { api } from '../api';
import { ProjectTaskDetailPage } from './ProjectTaskDetailPage';
import { FieldsDropdown } from './FieldsDropdown';

const STATUSES: TaskStatus[] = ['To Do', 'Doing', 'Completed', 'On Hold'];
const STATUS_COLORS: Record<TaskStatus, string> = {
  'To Do': '#3b82f6',
  'Doing': '#f59e0b',
  'Completed': '#22c55e',
  'On Hold': '#ef4444',
};
const ASSIGNEES: Assignee[] = ['Admin', 'Designer', 'Developer', 'QA', 'Security'];
const PRIO_META: Record<string, { glyph: string; cls: string }> = {
  High: { glyph: '↗', cls: 'prio-high' },
  Medium: { glyph: '→', cls: 'prio-medium' },
  Low: { glyph: '↘', cls: 'prio-low' },
};

interface ProjectTaskViewProps {
  project: Project;
  onBack: () => void;
  userName: string;
}

export function ProjectTaskView({ project, onBack, userName }: ProjectTaskViewProps) {
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [quickAddStatus, setQuickAddStatus] = useState<TaskStatus | null>(null);
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const [selectedTask, setSelectedTask] = useState<ProjectTask | null>(null);
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
  const quickAddRef = useRef<HTMLInputElement>(null);
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null);

  const fetchTasks = async () => {
    try {
      const data = await api.getProjectTasks(project.id);
      setTasks(data);
    } catch (err) {
      console.error('Failed to load tasks', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTasks(); }, [project.id]);
  useEffect(() => {
    if (quickAddStatus && quickAddRef.current) quickAddRef.current.focus();
  }, [quickAddStatus]);

  const toggle = (status: string) =>
    setCollapsed((prev) => ({ ...prev, [status]: !prev[status] }));

  const toggleField = (key: FieldKey) =>
    setFields((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleQuickAdd = async (status: TaskStatus) => {
    const title = quickAddTitle.trim();
    if (!title) {
      setQuickAddStatus(null);
      return;
    }
    try {
      await api.createProjectTask(project.id, { title, status });
      setQuickAddTitle('');
      setQuickAddStatus(null);
      await fetchTasks();
    } catch (err) {
      console.error('Failed to create task', err);
    }
  };

  const handleStatusChange = async (taskId: number, newStatus: TaskStatus) => {
    try {
      await api.updateProjectTaskStatus(taskId, newStatus);
      await fetchTasks();
    } catch (err) {
      console.error('Failed to change status', err);
    }
  };

  const handleDelete = async (taskId: number) => {
    try {
      await api.deleteProjectTask(taskId);
      await fetchTasks();
    } catch (err) {
      console.error('Failed to delete task', err);
    }
  };

  const handleUpdate = async (taskId: number, patch: Partial<ProjectTask>) => {
    try {
      const sanitized: Record<string, unknown> = { ...patch };
      if (sanitized.description === null) sanitized.description = undefined;
      await api.updateProjectTask(taskId, sanitized);
      await fetchTasks();
    } catch (err) {
      console.error('Failed to update task', err);
    }
  };

  const handleDetailSave = async (taskId: number, patch: Partial<ProjectTask>) => {
    try {
      const sanitized: Record<string, unknown> = { ...patch };
      if (sanitized.description === null) sanitized.description = undefined;
      await api.updateProjectTask(taskId, sanitized);
      setSelectedTask((prev) => prev && prev.id === taskId ? { ...prev, ...patch } as ProjectTask : prev);
      await fetchTasks();
    } catch (err) {
      console.error('Failed to update task', err);
    }
  };

  const handleDetailDelete = async (taskId: number) => {
    try {
      await api.deleteProjectTask(taskId);
      setSelectedTask(null);
      await fetchTasks();
    } catch (err) {
      console.error('Failed to delete task', err);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, taskId: number, currentStatus: TaskStatus) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ taskId, status: currentStatus }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStatus(status);
  };

  const handleDragLeave = () => {
    setDragOverStatus(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    setDragOverStatus(null);
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (data.taskId && data.status !== targetStatus) {
        await handleStatusChange(data.taskId, targetStatus);
      }
    } catch {
      // ignore malformed drag payloads
    }
  };

  if (selectedTask) {
    return (
      <ProjectTaskDetailPage
        task={selectedTask}
        onBack={() => setSelectedTask(null)}
        onSave={handleDetailSave}
        onDelete={handleDetailDelete}
        userName={userName}
      />
    );
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <span className="loading-text">Loading tasks...</span>
      </div>
    );
  }

  const userInitials = userName.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

  const filteredTasks = search
    ? tasks.filter((t) => t.title.toLowerCase().includes(search.toLowerCase()))
    : tasks;

  return (
    <div className="project-task-view">
      {/* Project Header */}
      <div className="ptv-project-header">
        <div className="ptv-breadcrumb">
          <button className="ptv-breadcrumb-link" onClick={onBack}>Projects</button>
          <ChevronRightIcon size={14} />
          <span className="ptv-breadcrumb-current">{project.title}</span>
        </div>
        <div className="ptv-project-info">
          <div className="ptv-project-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
          </div>
          <div className="ptv-project-details">
            <h2 className="ptv-project-title">{project.title}</h2>
            <div className="ptv-project-meta">
              {project.lead && (
                <span className="ptv-meta-item">
                  <span className="ptv-meta-avatar" style={{ background: assigneeColor(project.lead) }}>
                    {initials(project.lead)}
                  </span>
                  {project.lead}
                </span>
              )}
              {project.due_date && (
                <span className={`ptv-meta-item ptv-meta-due due-${dueStatus(project.due_date)}`}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                  {formatDueDate(project.due_date)}
                </span>
              )}
            </div>
          </div>
          <div className="ptv-project-stats">
            {STATUSES.map((status) => {
              const count = tasks.filter((t) => t.status === status).length;
              return (
                <div key={status} className="ptv-mini-stat">
                  <span className="ptv-mini-dot" style={{ background: STATUS_COLORS[status] }} />
                  <span className="ptv-mini-count">{count}</span>
                  <span className="ptv-mini-label">{status}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Header - same as Tasks */}
      <div className="tasks-header">
        <h1 className="page-title">Tasks</h1>
        <div className="tasks-header-actions">
          {searchOpen ? (
            <div className="topbar-search">
              <SearchIcon size={14} className="topbar-search-icon" />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onBlur={() => { setSearchOpen(false); setSearch(''); }}
                placeholder="Search tasks..."
                aria-label="Search tasks"
              />
            </div>
          ) : (
            <button className="th-btn th-icon" onClick={() => setSearchOpen(true)} aria-label="Search tasks">
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

          <button className="th-btn th-icon" aria-label="Filter tasks">
            <FunnelIcon size={15} />
          </button>

          <button className="th-add" onClick={() => { setQuickAddStatus('To Do'); setQuickAddTitle(''); }}>
            <PlusIcon size={14} />
            <span>Add Task</span>
          </button>

          <div className="dropdown-anchor">
            <button className="th-avatar" aria-label="Account menu">
              {userInitials || 'U'}
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'list' ? (
        <div className="ptv-status-sections">
          {STATUSES.map((status) => {
            const statusTasks = filteredTasks.filter((t) => t.status === status);
            const isCollapsed = !!collapsed[status];

            return (
              <section key={status} className="ptv-status-section">
                <button
                  className="ptv-status-header"
                  onClick={() => toggle(status)}
                  aria-expanded={!isCollapsed}
                >
                  <ChevronDownIcon
                    size={13}
                    className={`ptv-chevron ${isCollapsed ? 'collapsed' : ''}`}
                  />
                  <span className="ptv-status-dot" style={{ background: STATUS_COLORS[status] }} />
                  <span className="ptv-status-name">{status}</span>
                  <span className="ptv-status-count">{statusTasks.length}</span>
                </button>

                {!isCollapsed && (
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
                        <th className="lg-th lg-th-task"><span className="lg-th-inner">Task</span></th>
                        <th className="lg-th lg-th-priority"><span className="lg-th-inner">Priority</span></th>
                        <th className="lg-th lg-th-members"><span className="lg-th-inner">Members</span></th>
                        <th className="lg-th lg-th-due"><span className="lg-th-inner">Due Date</span></th>
                        <th className="lg-th lg-th-actions"><span className="lg-th-inner">Actions</span></th>
                      </tr>
                    </thead>

                    <tbody>
                      {statusTasks.length === 0 && quickAddStatus !== status ? (
                        <tr className="lg-empty-row">
                          <td colSpan={5}>No tasks</td>
                        </tr>
                      ) : (
                        statusTasks.map((task) => (
                          <ProjectTaskRow
                            key={task.id}
                            task={task}
                            onStatusChange={handleStatusChange}
                            onUpdate={handleUpdate}
                            onDelete={handleDelete}
                            onOpen={setSelectedTask}
                          />
                        ))
                      )}

                      {quickAddStatus === status ? (
                        <tr className="lg-add-row">
                          <td colSpan={5}>
                            <input
                              ref={quickAddRef}
                              className="lg-quick-add-input"
                              placeholder="Task name..."
                              value={quickAddTitle}
                              onChange={(e) => setQuickAddTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleQuickAdd(status);
                                if (e.key === 'Escape') { setQuickAddStatus(null); setQuickAddTitle(''); }
                              }}
                              onBlur={() => handleQuickAdd(status)}
                            />
                          </td>
                        </tr>
                      ) : (
                        <tr className="lg-add-row">
                          <td colSpan={5}>
                            <button
                              className="list-group-add"
                              onClick={() => { setQuickAddStatus(status); setQuickAddTitle(''); }}
                            >
                              <PlusIcon size={12} />
                              <span>Add Task</span>
                            </button>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </section>
            );
          })}
        </div>
      ) : (
        /* Board View */
        <div className="columns-container project-board">
          {STATUSES.map((status) => {
            const statusTasks = filteredTasks.filter((t) => t.status === status);
            const isOver = dragOverStatus === status;
            return (
              <div
                key={status}
                className={`column project-col ${isOver ? 'drag-over' : ''}`}
                onDragOver={(e) => handleDragOver(e, status)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, status)}
              >
                <div className="column-header">
                  <div className="column-title-group">
                    <span className="column-status-dot" style={{ background: STATUS_COLORS[status] }} />
                    <span className="column-title">{status}</span>
                    <span className="column-count">{statusTasks.length}</span>
                  </div>
                  <button
                    className="icon-btn"
                    onClick={() => { setQuickAddStatus(status); setQuickAddTitle(''); }}
                    aria-label={`Add task to ${status}`}
                  >
                    <PlusIcon size={15} />
                  </button>
                </div>
                <div className="column-tasks">
                  {statusTasks.map((task) => (
                    <ProjectTaskCard
                      key={task.id}
                      task={task}
                      fields={fields}
                      onOpen={setSelectedTask}
                      onDragStart={handleDragStart}
                      onStatusChange={handleStatusChange}
                      onDelete={handleDelete}
                    />
                  ))}
                  {quickAddStatus === status ? (
                    <input
                      ref={quickAddRef}
                      className="lg-quick-add-input board-quick-add"
                      placeholder="Task name..."
                      value={quickAddTitle}
                      onChange={(e) => setQuickAddTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleQuickAdd(status);
                        if (e.key === 'Escape') { setQuickAddStatus(null); setQuickAddTitle(''); }
                      }}
                      onBlur={() => handleQuickAdd(status)}
                    />
                  ) : (
                    <button
                      className="column-add"
                      onClick={() => { setQuickAddStatus(status); setQuickAddTitle(''); }}
                    >
                      <PlusIcon size={13} />
                      <span>Add Task</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Board View Card ────────────────────────────────── */

interface ProjectTaskCardProps {
  task: ProjectTask;
  fields: FieldVisibility;
  onOpen: (task: ProjectTask) => void;
  onDragStart: (e: React.DragEvent, taskId: number, status: TaskStatus) => void;
  onStatusChange: (taskId: number, status: TaskStatus) => void;
  onDelete: (taskId: number) => void;
}

function ProjectTaskCard({ task, fields, onOpen, onDragStart, onStatusChange, onDelete }: ProjectTaskCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const labels = parseLabels(task.labels);
  const due = formatDueDate(task.due_date);
  const dueState = dueStatus(task.due_date);
  const prio = PRIO_META[task.priority] || PRIO_META.Medium;

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t)) return;
      if (btnRef.current?.contains(t)) return;
      setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  return (
    <div
      className="task-card"
      draggable
      onDragStart={(e) => onDragStart(e, task.id, task.status)}
      onClick={() => onOpen(task)}
    >
      <div className="tc-header">
        <span className={`prio prio-${task.priority.toLowerCase()}`}>
          {prio.glyph} {task.priority}
        </span>
        <button
          ref={btnRef}
          className="icon-btn tc-menu-btn"
          aria-label={`More options for ${task.title}`}
          onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
        >
          <DotsIcon size={14} />
        </button>
      </div>
      <div className="tc-title">{task.title}</div>

      {fields.labels && labels.length > 0 && (
        <div className="tc-labels">
          {labels.slice(0, 3).map((label, i) => (
            <span className="tc-label" key={i}>{label}</span>
          ))}
          {labels.length > 3 && <span className="tc-label-more">+{labels.length - 3}</span>}
        </div>
      )}

      <div className="tc-meta">
        {fields.members && task.assignee && (
          <span className="member-avatar" style={{ background: assigneeColor(task.assignee) }} title={task.assignee}>
            {initials(task.assignee)}
          </span>
        )}
        {fields.collaborators && task.collaborators && (
          <div className="tc-collab-avatars">
            {parseLabels(task.collaborators).slice(0, 2).map((name, i) => (
              <span key={i} className="member-avatar" style={{ background: assigneeColor(name) }} title={name}>
                {initials(name)}
              </span>
            ))}
            {parseLabels(task.collaborators).length > 2 && (
              <span className="tc-collab-more">+{parseLabels(task.collaborators).length - 2}</span>
            )}
          </div>
        )}
        {fields.dueDate && due && (
          <span className={`tc-due due-${dueState}`}>
            <CalendarIcon size={11} />
            {due}
          </span>
        )}
      </div>

      {menuOpen && createPortal(
        <div className="row-menu tc-card-menu" ref={menuRef}>
          <button className="row-menu-item" onClick={() => { onOpen(task); setMenuOpen(false); }}>Open</button>
          {STATUSES.filter((s) => s !== task.status).map((s) => (
            <button key={s} className="row-menu-item" onClick={() => { onStatusChange(task.id, s); setMenuOpen(false); }}>
              Move to {s}
            </button>
          ))}
          <button className="row-menu-item row-menu-danger" onClick={() => { onDelete(task.id); setMenuOpen(false); }}>Delete</button>
        </div>,
        document.body
      )}
    </div>
  );
}

/* ── List View Row ────────────────────────────────── */

interface ProjectTaskRowProps {
  task: ProjectTask;
  onStatusChange: (taskId: number, status: TaskStatus) => void;
  onUpdate: (taskId: number, patch: Partial<ProjectTask>) => void;
  onDelete: (taskId: number) => void;
  onOpen: (task: ProjectTask) => void;
}

function ProjectTaskRow({ task, onStatusChange, onUpdate, onDelete, onOpen }: ProjectTaskRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ x: number; y: number; right: number } | null>(null);
  const actionsRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const membersRef = useRef<HTMLElement>(null);
  const membersBtnRef = useRef<HTMLButtonElement>(null);

  const prio = PRIO_META[task.priority] || PRIO_META.Medium;
  const due = formatDueDate(task.due_date);
  const dueState = dueStatus(task.due_date);

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

  return (
    <tr className="lg-row">
      <td className="lg-td lg-td-task">
        <button className="lg-task-btn" title={task.title} onClick={() => onOpen(task)}>
          {task.title}
        </button>
      </td>

      <td className="lg-td lg-td-prio">
        <span className={`prio ${prio.cls}`}>
          <span className="prio-glyph" aria-hidden="true">{prio.glyph}</span>
          {task.priority}
        </span>
      </td>

      <td className="lg-td lg-td-members">
        {task.assignee ? (
          <span
            ref={membersRef}
            className="member-avatar"
            style={{ background: assigneeColor(task.assignee) }}
            title={`Assignee: ${task.assignee}`}
            onClick={openPicker}
          >
            {initials(task.assignee)}
          </span>
        ) : (
          <button
            ref={membersBtnRef}
            className="member-add"
            title="Assign member"
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
          aria-label={`More options for ${task.title}`}
          onClick={openMenu}
        >
          <DotsIcon size={14} />
        </button>
      </td>

      {pickerOpen && anchor && createPortal(
        <div className="member-picker" ref={popRef} style={{ top: anchor.y, left: anchor.x }}>
          <div className="member-picker-title">Assign member</div>
          <button className="row-menu-item" onClick={() => { onUpdate(task.id, { assignee: null }); setPickerOpen(false); }}>Unassigned</button>
          {ASSIGNEES.map((a) => (
            <button
              key={a}
              className={`row-menu-item ${task.assignee === a ? 'selected' : ''}`}
              onClick={() => { onUpdate(task.id, { assignee: a }); setPickerOpen(false); }}
            >
              <span className="member-picker-avatar" style={{ background: assigneeColor(a) }}>
                {initials(a)}
              </span>
              {a}
            </button>
          ))}
        </div>,
        document.body
      )}

      {menuOpen && anchor && createPortal(
        <div className="row-menu" ref={popRef} style={{ top: anchor.y, right: window.innerWidth - anchor.right }}>
          <button className="row-menu-item" onClick={() => setMenuOpen(false)}>Edit</button>

          {STATUSES.filter((s) => s !== task.status).map((s) => (
            <button key={s} className="row-menu-item" onClick={() => { onStatusChange(task.id, s); setMenuOpen(false); }}>
              Move to {s}
            </button>
          ))}

          <button className="row-menu-item row-menu-danger" onClick={() => { onDelete(task.id); setMenuOpen(false); }}>Delete</button>
        </div>,
        document.body
      )}
    </tr>
  );
}
