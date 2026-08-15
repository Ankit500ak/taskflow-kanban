import { Task, FieldVisibility } from '../types';
import { DotsIcon, CalendarIcon } from './Icons';
import { assigneeColor, parseLabels, initials, formatDueDate, dueStatus } from '../utils/task';

interface TaskCardProps {
  task: Task;
  onOpen: (task: Task) => void;
  fields: FieldVisibility;
}

const PRIORITY_COLORS: Record<string, string> = {
  High: 'priority-high',
  Medium: 'priority-medium',
  Low: 'priority-low',
};

const LABEL_COLORS = [
  { bg: '#dbeafe', text: '#1e40af' },
  { bg: '#dcfce7', text: '#166534' },
  { bg: '#fef3c7', text: '#92400e' },
  { bg: '#f3e8ff', text: '#6b21a8' },
  { bg: '#ffe4e6', text: '#9f1239' },
  { bg: '#e0f2fe', text: '#075985' },
  { bg: '#fce7f3', text: '#9d174d' },
  { bg: '#f0fdf4', text: '#14532d' },
];

function getLabelColor(label: string) {
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = label.charCodeAt(i) + ((hash << 5) - hash);
  }
  return LABEL_COLORS[Math.abs(hash) % LABEL_COLORS.length];
}

export function TaskCard({ task, onOpen, fields }: TaskCardProps) {
  const labels = parseLabels(task.labels);
  const due = formatDueDate(task.due_date);
  const dueState = dueStatus(task.due_date);
  const collaborators = task.collaborators?.length ? task.collaborators : task.assignee ? [task.assignee] : [];

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ taskId: task.id, columnId: task.column_id }));
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      className={`task-card task-card-prio-${task.priority.toLowerCase()}`}
      draggable
      onDragStart={handleDragStart}
      onClick={() => onOpen(task)}
    >
      {fields.labels && labels.length > 0 && (
        <div className="task-labels">
          {labels.slice(0, 3).map((label, i) => {
            const color = getLabelColor(label);
            return (
              <span className="task-label" key={i} style={{ background: color.bg, color: color.text }}>
                {label}
              </span>
            );
          })}
          {labels.length > 3 && <span className="task-label-more">+{labels.length - 3}</span>}
        </div>
      )}

      <div className="task-card-header">
        <h4 className="task-title">{task.title}</h4>
        <button className="icon-btn task-card-menu" aria-label={`More options for ${task.title}`}>
          <DotsIcon size={16} />
        </button>
      </div>

      {fields.priority && (
        <div className={`task-priority ${PRIORITY_COLORS[task.priority] || ''}`}>
          <span className="task-priority-dot" />
          {task.priority}
        </div>
      )}

      <div className="task-card-footer">
        {(fields.members || fields.collaborators) && (task.assignee || collaborators.length > 0) && (
          <div className="task-members-group">
            {fields.members && task.assignee && (
              <div className="task-assignee" title={task.assignee}>
                <span className="task-avatar" style={{ background: assigneeColor(task.assignee) }}>
                  {initials(task.assignee)}
                </span>
              </div>
            )}
            {fields.collaborators && collaborators.length > 0 && (
              <div className="task-collab" title="Collaborators">
                {collaborators.slice(0, 3).map((name, i) => (
                  <span
                    key={i}
                    className="task-collab-avatar"
                    style={{ background: assigneeColor(name) }}
                  >
                    {initials(name)}
                  </span>
                ))}
                {collaborators.length > 3 && (
                  <span className="task-collab-more">+{collaborators.length - 3}</span>
                )}
              </div>
            )}
          </div>
        )}

        <div className="task-card-meta-right">
          {fields.reporter && task.assignee && (
            <span className="task-reporter" title={`Reporter: ${task.reporter || task.assignee}`}>
              R: {task.reporter || task.assignee}
            </span>
          )}

          {fields.dueDate && due && (
            <span className={`task-due due-${dueState}`}>
              <CalendarIcon size={12} />
              {due}
            </span>
          )}

          {fields.status && task.column_name && (
            <span className="task-status-pill">{task.column_name}</span>
          )}
        </div>
      </div>
    </div>
  );
}
