'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import Stars from '../../components/ui/Stars';
import ThemeToggle from '../../components/ui/ThemeToggle';

const inputClass =
  'border border-border bg-surface rounded-[var(--radius-ctrl)] px-3 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-[var(--primary)] dark:focus:border-[var(--accent)]';

export default function LoginPage() {
  const router = useRouter();
  const { usuario, loading, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Si ya hay sesión activa, no tiene sentido mostrar el login.
  useEffect(() => {
    if (!loading && usuario) router.replace('/');
  }, [loading, usuario, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      router.replace('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-bg flex items-center justify-center px-4">
      <Stars />
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      <div className="relative z-10 w-full max-w-[380px] animate-fadeIn">
        <div className="flex flex-col items-center mb-8 text-center">
          <div
            className="flex items-center justify-center w-14 h-14 rounded-[14px] mb-4 shadow-card"
            style={{ background: 'linear-gradient(175deg, var(--primary-strong), var(--sidebar-grad-end))' }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M15.6 3.6a8.4 8.4 0 1 0 5.2 13.5A9.4 9.4 0 0 1 15.6 3.6Z" fill="var(--accent)" />
              <path d="M19.6 3.2l.6 1.7 1.7.6-1.7.6-.6 1.7-.6-1.7-1.7-.6 1.7-.6.6-1.7Z" fill="var(--accent)" />
            </svg>
          </div>
          <h1 className="font-display text-4xl font-semibold m-0 mb-2 bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] dark:from-[var(--accent)] dark:to-white bg-clip-text text-transparent">
            Satella
          </h1>
          <p className="text-sm text-text-secondary m-0">Inicia sesión para entrar al panel interno</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-surface border border-border rounded-card shadow-card p-6 flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-[10px] uppercase tracking-widest text-text-muted font-bold">
              Correo
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              autoFocus
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-[10px] uppercase tracking-widest text-text-muted font-bold">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </div>

          {error && (
            <p role="alert" className="m-0 text-xs text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-1 border-0 bg-[var(--primary)] text-[var(--on-primary)] rounded-[9px] px-4 py-[11px] font-semibold cursor-pointer hover:brightness-95 text-sm disabled:opacity-60 disabled:cursor-wait"
          >
            {submitting ? 'Entrando…' : 'Iniciar sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}
