import { useState } from 'react';
import { Column as ColumnType, Task, FieldVisibility } from '../types';
import { TaskCard } from './TaskCard';
import { PlusIcon, DotsIcon } from './Icons';

interface ColumnProps {
  column: ColumnType;
  tasks: Task[];
  fields: FieldVisibility;
  onOpen: (task: Task) => void;
  onMove: (taskId: number, columnId: number) => void;
  onQuickAdd: (columnId: number) => void;
}

const COLUMN_COLORS: Record<string, string> = {
  'Backlog': '#6b7280',
  'To Do': '#3b82f6',
  'Doing': '#f59e0b',
  'Review': '#8b5cf6',
  'Completed': '#22c55e',
  'On Hold': '#ef4444',
};

export function Column({ column, tasks, fields, onOpen, onMove, onQuickAdd }: ColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const color = COLUMN_COLORS[column.name] || '#6b7280';

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      if (data.taskId && data.columnId !== column.id) {
        onMove(data.taskId, column.id);
      }
    } catch {
      // ignore malformed drag payloads
    }
  };

  return (
    <div
      className={`column ${isDragOver ? 'drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="column-header">
        <div className="column-title-group">
          <span className="column-dot" style={{ background: color }} />
          <h3 className="column-title">{column.name}</h3>
          <span className="column-count">{tasks.length}</span>
        </div>
        <div className="column-actions">
          <button
            className="icon-btn column-add-btn"
            onClick={() => onQuickAdd(column.id)}
            aria-label={`Add task to ${column.name}`}
          >
            <PlusIcon size={15} />
          </button>
          <button className="icon-btn" aria-label={`More options for ${column.name}`}>
            <DotsIcon size={15} />
          </button>
        </div>
      </div>

      <div className="column-tasks">
        {tasks.length === 0 ? (
          <div className="column-empty">
            <div className="column-empty-icon" style={{ borderColor: color + '40' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
            </div>
            <p>No tasks yet</p>
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              fields={fields}
              onOpen={onOpen}
            />
          ))
        )}
      </div>

      <button className="column-add" onClick={() => onQuickAdd(column.id)}>
        <PlusIcon size={14} />
        <span>Add Task</span>
      </button>
    </div>
  );
}
