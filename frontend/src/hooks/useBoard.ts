import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import { Board, Task, ColumnStats } from '../types';

const DEFAULT_BOARD_ID = 1;

const getPreferredBoardId = async (): Promise<number> => {
  try {
    const boards = await api.getBoards();
    if (boards.length > 0) {
      return boards[0].id;
    }
  } catch (error) {
    console.warn('Falling back to default board ID because board list lookup failed:', error);
  }
  return DEFAULT_BOARD_ID;
};

export function useBoard() {
  const [board, setBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBoard = useCallback(async () => {
    try {
      setLoading(true);
      const boardId = await getPreferredBoardId();
      const data = await api.getBoard(boardId);
      setBoard(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load board');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  return { board, loading, error, refetch: fetchBoard };
}

export function useTasks(priority?: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const boardId = await getPreferredBoardId();
      const data = await api.getTasks(boardId, priority);
      setTasks(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [priority]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return { tasks, loading, error, refetch: fetchTasks };
}

export function useBoardStats() {
  const [stats, setStats] = useState<ColumnStats[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const boardId = await getPreferredBoardId();
      const data = await api.getBoardStats(boardId);
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, refetch: fetchStats };
}
