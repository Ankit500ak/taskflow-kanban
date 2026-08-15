import { Task, Column } from '../types';

interface TaskStatsProps {
  tasks: Task[];
  columns: Column[];
}

export function TaskStats({ tasks, columns }: TaskStatsProps) {
  const totalTasks = tasks.length;
  const highPriority = tasks.filter((t) => t.priority === 'High').length;
  const dueSoon = tasks.filter((t) => {
    if (!t.due_date) return false;
    const diff = new Date(t.due_date).getTime() - Date.now();
    return diff > 0 && diff < 7 * 24 * 60 * 60 * 1000;
  }).length;
  const completed = tasks.filter((t) => {
    const col = columns.find((c) => c.id === t.column_id);
    return col?.name === 'Completed';
  }).length;

  return (
    <div className="task-stats-bar">
      <div className="task-stat">
        <div className="task-stat-icon task-stat-total">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
        </div>
        <div className="task-stat-info">
          <span className="task-stat-value">{totalTasks}</span>
          <span className="task-stat-label">Total</span>
        </div>
      </div>
      <div className="task-stat">
        <div className="task-stat-icon task-stat-high">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
        </div>
        <div className="task-stat-info">
          <span className="task-stat-value">{highPriority}</span>
          <span className="task-stat-label">High Priority</span>
        </div>
      </div>
      <div className="task-stat">
        <div className="task-stat-icon task-stat-due">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
        </div>
        <div className="task-stat-info">
          <span className="task-stat-value">{dueSoon}</span>
          <span className="task-stat-label">Due Soon</span>
        </div>
      </div>
      <div className="task-stat">
        <div className="task-stat-icon task-stat-completed">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
        </div>
        <div className="task-stat-info">
          <span className="task-stat-value">{completed}</span>
          <span className="task-stat-label">Completed</span>
        </div>
      </div>
    </div>
  );
}
