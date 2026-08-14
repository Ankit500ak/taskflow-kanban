import { useState } from 'react';
import { Column as ColumnType, Task, FieldVisibility } from '../types';
import { TaskCard } from './TaskCard';
import { PlusIcon, DotsIcon, GridIcon } from './Icons';

interface ColumnProps {
  column: ColumnType;
  tasks: Task[];
  fields: FieldVisibility;
  onOpen: (task: Task) => void;
  onMove: (taskId: number, columnId: number) => void;
  onQuickAdd: (columnId: number) => void;
}

export function Column({ column, tasks, fields, onOpen, onMove, onQuickAdd }: ColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false);

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
          <GridIcon size={14} className="column-grip" />
          <h3 className="column-title">{column.name}</h3>
          <span className="column-count">{tasks.length}</span>
        </div>
        <div className="column-actions">
          <button
            className="icon-btn"
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
            <p>No tasks</p>
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
