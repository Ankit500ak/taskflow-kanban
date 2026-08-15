import { useState } from 'react';
import { TaskBoard } from './components/TaskBoard';
import { Auth } from './components/Auth';
import { clearToken } from './api';
import './App.css';

function App() {
  const [user, setUser] = useState<string | null>(() => {
    const stored = localStorage.getItem('taskflow_user');
    if (!stored) return null;
    try {
      const parsed = JSON.parse(stored);
      return typeof parsed === 'object' && parsed !== null ? parsed.name : stored;
    } catch {
      return stored;
    }
  });

  const handleLogin = (name: string) => {
    localStorage.setItem('taskflow_user', name);
    setUser(name);
  };

  const handleLogout = () => {
    clearToken();
    localStorage.removeItem('taskflow_user');
    setUser(null);
  };

  if (!user) {
    return <Auth onLogin={handleLogin} />;
  }

  return <TaskBoard userName={user} onLogout={handleLogout} />;
}

export default App;