import { useState, useCallback, useEffect } from 'react';
import { Column as ColumnType, Task, Project } from '../types';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { TaskHeader } from './TaskHeader';
import { Column } from './Column';
import { ListView } from './ListView';
import { ProjectsListView } from './ProjectsListView';
import { ProjectTaskView } from './ProjectTaskView';
import { TaskDetailPage } from './TaskDetailPage';
import { SettingsPage } from './SettingsPage';
import { QuickAdd } from './QuickAdd';
import { useBoard, useTasks } from '../hooks/useBoard';
import { useDashboardConfig } from '../hooks/useDashboardConfig';
import { api } from '../api';
import { parseLabels } from '../utils/task';

interface TaskBoardProps {
  userName: string;
  onLogout: () => void;
}

export function TaskBoard({ userName, onLogout }: TaskBoardProps) {
  const { board, loading: boardLoading, error: boardError } = useBoard();
  const { tasks, loading: tasksLoading, refetch: refetchTasks } = useTasks();
  const { viewMode, setViewMode, fields, toggleField } = useDashboardConfig(userName);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activePage, setActivePage] = useState<'tasks' | 'projects' | 'settings'>('tasks');
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createColumn, setCreateColumn] = useState<ColumnType | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('taskflow_theme') as 'light' | 'dark') || 'light';
  });

  const handleThemeChange = useCallback((t: 'light' | 'dark') => {
    setTheme(t);
    localStorage.setItem('taskflow_theme', t);
    document.documentElement.setAttribute('data-theme', t);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, []);

  const showError = useCallback((msg: string) => {
    setGlobalError(msg);
    setTimeout(() => setGlobalError(null), 5000);
  }, []);

  const fetchProjects = useCallback(async () => {
    setProjectsLoading(true);
    try {
      const data = await api.getProjects();
      setProjects(data);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setProjectsLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    if (activePage === 'projects') fetchProjects();
  }, [activePage, fetchProjects]);

  const handleMove = useCallback(async (taskId: number, columnId: number) => {
    try {
      await api.moveTask(taskId, columnId);
      await refetchTasks();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to move task');
    }
  }, [refetchTasks, showError]);

  const handleSave = useCallback(async (id: number, patch: Partial<Task>) => {
    try {
      const { title, description, priority, assignee, due_date, labels } = patch;
      await api.updateTask(id, {
        title: title ?? '',
        description: description ?? undefined,
        priority,
        assignee: assignee ?? undefined,
        due_date: due_date ?? undefined,
        labels: labels ? labels as string[] : undefined,
      });
      await refetchTasks();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to update task');
    }
  }, [refetchTasks, showError]);

  const handleDelete = useCallback(async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await api.deleteTask(id);
      await refetchTasks();
      setSelectedTask(null);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to delete task');
    }
  }, [refetchTasks, showError]);

  const handleCreate = useCallback(async (input: {
    column_id: number;
    title: string;
    description?: string;
    priority: 'Low' | 'Medium' | 'High';
    assignee?: string;
    due_date?: string;
    labels?: string[];
  }) => {
    try {
      await api.createTask(input);
      setCreateOpen(false);
      setCreateColumn(null);
      await refetchTasks();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to create task');
    }
  }, [refetchTasks, showError]);

  const handleDuplicate = useCallback(async (id: number) => {
    const source = tasks.find((t) => t.id === id);
    if (!source) return;
    try {
      await api.createTask({
        column_id: source.column_id,
        title: `${source.title} (copy)`,
        description: source.description || undefined,
        priority: source.priority,
        assignee: source.assignee || undefined,
        due_date: source.due_date || undefined,
        labels: Array.isArray(source.labels) ? source.labels : undefined,
      });
      await refetchTasks();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to duplicate task');
    }
  }, [tasks, refetchTasks, showError]);

  if (activePage !== 'projects' && (boardLoading || tasksLoading)) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <span className="loading-text">Loading your board...</span>
      </div>
    );
  }

  if (activePage !== 'projects' && boardError) {
    return (
      <div className="error">
        <div className="error-icon">!</div>
        <h2 className="error-message">{boardError}</h2>
      </div>
    );
  }

  if (activePage !== 'projects' && !board) {
    return (
      <div className="error">
        <div className="error-icon">?</div>
        <h2 className="error-message">Board not found</h2>
      </div>
    );
  }

  const q = search.trim().toLowerCase();
  const filteredTasks = q
    ? tasks.filter((task) => {
        const labels = parseLabels(task.labels).join(' ').toLowerCase();
        return (
          task.title.toLowerCase().includes(q) ||
          (task.description || '').toLowerCase().includes(q) ||
          (task.assignee || '').toLowerCase().includes(q) ||
          labels.includes(q) ||
          String(task.id) === q
        );
      })
    : tasks;

  const getTasksForColumn = (columnId: number) =>
    filteredTasks.filter((task) => task.column_id === columnId);

  return (
    <div className="app-shell">
        <Sidebar collapsed={sidebarCollapsed} userName={userName} theme={theme} onThemeChange={handleThemeChange} activePage={activePage} onNavChange={setActivePage} onSettingsOpen={() => setActivePage('settings')} />

      <div className="app-main">
        <TopBar onToggleSidebar={() => setSidebarCollapsed((v) => !v)} />

        {globalError && (
          <div className="error-toast" role="alert">
            {globalError}
          </div>
        )}

        {selectedTask ? (
          <TaskDetailPage
            task={selectedTask}
            columns={board!.columns}
            onBack={() => setSelectedTask(null)}
            onSave={handleSave}
            onDelete={handleDelete}
            userName={userName}
          />
        ) : selectedProject ? (
          <ProjectTaskView
            project={selectedProject}
            onBack={() => setSelectedProject(null)}
            userName={userName}
          />
        ) : (
          <main className="workspace">
            {activePage === 'settings' ? (
              <SettingsPage
                userName={userName}
                theme={theme}
                onThemeChange={handleThemeChange}
                onBack={() => setActivePage('tasks')}
              />
            ) : activePage === 'projects' ? (
              projectsLoading ? (
                <div className="loading">
                  <div className="loading-spinner"></div>
                  <span className="loading-text">Loading projects...</span>
                </div>
              ) : (
                <ProjectsListView projects={projects} onRefresh={fetchProjects} onOpen={setSelectedProject} userName={userName} />
              )
            ) : (
              <>
                <TaskHeader
                  search={search}
                  onSearchChange={setSearch}
                  onOpenCreate={() => {
                    setCreateColumn(null);
                    setCreateOpen(true);
                  }}
                  onLogout={onLogout}
                  userName={userName}
                  viewMode={viewMode}
                  onViewModeChange={setViewMode}
                  fields={fields}
                  onToggleField={toggleField}
                />

                {viewMode === 'list' ? (
                  <ListView
                    tasks={filteredTasks}
                    columns={board!.columns}
                    fields={fields}
                    userName={userName}
                    onOpen={setSelectedTask}
                    onMove={handleMove}
                    onSave={handleSave}
                    onDelete={handleDelete}
                    onDuplicate={handleDuplicate}
                    onQuickAdd={(columnId) => {
                      const col = board!.columns.find((c) => c.id === columnId) ?? null;
                      setCreateColumn(col);
                      setCreateOpen(true);
                    }}
                  />
                ) : (
                  <div className="columns-container">
                    {board!.columns.map((column) => (
                      <Column
                        key={column.id}
                        column={column}
                        tasks={getTasksForColumn(column.id)}
                        fields={fields}
                        onOpen={setSelectedTask}
                        onMove={handleMove}
                        onQuickAdd={(columnId) => {
                          const col = board!.columns.find((c) => c.id === columnId) ?? null;
                          setCreateColumn(col);
                          setCreateOpen(true);
                        }}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </main>
        )}
      </div>

      {createOpen && (
        <QuickAdd
          column={createColumn}
          columns={board!.columns}
          onClose={() => setCreateOpen(false)}
          onSubmit={handleCreate}
        />
      )}
    </div>
  );
}
