import { useState } from 'react';
import { api, setToken } from '../api';

interface AuthProps {
  onLogin: (name: string) => void;
}

export function Auth({ onLogin }: AuthProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const switchMode = (m: 'signin' | 'signup') => {
    setMode(m);
    setError(null);
    setName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'signup' && !name.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = mode === 'signup'
        ? await api.register(name.trim(), email.trim(), password)
        : await api.login(email.trim(), password);

      setToken(res.token);
      onLogin(res.user.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.guestLogin();
      setToken(res.token);
      onLogin(res.user.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Guest login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="auth-brand">
          <div className="auth-logo">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L22 20H2L12 2Z" fill="white" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="auth-brand-name">Pyramid</span>
        </div>

        <div className="auth-card">
          <h1 className="auth-title">
            {mode === 'signin' ? "Welcome back" : "Create your account"}
          </h1>
          <p className="auth-subtitle">
            {mode === 'signin'
              ? 'Enter your credentials to access your workspace.'
              : 'Fill in the details below to get started.'}
          </p>

          <div className="auth-tabs">
            <button
              className={'auth-tab' + (mode === 'signin' ? ' active' : '')}
              onClick={() => switchMode('signin')}
            >
              Sign In
            </button>
            <button
              className={'auth-tab' + (mode === 'signup' ? ' active' : '')}
              onClick={() => switchMode('signup')}
            >
              Sign Up
            </button>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <div className="auth-field">
                <label className="auth-label" htmlFor="name">Name</label>
                <input
                  id="name"
                  type="text"
                  className="auth-input"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}

            <div className="auth-field">
              <label className="auth-label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className="auth-input"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="auth-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {mode === 'signup' && (
              <div className="auth-field">
                <label className="auth-label" htmlFor="confirmPassword">Confirm Password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  className="auth-input"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            )}

            {error && <div className="auth-error">{error}</div>}

            <button type="submit" className="auth-btn auth-btn-primary" disabled={loading}>
              {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="auth-divider">
            <span>or</span>
          </div>

          <button className="auth-btn auth-btn-guest" onClick={handleGuest} disabled={loading}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Continue as Guest
          </button>
        </div>

        <p className="auth-footer">
          By continuing, you agree to our{' '}
          <a href="#" className="auth-link">Terms of Service</a> and{' '}
          <a href="#" className="auth-link">Privacy Policy</a>.
        </p>
      </div>

      <div className="auth-right">
        <div className="auth-illustration">
          <div className="auth-illust-card auth-illust-1">
            <div className="auth-illust-icon" style={{ background: '#6366f1' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            </div>
            <div>
              <div className="auth-illust-title">Kanban Board</div>
              <div className="auth-illust-desc">Drag & drop tasks</div>
            </div>
          </div>
          <div className="auth-illust-card auth-illust-2">
            <div className="auth-illust-icon" style={{ background: '#22c55e' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <div>
              <div className="auth-illust-title">Task Tracking</div>
              <div className="auth-illust-desc">Stay organized</div>
            </div>
          </div>
          <div className="auth-illust-card auth-illust-3">
            <div className="auth-illust-icon" style={{ background: '#f59e0b' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <div>
              <div className="auth-illust-title">Team Collaboration</div>
              <div className="auth-illust-desc">Work together</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
