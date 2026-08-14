import { useState } from 'react';
import { Task, Column, Assignee } from '../types';
import { XIcon, CalendarIcon } from './Icons';
import { parseLabels } from '../utils/task';

interface TaskDetailProps {
  task: Task;
  columns: Column[];
  onClose: () => void;
  onSave: (id: number, patch: Partial<Task>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

const ASSIGNEES: Assignee[] = ['Admin', 'Designer', 'Developer', 'QA', 'Security'];
const LABEL_PRESETS = ['Deployment', 'Design', 'Testing', 'Audit', 'Updated', 'Research', 'Backend'];

export function TaskDetail({ task, columns, onClose, onSave, onDelete }: TaskDetailProps) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [priority, setPriority] = useState(task.priority);
  const [assignee, setAssignee] = useState<string>(task.assignee || '');
  const [dueDate, setDueDate] = useState(task.due_date || '');
  const [labels, setLabels] = useState<string[]>(parseLabels(task.labels));
  const [labelInput, setLabelInput] = useState('');
  const [saving, setSaving] = useState(false);

  const addLabel = (label: string) => {
    const trimmed = label.trim();
    if (trimmed && !labels.includes(trimmed)) setLabels((prev) => [...prev, trimmed]);
    setLabelInput('');
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(task.id, {
      title,
      description,
      priority,
      assignee: assignee || null,
      due_date: dueDate || null,
      labels,
    });
    setSaving(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Task details</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <XIcon size={18} />
          </button>
        </div>

        <div className="modal-body">
          <label className="detail-field">
            <span className="detail-label">Title</span>
            <input
              className="detail-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>

          <label className="detail-field">
            <span className="detail-label">Description</span>
            <textarea
              className="detail-textarea"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description..."
            />
          </label>

          <div className="detail-grid">
            <div className="detail-field">
              <span className="detail-label">Status</span>
              <div className="detail-status">
                <span className={`priority-dot priority-${priority.toLowerCase()}`} />
                <span className="detail-status-name">{task.column_name || '—'}</span>
              </div>
            </div>

            <div className="detail-field">
              <span className="detail-label">Priority</span>
              <select
                className="detail-select"
                value={priority}
                onChange={(e) => setPriority(e.target.value as Task['priority'])}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>

            <div className="detail-field">
              <span className="detail-label">Assignee</span>
              <select
                className="detail-select"
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
              >
                <option value="">Unassigned</option>
                {ASSIGNEES.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>

            <div className="detail-field">
              <span className="detail-label">Due date</span>
              <div className="detail-date-wrap">
                <CalendarIcon size={14} className="detail-date-icon" />
                <input
                  type="date"
                  className="detail-date-input"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>

            <div className="detail-field">
              <span className="detail-label">Move to</span>
              <select
                className="detail-select"
                value={task.column_id}
                onChange={async (e) => {
                  const colId = Number(e.target.value);
                  if (colId !== task.column_id) await onSave(task.id, { column_id: colId });
                }}
              >
                {columns.map((col) => (
                  <option key={col.id} value={col.id}>{col.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="detail-field">
            <span className="detail-label">Labels</span>
            <div className="detail-labels">
              {labels.map((label, i) => (
                <span className="task-label" key={i}>
                  {label}
                  <button
                    className="label-remove"
                    onClick={() => setLabels((prev) => prev.filter((_, idx) => idx !== i))}
                    aria-label={`Remove label ${label}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="label-input-row">
              <input
                className="detail-input"
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addLabel(labelInput);
                  }
                }}
                placeholder="Add a label and press Enter"
              />
            </div>
            <div className="label-presets">
              {LABEL_PRESETS.filter((l) => !labels.includes(l)).map((l) => (
                <button className="task-label label-add" key={l} onClick={() => addLabel(l)}>
                  + {l}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-delete" onClick={() => onDelete(task.id)} disabled={saving}>
            Delete
          </button>
          <div className="modal-footer-right">
            <button className="btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
