import { useState, useCallback } from 'react';
import { ViewMode, FieldVisibility, FieldKey, DEFAULT_FIELDS } from '../types';

const VIEW_KEY = 'taskflow_view';
const FIELDS_KEY = 'taskflow_fields';

function loadFields(user: string): FieldVisibility {
  try {
    const raw = localStorage.getItem(`${FIELDS_KEY}_${user}`);
    if (raw) return { ...DEFAULT_FIELDS, ...JSON.parse(raw) };
  } catch {
    // ignore malformed storage
  }
  return { ...DEFAULT_FIELDS };
}

function loadView(user: string): ViewMode {
  try {
    const v = localStorage.getItem(`${VIEW_KEY}_${user}`);
    if (v === 'list' || v === 'board') return v;
  } catch {
    // ignore
  }
  return 'board';
}

export function useDashboardConfig(user: string) {
  const [viewMode, setViewModeState] = useState<ViewMode>(() => loadView(user));
  const [fields, setFieldsState] = useState<FieldVisibility>(() => loadFields(user));

  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeState(mode);
    try {
      localStorage.setItem(`${VIEW_KEY}_${user}`, mode);
    } catch {
      // ignore
    }
  }, [user]);

  const toggleField = useCallback((key: FieldKey) => {
    setFieldsState((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem(`${FIELDS_KEY}_${user}`, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, [user]);

  return { viewMode, setViewMode, fields, toggleField };
}