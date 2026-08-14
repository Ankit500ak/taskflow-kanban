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
      className="task-card"
      draggable
      onDragStart={handleDragStart}
      onClick={() => onOpen(task)}
    >
      <div className="task-card-header">
        <h4 className="task-title">{task.title}</h4>
        <button className="icon-btn task-card-menu" aria-label={`More options for ${task.title}`}>
          <DotsIcon size={16} />
        </button>
      </div>

      {fields.priority && (
        <div className={`task-priority ${PRIORITY_COLORS[task.priority] || ''}`}>
          {task.priority}
        </div>
      )}

      {(fields.members || fields.collaborators || fields.dueDate || fields.reporter || fields.status) && (
        <div className="task-meta">
          {fields.members && task.assignee && (
            <div className="task-assignee" title={task.assignee}>
              <span className="task-avatar" style={{ background: assigneeColor(task.assignee) }}>
                {initials(task.assignee)}
              </span>
              <span className="task-assignee-name">{task.assignee}</span>
            </div>
          )}

          {fields.reporter && task.assignee && (
            <span className="task-reporter" title={`Reporter: ${task.reporter || task.assignee}`}>
              R: {task.reporter || task.assignee}
            </span>
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
      )}

      {fields.labels && labels.length > 0 && (
        <div className="task-labels">
          {labels.map((label, i) => (
            <span className="task-label" key={i}>
              {label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
