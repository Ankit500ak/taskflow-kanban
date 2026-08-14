import { useState, useRef, useEffect } from 'react';
import { Column, Assignee } from '../types';
import { XIcon, CalendarIcon, ChevronDownIcon } from './Icons';
import { assigneeColor, initials } from '../utils/task';

interface QuickAddProps {
  column: Column | null;
  columns: Column[];
  onClose: () => void;
  onSubmit: (input: {
    column_id: number;
    title: string;
    description?: string;
    priority: 'Low' | 'Medium' | 'High';
    assignee?: string;
    due_date?: string;
    labels?: string[];
  }) => Promise<void>;
}

const ASSIGNEES: Assignee[] = ['Admin', 'Designer', 'Developer', 'QA', 'Security'];
const LABEL_PRESETS = ['Deployment', 'Design', 'Testing', 'Audit', 'Updated', 'Research', 'Backend'];
const PRIO_OPTIONS: { value: 'Low' | 'Medium' | 'High'; label: string; glyph: string; color: string }[] = [
  { value: 'Low', label: 'Low', glyph: '↘', color: '#3b82f6' },
  { value: 'Medium', label: 'Medium', glyph: '→', color: '#f59e0b' },
  { value: 'High', label: 'High', glyph: '↗', color: '#ef4444' },
];

export function QuickAdd({ column, columns, onClose, onSubmit }: QuickAddProps) {
  const [columnId, setColumnId] = useState(column?.id ?? columns[0]?.id ?? 0);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [assignee, setAssignee] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [labels, setLabels] = useState<string[]>([]);
  const [labelInput, setLabelInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const assigneeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!assigneeOpen) return;
    const handler = (e: MouseEvent) => {
      if (assigneeRef.current && !assigneeRef.current.contains(e.target as Node)) {
        setAssigneeOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [assigneeOpen]);

  const addLabel = (l: string) => {
    const t = l.trim();
    if (t && !labels.includes(t)) setLabels((prev) => [...prev, t]);
    setLabelInput('');
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('Title is required');
      titleRef.current?.focus();
      return;
    }
    setSaving(true);
    setError('');
    await onSubmit({
      column_id: columnId,
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      assignee: assignee || undefined,
      due_date: dueDate || undefined,
      labels: labels.length ? labels : undefined,
    });
    setSaving(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit();
  };

  return (
    <div className="modal-overlay" onClick={onClose} onKeyDown={handleKeyDown}>
      <div className="qa-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="qa-header">
          <div className="qa-header-left">
            <span className="qa-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
            </span>
            <h2>New task</h2>
          </div>
          <button className="qa-close" onClick={onClose} aria-label="Close">
            <XIcon size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="qa-body">
          {/* Title */}
          <div className="qa-title-row">
            <input
              ref={titleRef}
              className="qa-title-input"
              value={title}
              onChange={(e) => { setTitle(e.target.value); if (error) setError(''); }}
              placeholder="Task title"
            />
          </div>

          {/* Description */}
          <div className="qa-desc-row">
            <textarea
              className="qa-desc-input"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description..."
            />
          </div>

          {/* Properties grid */}
          <div className="qa-props">
            {/* Status */}
            <div className="qa-prop">
              <span className="qa-prop-label">Status</span>
              <div className="qa-prop-value">
                <select
                  className="qa-select"
                  value={columnId}
                  onChange={(e) => setColumnId(Number(e.target.value))}
                >
                  {columns.map((col) => (
                    <option key={col.id} value={col.id}>{col.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Priority */}
            <div className="qa-prop">
              <span className="qa-prop-label">Priority</span>
              <div className="qa-prio-group">
                {PRIO_OPTIONS.map((p) => (
                  <button
                    key={p.value}
                    className={'qa-prio-btn' + (priority === p.value ? ' active' : '')}
                    onClick={() => setPriority(p.value)}
                    style={priority === p.value ? { borderColor: p.color, color: p.color, background: p.color + '10' } : undefined}
                  >
                    <span className="qa-prio-glyph">{p.glyph}</span>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Assignee */}
            <div className="qa-prop" ref={assigneeRef}>
              <span className="qa-prop-label">Assignee</span>
              <div className="qa-prop-value">
                <button className="qa-assignee-btn" onClick={() => setAssigneeOpen(!assigneeOpen)}>
                  {assignee ? (
                    <>
                      <span className="qa-assignee-avatar" style={{ background: assigneeColor(assignee) }}>
                        {initials(assignee)}
                      </span>
                      <span>{assignee}</span>
                    </>
                  ) : (
                    <span className="qa-assignee-placeholder">Unassigned</span>
                  )}
                  <ChevronDownIcon size={14} />
                </button>
                {assigneeOpen && (
                  <div className="qa-dropdown">
                    <button
                      className={'qa-dropdown-item' + (!assignee ? ' active' : '')}
                      onClick={() => { setAssignee(''); setAssigneeOpen(false); }}
                    >
                      Unassigned
                    </button>
                    {ASSIGNEES.map((a) => (
                      <button
                        key={a}
                        className={'qa-dropdown-item' + (assignee === a ? ' active' : '')}
                        onClick={() => { setAssignee(a); setAssigneeOpen(false); }}
                      >
                        <span className="qa-dropdown-avatar" style={{ background: assigneeColor(a) }}>
                          {initials(a)}
                        </span>
                        {a}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Due date */}
            <div className="qa-prop">
              <span className="qa-prop-label">Due date</span>
              <div className="qa-prop-value">
                <div className="qa-date-wrap">
                  <CalendarIcon size={14} className="qa-date-icon" />
                  <input
                    type="date"
                    className="qa-date-input"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Labels */}
          <div className="qa-labels-section">
            <span className="qa-prop-label">Labels</span>
            <div className="qa-labels-list">
              {labels.map((label, i) => (
                <span className="qa-label-pill" key={i}>
                  {label}
                  <button
                    className="qa-label-remove"
                    onClick={() => setLabels((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    ×
                  </button>
                </span>
              ))}
              <div className="qa-label-input-wrap">
                <input
                  className="qa-label-input"
                  value={labelInput}
                  onChange={(e) => setLabelInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); addLabel(labelInput); }
                  }}
                  placeholder="Add label..."
                />
              </div>
            </div>
            <div className="qa-label-presets">
              {LABEL_PRESETS.filter((l) => !labels.includes(l)).slice(0, 5).map((l) => (
                <button className="qa-label-preset" key={l} onClick={() => addLabel(l)}>
                  + {l}
                </button>
              ))}
            </div>
          </div>

          {error && <div className="qa-error">{error}</div>}
        </div>

        {/* Footer */}
        <div className="qa-footer">
          <span className="qa-shortcut">⌘ Enter to save</span>
          <div className="qa-footer-actions">
            <button className="qa-cancel" onClick={onClose}>Cancel</button>
            <button className="qa-submit" onClick={handleSubmit} disabled={saving || !title.trim()}>
              {saving ? (
                <span className="qa-submit-loading">
                  <span className="qa-spinner" />
                  Creating...
                </span>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Create Task
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
