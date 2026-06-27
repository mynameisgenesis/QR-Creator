import { FormEvent, useState } from 'react';
import { Eye, EyeOff, LockKeyhole, QrCode } from 'lucide-react';
import { supabaseEnv } from '../lib/env';
import { supabase } from '../lib/supabase';

export function AuthScreen() {
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!supabaseEnv.isConfigured || !supabase) {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <div className="auth-brand">
            <span className="brand-icon">
              <QrCode size={24} />
            </span>
            <div>
              <p className="section-label">Supabase setup required</p>
              <h1>Connect QR Inventory to Supabase</h1>
            </div>
          </div>
          <p className="auth-copy">
            Add these Vite environment variables, then restart the dev server so the browser client can load them.
          </p>
          <pre className="env-list">{supabaseEnv.isConfigured ? '' : supabaseEnv.missingKeys.join('\n')}</pre>
        </section>
      </main>
    );
  }

  const authClient = supabase;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    const credentials = {
      email: email.trim(),
      password,
    };

    const { error: authError } =
      mode === 'sign-in'
        ? await authClient.auth.signInWithPassword(credentials)
        : await authClient.auth.signUp(credentials);

    setIsSubmitting(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    if (mode === 'sign-up') {
      setMessage('Check your email to confirm the new account, then sign in.');
      setPassword('');
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-brand">
          <span className="brand-icon">
            <LockKeyhole size={23} />
          </span>
          <div>
            <p className="section-label">Protected workspace</p>
            <h1>{mode === 'sign-in' ? 'Sign in to QR Inventory' : 'Create your QR Inventory account'}</h1>
          </div>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Email</span>
            <input
              autoComplete="email"
              inputMode="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>
          <label className="field">
            <span>Password</span>
            <span className="password-field">
              <input
                autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                minLength={6}
                onChange={(event) => setPassword(event.target.value)}
                required
                type={isPasswordVisible ? 'text' : 'password'}
                value={password}
              />
              <button
                aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
                aria-pressed={isPasswordVisible}
                className="password-toggle"
                type="button"
                onClick={() => setIsPasswordVisible((current) => !current)}
              >
                {isPasswordVisible ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            </span>
          </label>

          {error && <p className="auth-error">{error}</p>}
          {message && <p className="auth-message">{message}</p>}

          <button className="primary-button" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Working...' : mode === 'sign-in' ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <button
          className="auth-switch"
          type="button"
          onClick={() => {
            setMode((current) => (current === 'sign-in' ? 'sign-up' : 'sign-in'));
            setError(null);
            setMessage(null);
          }}
        >
          {mode === 'sign-in' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
        </button>
      </section>
    </main>
  );
}
