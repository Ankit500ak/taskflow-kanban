import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Task, Column } from '../types';
import { assigneeColor, initials, formatDueDate } from '../utils/task';
import { api } from '../api';

interface TaskDetailPageProps {
  task: Task;
  columns: Column[];
  onBack: () => void;
  onSave: (id: number, patch: Partial<Task>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  userName: string;
}

const LABEL_COLORS: Record<string, string> = {
  Research: '#ede9fe', Design: '#fce7f3', Development: '#d1fae5',
  Testing: '#fef3c7', Deployment: '#e0e7ff',
};

interface Subtask {
  id: number;
  title: string;
  priority: string;
  member: string | null;
  due: string;
  completed?: boolean;
}

const PRIORITIES = ['No Priority', 'Urgent', 'High', 'Medium', 'Low'] as const;
const STATUSES = ['Backlog', 'To Do', 'Doing', 'Review', 'Completed', 'On Hold'] as const;

const STATUS_COLORS: Record<string, string> = {
  Backlog: '#f97316', 'To Do': '#3b82f6', Doing: '#eab308',
  Review: '#a855f7', Completed: '#22c55e', 'On Hold': '#ef4444',
};

const PRIO_COLORS: Record<string, string> = {
  'No Priority': '#d4d4d4', Urgent: '#ef4444', High: '#f97316', Medium: '#eab308', Low: '#3b82f6',
};

function prioGlyph(p: string) {
  return p === 'High' ? '↗' : p === 'Medium' ? '→' : p === 'Low' ? '↘' : '·';
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr + 'Z').getTime();
  const diff = Math.max(0, now - then);
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

const ALL_MEMBERS = ['Admin', 'Designer', 'Developer', 'QA', 'Security'];

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function firstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function formatCalDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function isInRange(ds: string, start: string | null | undefined, end: string | null | undefined): boolean {
  if (!start || !end) return false;
  return ds >= start && ds <= end;
}

function todayStr(): string { return new Date().toISOString().slice(0, 10); }
function addDays(n: number): string { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
function addWeeks(n: number): string { return addDays(n * 7); }
function addMonths(n: number): string { const d = new Date(); d.setMonth(d.getMonth() + n); return d.toISOString().slice(0, 10); }
function nextMonday(): string { const d = new Date(); const day = d.getDay(); d.setDate(d.getDate() + ((1 + 7 - day) % 7 || 7)); return d.toISOString().slice(0, 10); }
function nextWeekend(): string { const d = new Date(); const day = d.getDay(); d.setDate(d.getDate() + ((6 + 7 - day) % 7 || 7)); return d.toISOString().slice(0, 10); }

const DATE_PRESETS = [
  { label: 'Today', icon: '●', range: () => [todayStr(), todayStr()] },
  { label: 'Tomorrow', icon: '→', range: () => [addDays(1), addDays(1)] },
  { label: 'This week', icon: '↻', range: () => [todayStr(), nextWeekend()] },
  { label: 'Next week', icon: '→', range: () => [nextMonday(), addWeeks(2)] },
  { label: 'Next month', icon: '»', range: () => [addMonths(1), addMonths(2)] },
  { label: 'No date', icon: '✕', range: () => [null, null] },
];

export function TaskDetailPage({ task, columns, onBack, onSave, onDelete, userName }: TaskDetailPageProps) {
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [showPanel, setShowPanel] = useState(true);
  const [showMore, setShowMore] = useState(false);
  const [subCollapsed, setSubCollapsed] = useState(false);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubId, setNewSubId] = useState<number | null>(null);
  const [reply, setReply] = useState('');
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<{ id: number; author: string; text: string; time: string; color: string }[]>([]);
  const [membersOpen, setMembersOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [calMonth, setCalMonth] = useState(() => new Date().getMonth());
  const [calYear, setCalYear] = useState(() => new Date().getFullYear());
  const [dateField, setDateField] = useState<'start' | 'end'>('start');
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);
  const [datePos, setDatePos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const dateBtnRef = useRef<HTMLButtonElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const priorityRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const membersRef = useRef<HTMLDivElement>(null);
  const dateRef = useRef<HTMLDivElement>(null);

  // Fetch subtasks + comments from DB on mount
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const [subs, comms] = await Promise.all([
          api.getSubtasks(task.id),
          api.getComments(task.id),
        ]);
        if (cancel) return;
        setSubtasks(subs.map((s: any) => ({
          id: s.id,
          title: s.title,
          priority: s.priority || 'Low',
          member: s.member,
          due: s.due_date || '',
          completed: !!s.completed,
        })));
        setComments(comms.map((c: any) => ({
          id: c.id,
          author: c.author,
          text: c.text,
          color: c.color || '#6366f1',
          time: timeAgo(c.created_at),
        })));
      } catch { /* task may not exist yet */ }
    })();
    return () => { cancel = true; };
  }, [task.id]);

  useEffect(() => {
    if (!showMore && !priorityOpen && !statusOpen && !membersOpen && !dateOpen) return;
    const h = (e: MouseEvent) => {
      const t = e.target as Node;
      if (moreRef.current && !moreRef.current.contains(t)) setShowMore(false);
      if (priorityRef.current && !priorityRef.current.contains(t)) setPriorityOpen(false);
      if (statusRef.current && !statusRef.current.contains(t)) setStatusOpen(false);
      if (membersRef.current && !membersRef.current.contains(t)) setMembersOpen(false);
      if (dateOpen && !(t instanceof Element && t.closest('.tdp-drp')) && dateRef.current && !dateRef.current.contains(t)) setDateOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showMore, priorityOpen, statusOpen, membersOpen, dateOpen]);

  const curPriority = task.priority || 'Medium';
  const curStatus = task.column_name || 'Backlog';
  const labels = Array.isArray(task.labels) ? task.labels : [];
  const dueFmt = formatDueDate(task.due_date);

  const handlePriority = async (p: string) => {
    if (p === 'No Priority') return;
    await onSave(task.id, { priority: p as Task['priority'] });
    setPriorityOpen(false);
  };

  const handleStatus = async (s: string) => {
    const col = columns.find((c) => c.name === s);
    if (col) {
      await api.moveTask(task.id, col.id);
      await onSave(task.id, { column_id: col.id });
    }
    setStatusOpen(false);
  };

  const addSubtask = async () => {
    try {
      const created = await api.createSubtask(task.id, { title: '', priority: 'Medium' });
      const sub: Subtask = { id: created.id, title: created.title, priority: created.priority, member: created.member, due: '' };
      setSubtasks((prev) => [...prev, sub]);
      setNewSubId(created.id);
    } catch { /* ignore */ }
  };

  const updateSubtask = async (id: number, patch: Partial<Subtask>) => {
    setSubtasks((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    try { await api.updateSubtask(id, patch); } catch { /* ignore */ }
  };

  const deleteSubtask = async (id: number) => {
    setSubtasks((prev) => prev.filter((s) => s.id !== id));
    try { await api.deleteSubtask(id); } catch { /* ignore */ }
  };

  const cyclePriority = async (id: number) => {
    const order = ['Low', 'Medium', 'High'];
    let newP = 'Low';
    setSubtasks((prev) => prev.map((s) => {
      if (s.id !== id) return s;
      const idx = order.indexOf(s.priority);
      newP = order[(idx + 1) % order.length];
      return { ...s, priority: newP };
    }));
    try { await api.updateSubtask(id, { priority: newP }); } catch { /* ignore */ }
  };

  const addComment = async (text: string) => {
    try {
      const created = await api.createComment(task.id, { author: userName, text, color: assigneeColor(userName) });
      setComments((prev) => [...prev, {
        id: created.id,
        author: created.author,
        text: created.text,
        color: created.color || '#6366f1',
        time: 'just now',
      }]);
    } catch { /* ignore */ }
  };

  return (
    <div className="tdp">
      {/* ── Content area ── */}
      <div className="tdp-content">
        {/* Toolbar */}
        <div className="tdp-toolbar">
          <button className="tdp-tb-btn" onClick={onBack} title="Back to board">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <div className="tdp-tb-spacer" />
          <div className="tdp-tb-group">
            <button className="tdp-tb-btn" title="Lock">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
            </button>
            <button className="tdp-tb-btn tdp-tb-badge" title="Watchers">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
              <span>1</span>
            </button>
            <button className="tdp-tb-btn" title="Share">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
            </button>
            <div className="tdp-more-wrap" ref={moreRef}>
              <button className="tdp-tb-btn" title="More" onClick={() => setShowMore(!showMore)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></svg>
              </button>
              {showMore && (
                <div className="tdp-more-menu">
                  <button onClick={() => setShowMore(false)}>Duplicate</button>
                  <button onClick={() => setShowMore(false)}>Move</button>
                  <button onClick={() => setShowMore(false)}>Archive</button>
                  <button className="danger" onClick={() => { setShowMore(false); onDelete(task.id); }}>Delete</button>
                </div>
              )}
            </div>
            <button className="tdp-tb-btn" title="Toggle panel" onClick={() => setShowPanel(!showPanel)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><line x1="15" y1="3" x2="15" y2="21" /></svg>
            </button>
          </div>
        </div>

        {/* Title */}
        <h1 className="tdp-title">{task.title}</h1>
        {task.description && <p className="tdp-desc">{task.description}</p>}

        {/* Properties */}
        <div className="tdp-row">
          <span className="tdp-label">Properties</span>
          <div className="tdp-chips">
            {task.assignee && (
              <div className="tdp-chip">
                <span className="tdp-chip-av" style={{ background: assigneeColor(task.assignee) }}>{initials(task.assignee)}</span>
                <span>{task.assignee}</span>
              </div>
            )}
            {task.due_date && (
              <div className="tdp-chip tdp-chip-date">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                <span>{dueFmt}</span>
              </div>
            )}
          </div>
        </div>

        {/* Labels */}
        <div className="tdp-row">
          <span className="tdp-label">Labels</span>
          <div className="tdp-chips">
            {labels.map((l) => (
              <span key={l} className="tdp-tag" style={{ background: LABEL_COLORS[l] || '#f3f4f6' }}>
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg>
                {l}
              </span>
            ))}
            {labels.length === 0 && <span className="tdp-none">None</span>}
          </div>
        </div>

        {/* Resources */}
        <div className="tdp-row">
          <span className="tdp-label">Resources</span>
          <button className="tdp-resource-btn">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
            Add document or link...
          </button>
        </div>

        {/* Subtasks */}
        <div className="tdp-section">
          <button className="tdp-section-head" onClick={() => setSubCollapsed(!subCollapsed)}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform 150ms', transform: subCollapsed ? 'rotate(-90deg)' : 'none' }}><polyline points="6 9 12 15 18 9" /></svg>
            <span>Subtasks</span>
          </button>

          {!subCollapsed && (
            <div className="tdp-table-wrap">
              <table className="tdp-table">
                <colgroup>
                  <col style={{ width: 'auto' }} />
                  <col style={{ width: '90px' }} />
                  <col style={{ width: '56px' }} />
                  <col style={{ width: '100px' }} />
                  <col style={{ width: '36px' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Priority</th>
                    <th>Members</th>
                    <th>Due Date</th>
                    <th className="tdp-th-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subtasks.map((s) => (
                    <tr key={s.id}>
                      <td className="tdp-t-task">
                        {newSubId === s.id ? (
                          <input
                            className="tdp-sub-input"
                            autoFocus
                            placeholder="Subtask title..."
                            value={s.title}
                            onChange={(e) => updateSubtask(s.id, { title: e.target.value })}
                            onBlur={() => { if (!s.title.trim()) deleteSubtask(s.id); setNewSubId(null); }}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.currentTarget.blur(); } if (e.key === 'Escape') { deleteSubtask(s.id); setNewSubId(null); } }}
                          />
                        ) : (
                          <span className="tdp-t-editable" onClick={() => setNewSubId(s.id)} title="Click to edit">{s.title || 'Untitled'}</span>
                        )}
                      </td>
                      <td>
                        <button className="tdp-prio-btn" onClick={() => cyclePriority(s.id)} title="Click to change priority">
                          <span className="tdp-prio" style={{ color: PRIO_COLORS[s.priority], background: PRIO_COLORS[s.priority] + '1a' }}>
                            {prioGlyph(s.priority)} {s.priority}
                          </span>
                        </button>
                      </td>
                      <td>
                        {s.member ? (
                          <span className="tdp-mini-av" style={{ background: assigneeColor(s.member) }}>{initials(s.member)}</span>
                        ) : (
                          <button className="tdp-add-circle">+</button>
                        )}
                      </td>
                      <td className="tdp-t-date">{s.due || '—'}</td>
                      <td className="tdp-t-right">
                        <button className="tdp-sub-del" onClick={() => deleteSubtask(s.id)} title="Delete subtask">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button className="tdp-add-row" onClick={addSubtask}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                <span>Add Subtasks</span>
              </button>
            </div>
          )}
        </div>

        {/* Comments */}
        <div className="tdp-section">
          <div className="tdp-section-head-text">Discussion</div>
          <div className="tdp-comments">
            {comments.map((c) => (
              <div key={c.id} className="tdp-comment">
                <div className="tdp-c-head">
                  <span className="tdp-c-av" style={{ background: c.color }}>{initials(c.author)}</span>
                  <span className="tdp-c-name">{c.author}</span>
                  <span className="tdp-c-time">{c.time}</span>
                  <div className="tdp-c-actions">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></svg>
                  </div>
                </div>
                <div className="tdp-c-body">{c.text}</div>
              </div>
            ))}
            <div className="tdp-reply">
              <span className="tdp-c-av" style={{ background: assigneeColor(userName) }}>{initials(userName)}</span>
              <input
                placeholder="Leave a reply..."
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && reply.trim()) {
                    addComment(reply.trim());
                    setReply('');
                  }
                }}
              />
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#a3a3a3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
              <button
                className="tdp-send-btn"
                onClick={() => {
                  if (reply.trim()) {
                    addComment(reply.trim());
                    setReply('');
                  }
                }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#737373" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
              </button>
            </div>
          </div>
          <div className="tdp-add-comment">
            <input
              placeholder="Add a comment..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && comment.trim()) {
                  addComment(comment.trim());
                  setComment('');
                }
              }}
            />
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#a3a3a3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
            <button
              className="tdp-send-btn"
              onClick={() => {
                if (comment.trim()) {
                  addComment(comment.trim());
                  setComment('');
                }
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#737373" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
            </button>
          </div>
        </div>
      </div>

      {/* ── Right panel ── */}
      {showPanel && (
        <aside className="tdp-panel">
          <div className="tdp-card">
            <div className="tdp-card-head">
              <span>Details</span>
              <div className="tdp-card-head-btns">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
              </div>
            </div>

            {/* Status */}
            <div className="tdp-prop tdp-prop-rel" ref={statusRef}>
              <span className="tdp-prop-label">Status</span>
              <button className="tdp-prop-val" onClick={() => { setStatusOpen(!statusOpen); setPriorityOpen(false); }}>
                <span className="tdp-dot" style={{ background: STATUS_COLORS[curStatus] }} />
                <span>{curStatus}</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#a3a3a3" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 'auto', transition: 'transform 120ms', transform: statusOpen ? 'rotate(180deg)' : 'none' }}><polyline points="6 9 12 15 18 9" /></svg>
              </button>
              {statusOpen && (
                <div className="tdp-dropdown">
                  <div className="tdp-dd-title">Status</div>
                  {STATUSES.map((s) => (
                    <button key={s} className={`tdp-dd-item ${curStatus === s ? 'sel' : ''}`} onClick={() => handleStatus(s)}>
                      <span className="tdp-dot" style={{ background: STATUS_COLORS[s] }} />
                      <span>{s}</span>
                      {curStatus === s && <span className="tdp-dd-check">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Priority */}
            <div className="tdp-prop tdp-prop-rel" ref={priorityRef}>
              <span className="tdp-prop-label">Priority</span>
              <button className="tdp-prop-val" onClick={() => { setPriorityOpen(!priorityOpen); setStatusOpen(false); }}>
                <span className="tdp-dot" style={{ background: PRIO_COLORS[curPriority] }} />
                <span>{curPriority}</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#a3a3a3" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 'auto', transition: 'transform 120ms', transform: priorityOpen ? 'rotate(180deg)' : 'none' }}><polyline points="6 9 12 15 18 9" /></svg>
              </button>
              {priorityOpen && (
                <div className="tdp-dropdown">
                  <div className="tdp-dd-title">Priority</div>
                  {PRIORITIES.map((p) => (
                    <button key={p} className={`tdp-dd-item ${curPriority === p ? 'sel' : ''}`} onClick={() => handlePriority(p)}>
                      <span className="tdp-dot" style={{ background: PRIO_COLORS[p] }} />
                      <span>{p}</span>
                      {curPriority === p && <span className="tdp-dd-check">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Members */}
            <div className="tdp-prop tdp-prop-rel" ref={membersRef}>
              <span className="tdp-prop-label">Members</span>
              <button className="tdp-prop-val" onClick={() => { setMembersOpen(!membersOpen); setPriorityOpen(false); setStatusOpen(false); setDateOpen(false); }}>
                {task.assignee ? (
                  <>
                    <span className="tdp-mini-av" style={{ background: assigneeColor(task.assignee) }}>{initials(task.assignee)}</span>
                    <span>{task.assignee}</span>
                  </>
                ) : (
                  <>
                    <span className="tdp-add-avatar">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    </span>
                    <span className="tdp-none-text">Add members</span>
                  </>
                )}
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#a3a3a3" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 'auto', transition: 'transform 120ms', transform: membersOpen ? 'rotate(180deg)' : 'none' }}><polyline points="6 9 12 15 18 9" /></svg>
              </button>
              {membersOpen && (
                <div className="tdp-dropdown tdp-dd-wide">
                  <div className="tdp-dd-title">Members</div>
                  {ALL_MEMBERS.map((m) => (
                    <button key={m} className={`tdp-dd-item ${task.assignee === m ? 'sel' : ''}`} onClick={() => { onSave(task.id, { assignee: m as any }); setMembersOpen(false); }}>
                      <span className="tdp-mini-av" style={{ background: assigneeColor(m) }}>{initials(m)}</span>
                      <span>{m}</span>
                      {task.assignee === m && <span className="tdp-dd-check">✓</span>}
                    </button>
                  ))}
                  {task.assignee && (
                    <button className="tdp-dd-item tdp-dd-danger" onClick={() => { onSave(task.id, { assignee: null }); setMembersOpen(false); }}>
                      <span className="tdp-dd-remove-icon">✕</span>
                      <span>Remove member</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Dates */}
            <div className="tdp-prop tdp-prop-rel" ref={dateRef}>
              <span className="tdp-prop-label">Dates</span>
              <button
                ref={dateBtnRef}
                className="tdp-prop-val"
                onClick={() => {
                  if (!dateOpen && dateBtnRef.current) {
                    const r = dateBtnRef.current.getBoundingClientRect();
                    setDatePos({ top: r.bottom + 4, left: Math.max(8, r.left - 170) });
                  }
                  setDateOpen(!dateOpen);
                  setPriorityOpen(false);
                  setStatusOpen(false);
                  setMembersOpen(false);
                }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                <span>{task.start_date ? formatCalDate(task.start_date) : 'Start'}</span>
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#a3a3a3" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /></svg>
                <span>{task.due_date ? formatCalDate(task.due_date) : 'End'}</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#a3a3a3" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 'auto', transition: 'transform 120ms', transform: dateOpen ? 'rotate(180deg)' : 'none' }}><polyline points="6 9 12 15 18 9" /></svg>
              </button>
            </div>

            {/* Date Range Picker — portaled floating window */}
            {dateOpen && createPortal(
              <>
                <div className="tdp-drp-overlay" onClick={() => setDateOpen(false)} />
                <div className="tdp-drp" style={{ position: 'fixed', top: datePos.top, left: datePos.left, zIndex: 9999 }}>
                  {/* Header inputs */}
                  <div className="tdp-drp-header">
                    <button className={`tdp-drp-input ${dateField === 'start' ? 'active' : ''}`} onClick={() => setDateField('start')}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                      <span>{task.start_date ? formatCalDate(task.start_date) : 'Start date'}</span>
                    </button>
                    <span className="tdp-drp-arrow">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#a3a3a3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                    </span>
                    <button className={`tdp-drp-input ${dateField === 'end' ? 'active' : ''}`} onClick={() => setDateField('end')}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                      <span>{task.due_date ? formatCalDate(task.due_date) : 'End date'}</span>
                    </button>
                  </div>

                  <div className="tdp-drp-body">
                    {/* Presets */}
                    <div className="tdp-drp-presets">
                      {DATE_PRESETS.map((p) => (
                        <button key={p.label} className="tdp-drp-preset" onClick={() => {
                          const [s, e] = p.range();
                          onSave(task.id, { start_date: s, due_date: e });
                          if (s) { const d = new Date(s + 'T00:00:00'); setCalMonth(d.getMonth()); setCalYear(d.getFullYear()); }
                          setDateOpen(false);
                        }}>
                          <span className="tdp-drp-preset-icon">{p.icon}</span>
                          <span>{p.label}</span>
                        </button>
                      ))}
                    </div>

                    {/* Calendar */}
                    <div className="tdp-drp-cal">
                      <div className="tdp-cal-nav">
                        <button className="tdp-cal-nav-btn" onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(calYear - 1); } else { setCalMonth(calMonth - 1); } }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                        </button>
                        <span className="tdp-cal-month-label">{MONTH_NAMES[calMonth]} {calYear}</span>
                        <button className="tdp-cal-nav-btn" onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(calYear + 1); } else { setCalMonth(calMonth + 1); } }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                        </button>
                      </div>
                      <div className="tdp-cal-weekdays">
                        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => <span key={d}>{d}</span>)}
                      </div>
                      <div className="tdp-cal-grid">
                        {Array.from({ length: firstDayOfMonth(calYear, calMonth) }).map((_, i) => <span key={`e${i}`} className="tdp-cal-empty" />)}
                        {Array.from({ length: daysInMonth(calYear, calMonth) }).map((_, i) => {
                          const day = i + 1;
                          const ds = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                          const isStart = task.start_date === ds;
                          const isEnd = task.due_date === ds;
                          const isToday = new Date().toISOString().slice(0, 10) === ds;
                          const inRange = isInRange(ds, task.start_date, task.due_date);
                          const isHoverTarget = hoveredDay && dateField === 'end' && task.start_date && !task.due_date && ds >= task.start_date && ds <= hoveredDay;
                          return (
                            <button
                              key={day}
                              className={`tdp-cal-day ${isStart ? 'sel-start' : ''} ${isEnd ? 'sel-end' : ''} ${isToday ? 'today' : ''} ${inRange || isHoverTarget ? 'in-range' : ''}`}
                              onMouseEnter={() => setHoveredDay(ds)}
                              onMouseLeave={() => setHoveredDay(null)}
                              onClick={() => {
                                if (dateField === 'start') {
                                  if (!task.due_date || ds > task.due_date) {
                                    onSave(task.id, { start_date: ds, due_date: ds });
                                  } else {
                                    onSave(task.id, { start_date: ds });
                                  }
                                  setDateField('end');
                                } else {
                                  if (task.start_date && ds < task.start_date) {
                                    onSave(task.id, { start_date: ds, due_date: task.start_date });
                                    setDateField('start');
                                  } else {
                                    onSave(task.id, { due_date: ds });
                                    setDateField('start');
                                  }
                                }
                                setHoveredDay(null);
                              }}
                            >
                              {day}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="tdp-drp-footer">
                    {(task.start_date || task.due_date) && (
                      <button className="tdp-drp-clear" onClick={() => { onSave(task.id, { start_date: null, due_date: null }); setDateOpen(false); }}>Clear dates</button>
                    )}
                    <button className="tdp-drp-done" onClick={() => setDateOpen(false)}>Done</button>
                  </div>
                </div>
              </>,
              document.body
            )}

            {/* Labels */}
            <div className="tdp-prop">
              <span className="tdp-prop-label">Labels</span>
              <div className="tdp-prop-val-content">
                {labels.length > 0 ? (
                  <div className="tdp-prop-tags">
                    {labels.map((l) => (
                      <span key={l} className="tdp-tag-sm" style={{ background: LABEL_COLORS[l] || '#f3f4f6' }}>{l}</span>
                    ))}
                  </div>
                ) : (
                  <button className="tdp-prop-add-row">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    Add labels
                  </button>
                )}
              </div>
            </div>

            {/* Teams */}
            <div className="tdp-prop">
              <span className="tdp-prop-label">Teams</span>
              <div className="tdp-prop-val-content">
                <button className="tdp-prop-add-row">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                  Add teams
                </button>
              </div>
            </div>

            {/* Reporter */}
            <div className="tdp-prop">
              <span className="tdp-prop-label">Reporter</span>
              <div className="tdp-prop-val-content">
                {task.reporter ? (
                  <div className="tdp-prop-member">
                    <span className="tdp-mini-av" style={{ background: assigneeColor(task.reporter) }}>{initials(task.reporter)}</span>
                    <span>{task.reporter}</span>
                  </div>
                ) : (
                  <button className="tdp-prop-add-row">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    Add reporter
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Updates */}
          <div className="tdp-card">
            <div className="tdp-card-head"><span>Updates</span></div>
            <div className="tdp-update">
              <span className="tdp-upd-av" style={{ background: '#ef4444' }}>Y</span>
              <div className="tdp-upd-body">
                <span className="tdp-upd-name">You</span>
                <span className="tdp-upd-text">changed priority from No priority to Ur...</span>
              </div>
            </div>
            <div className="tdp-update">
              <span className="tdp-upd-av" style={{ background: '#6366f1' }}>Y</span>
              <div className="tdp-upd-body">
                <span className="tdp-upd-name">You</span>
                <span className="tdp-upd-text">posted an update · Aug 2026</span>
              </div>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}