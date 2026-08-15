import { useState, useEffect, useCallback } from 'react';
import { getToken, setToken, clearToken } from '../api';

interface User {
  id: number;
  name: string;
  email: string;
}

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);

  const loadUser = useCallback(() => {
    const storedToken = getToken();
    const storedUser = localStorage.getItem('taskflow_user');

    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setTokenState(storedToken);
        setUser(parsedUser);
      } catch (e) {
        // Invalid JSON - reset storage and clear user
        localStorage.removeItem('taskflow_user');
        setTokenState(null);
        setUser(null);
      }
    } else {
      setTokenState(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = useCallback((user: User, token: string) => {
    setTokenState(token);
    setUser(user);
    localStorage.setItem('taskflow_user', JSON.stringify(user));
    setToken(token);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    localStorage.removeItem('taskflow_user');
    setTokenState(null);
    setUser(null);
  }, []);

  return { user, token, login, logout };
}