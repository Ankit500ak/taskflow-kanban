import { useState, useEffect, useRef, RefObject } from 'react';
import { createPortal } from 'react-dom';
import { Task, Column, FieldVisibility, Assignee } from '../types';
import { DotsIcon, ChevronDownIcon, PlusIcon } from './Icons';
import { assigneeColor, initials, formatDueDate, dueStatus } from '../utils/task';

interface ListViewProps {
  tasks: Task[];
  columns: Column[];
  fields: FieldVisibility;
  userName: string;
  onOpen: (task: Task) => void;
  onMove: (taskId: number, columnId: number) => void;
  onSave: (id: number, patch: Partial<Task>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onDuplicate: (id: number) => void;
  onQuickAdd: (columnId: number) => void;
}

const ASSIGNEES: Assignee[] = ['Admin', 'Designer', 'Developer', 'QA', 'Security'];
const PRIORITY_ORDER = { High: 0, Medium: 1, Low: 2 };
const PRIO_META: Record<string, { glyph: string; cls: string }> = {
  High: { glyph: '↗', cls: 'prio-high' },
  Medium: { glyph: '→', cls: 'prio-medium' },
  Low: { glyph: '↘', cls: 'prio-low' },
};

type SortKey = 'title' | 'priority' | 'members' | 'due' | 'created';
type SortState = { key: SortKey; dir: 'asc' | 'desc' };

type Popover = { rowId: number; kind: 'menu' | 'picker' } | null;

const compare = (a: Task, b: Task, key: SortKey) => {
  switch (key) {
    case 'title':
      return a.title.localeCompare(b.title);
    case 'priority':
      return (PRIORITY_ORDER[a.priority] ?? 9) - (PRIORITY_ORDER[b.priority] ?? 9);
    case 'members':
      return (a.assignee || '').localeCompare(b.assignee || '');
    case 'due': {
      const da = new Date(a.due_date || 0).getTime();
      const db = new Date(b.due_date || 0).getTime();
      return da - db;
    }
    case 'created':
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  }
};

function sortTasks(list: Task[], sort: SortState): Task[] {
  const dir = sort.dir === 'asc' ? 1 : -1;
  return [...list].sort((a, b) => compare(a, b, sort.key) * dir);
}

export function ListView({
  tasks,
  columns,
  fields,
  userName,
  onOpen,
  onMove,
  onSave,
  onDelete,
  onDuplicate,
  onQuickAdd,
}: ListViewProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem(`taskflow_collapsed_${userName}`) || '{}');
    } catch {
      return {};
    }
  });
  const [sort, setSort] = useState<SortState>({ key: 'priority', dir: 'asc' });

  useEffect(() => {
    try {
      localStorage.setItem(`taskflow_collapsed_${userName}`, JSON.stringify(collapsed));
    } catch {
      // ignore
    }
  }, [collapsed, userName]);

  const toggle = (columnId: number) =>
    setCollapsed((prev) => ({ ...prev, [String(columnId)]: !prev[String(columnId)] }));

  const requestSort = (key: SortKey) =>
    setSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }
    );

  const headerCols: { label: string; key?: SortKey }[] = [
    { label: 'Task', key: 'title' },
    ...(fields.priority ? [{ label: 'Priority', key: 'priority' as SortKey }] : []),
    ...(fields.members ? [{ label: 'Members', key: 'members' as SortKey }] : []),
    ...(fields.dueDate ? [{ label: 'Due Date', key: 'due' as SortKey }] : []),
    ...(fields.labels ? [{ label: 'Labels' }] : []),
    ...(fields.status ? [{ label: 'Status' }] : []),
    ...(fields.reporter ? [{ label: 'Reporter' }] : []),
  ];

  return (
    <div className="list-view">
      {columns.map((column) => {
        const colTasks = sortTasks(
          tasks.filter((t) => t.column_id === column.id),
          sort
        );
        const isCollapsed = !!collapsed[String(column.id)];

        return (
          <section className="list-group" key={column.id}>
            <button
              className="list-group-header"
              onClick={() => toggle(column.id)}
              aria-expanded={!isCollapsed}
            >
              <ChevronDownIcon
                size={13}
                className={`list-group-chevron ${isCollapsed ? 'collapsed' : ''}`}
              />
              <span className="list-group-name">{column.name}</span>
              <span className="list-group-count">{colTasks.length}</span>
            </button>

            {!isCollapsed && (
              <table className="lg-table">
                <colgroup>
                  <col className="lg-task-col" />
                  {fields.priority && <col className="lg-prio-col" />}
                  {fields.members && <col className="lg-members-col" />}
                  {fields.dueDate && <col className="lg-due-col" />}
                  {fields.labels && <col className="lg-labels-col" />}
                  {fields.status && <col className="lg-status-col" />}
                  {fields.reporter && <col className="lg-reporter-col" />}
                  <col className="lg-actions-col" />
                </colgroup>

                <thead>
                  <tr>
                    {headerCols.map((h) => (
                      <th
                        key={h.label}
                        className={h.label === 'Task' ? 'lg-th lg-th-task' : `lg-th lg-th-${h.key || h.label.toLowerCase()}`}
                        onClick={h.key ? () => requestSort(h.key!) : undefined}
                        aria-sort={h.key && sort.key === h.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                      >
                        <span className={`lg-th-inner ${h.key ? 'sortable' : ''}`}>
                          {h.label}
                          {h.key && sort.key === h.key && (
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
                  {colTasks.length === 0 ? (
                    <tr className="lg-empty-row">
                      <td colSpan={headerCols.length + 1}>No tasks</td>
                    </tr>
                  ) : (
                    colTasks.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        columns={columns}
                        fields={fields}
                        onOpen={onOpen}
                        onMove={onMove}
                        onSave={onSave}
                        onDelete={onDelete}
                        onDuplicate={onDuplicate}
                      />
                    ))
                  )}

                  <tr className="lg-add-row">
                    <td colSpan={headerCols.length + 1}>
                      <button className="list-group-add" onClick={() => onQuickAdd(column.id)}>
                        <PlusIcon size={12} />
                        <span>Add Task</span>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </section>
        );
      })}
    </div>
  );
}

interface TaskRowProps {
  task: Task;
  columns: Column[];
  fields: FieldVisibility;
  onOpen: (task: Task) => void;
  onMove: (taskId: number, columnId: number) => void;
  onSave: (id: number, patch: Partial<Task>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onDuplicate: (id: number) => void;
}

function TaskRow({ task, columns, fields, onOpen, onMove, onSave, onDelete, onDuplicate }: TaskRowProps) {
  const [active, setActive] = useState<Popover>(null);
  const [openSub, setOpenSub] = useState<'status' | 'priority' | 'due' | null>(null);
  const [anchor, setAnchor] = useState<{ x: number; y: number; right: number } | null>(null);

  const actionsRef = useRef<HTMLButtonElement>(null);
  const membersRef = useRef<HTMLElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const membersBtnRef = useRef<HTMLButtonElement>(null);
  const openMenu = () => {
    if (active?.rowId === task.id && active.kind === 'menu') {
      setActive(null);
      return;
    }
    setOpenSub(null);
    const rect = actionsRef.current?.getBoundingClientRect();
    if (rect) setAnchor({ x: rect.left, y: rect.bottom + 4, right: rect.right });
    setActive({ rowId: task.id, kind: 'menu' });
  };

  const openPicker = () => {
    if (active?.rowId === task.id && active.kind === 'picker') {
      setActive(null);
      return;
    }
    setOpenSub(null);
    const rect = (membersBtnRef.current || membersRef.current)?.getBoundingClientRect();
    if (rect) setAnchor({ x: rect.left, y: rect.bottom + 4, right: rect.right });
    setActive({ rowId: task.id, kind: 'picker' });
  };

  const pick = (fn: () => void) => {
    setActive(null);
    setOpenSub(null);
    fn();
  };

  useEffect(() => {
    if (!active) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (popRef.current?.contains(t)) return;
      if (actionsRef.current?.contains(t)) return;
      if (membersRef.current?.contains(t)) return;
      if (membersBtnRef.current?.contains(t)) return;
      setActive(null);
      setOpenSub(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [active]);

  const menuOpen = active?.rowId === task.id && active.kind === 'menu';
  const pickerOpen = active?.rowId === task.id && active.kind === 'picker';
  const prio = PRIO_META[task.priority] || PRIO_META.Medium;
  const due = formatDueDate(task.due_date);
  const dueState = dueStatus(task.due_date);

  return (
    <tr className="lg-row">
      <td className="lg-td lg-td-task">
        <button className="lg-task-btn" title={task.title} onClick={() => onOpen(task)}>
          {task.title}
        </button>
      </td>

      {fields.priority && (
        <td className="lg-td lg-td-prio">
          <span className={`prio ${prio.cls}`}>
            <span className="prio-glyph" aria-hidden="true">{prio.glyph}</span>
            {task.priority}
          </span>
        </td>
      )}

      {fields.members && (
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
      )}

      {fields.dueDate && (
        <td className="lg-td lg-td-due">
          {due ? (
            <span
              className={`lg-due-text due-${dueState}`}
              title={due}
            >
              {due}
            </span>
          ) : (
            <span className="lg-muted">—</span>
          )}
        </td>
      )}

      {fields.labels && (
        <td className="lg-td lg-td-labels">
          <span className="lg-label-list">
            {(Array.isArray(task.labels) ? task.labels : []).slice(0, 2).join(', ') || '—'}
          </span>
        </td>
      )}

      {fields.status && <td className="lg-td lg-td-status">{task.column_name || '—'}</td>}

      {fields.reporter && (
        <td className="lg-td lg-td-reporter">{task.reporter || task.assignee || '—'}</td>
      )}

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
        <MemberPicker
          popRef={popRef}
          anchor={anchor}
          task={task}
          onAssign={(assignee) => pick(() => onSave(task.id, { assignee }))}
        />,
        document.body
      )}

      {menuOpen && anchor && createPortal(
        <div className="row-menu" ref={popRef} style={{ top: anchor.y, right: window.innerWidth - anchor.right }}>
          <button className="row-menu-item" onClick={() => pick(() => onOpen(task))}>Open</button>
          <button className="row-menu-item" onClick={() => pick(() => onOpen(task))}>Edit</button>

          <div className="row-menu-sub">
            <button className="row-menu-item" onClick={() => setOpenSub(openSub === 'status' ? null : 'status')}>
              <span>Change status</span>
              <ChevronDownIcon size={12} className="sub-chevron" />
            </button>
            {openSub === 'status' && (
              <div className="row-submenu">
                {columns.filter((c) => c.id !== task.column_id).map((c) => (
                  <button key={c.id} className="row-menu-item" onClick={() => pick(() => onMove(task.id, c.id))}>
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button className="row-menu-item" onClick={() => pick(() => onSave(task.id, { assignee: task.assignee }))}>
            Assign member
          </button>

          <div className="row-menu-sub">
            <button className="row-menu-item" onClick={() => setOpenSub(openSub === 'priority' ? null : 'priority')}>
              <span>Change priority</span>
              <ChevronDownIcon size={12} className="sub-chevron" />
            </button>
            {openSub === 'priority' && (
              <div className="row-submenu">
                {(['High', 'Medium', 'Low'] as const).map((p) => (
                  <button key={p} className="row-menu-item" onClick={() => pick(() => onSave(task.id, { priority: p }))}>
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button className="row-menu-item" onClick={() => setOpenSub('due')}>Change due date</button>
          <button className="row-menu-item" onClick={() => pick(() => onDuplicate(task.id))}>Duplicate</button>
          <button className="row-menu-item row-menu-danger" onClick={() => pick(() => onDelete(task.id))}>Delete</button>

          {openSub === 'due' && (
            <div className="row-submenu due-submenu">
              <input
                type="date"
                value={task.due_date || ''}
                autoFocus
                onChange={(e) => pick(() => onSave(task.id, { due_date: e.target.value || null }))}
              />
            </div>
          )}
        </div>,
        document.body
      )}
    </tr>
  );
}

function MemberPicker({
  popRef,
  anchor,
  task,
  onAssign,
}: {
  popRef: RefObject<HTMLDivElement>;
  anchor: { x: number; y: number; right: number };
  task: Task;
  onAssign: (assignee: string) => void;
}) {
  return (
    <div className="member-picker" ref={popRef} style={{ top: anchor.y, left: anchor.x }}>
      <div className="member-picker-title">Assign member</div>
      <button className="row-menu-item" onClick={() => onAssign('')}>Unassigned</button>
      {ASSIGNEES.map((a) => (
        <button
          key={a}
          className={`row-menu-item ${task.assignee === a ? 'selected' : ''}`}
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