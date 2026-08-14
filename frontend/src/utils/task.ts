const ASSIGNEE_COLORS: Record<string, string> = {
  Admin: '#6366f1',
  Designer: '#ec4899',
  Developer: '#10b981',
  QA: '#f59e0b',
  Security: '#ef4444',
};

export function assigneeColor(name?: string | null): string {
  if (!name) return '#9ca3af';
  return ASSIGNEE_COLORS[name] || '#9ca3af';
}

export function parseLabels(labels?: string[] | string | null): string[] {
  if (!labels) return [];
  if (Array.isArray(labels)) return labels;
  try {
    const parsed = JSON.parse(labels);
    return Array.isArray(parsed) ? parsed : [String(labels)];
  } catch {
    return [String(labels)];
  }
}

export function initials(name?: string | null): string {
  if (!name) return 'U';
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function formatDueDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function dueStatus(dateStr?: string | null): 'overdue' | 'soon' | 'normal' {
  if (!dateStr) return 'normal';
  const due = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = due.getTime() - today.getTime();
  const days = Math.ceil(diff / 86400000);
  if (days < 0) return 'overdue';
  if (days <= 2) return 'soon';
  return 'normal';
}