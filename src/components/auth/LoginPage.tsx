import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { Eye, EyeOff, Loader2, WifiOff } from 'lucide-react';

const INPUT_CLASS =
  'w-full px-3 py-2 text-sm bg-surface-secondary text-text-primary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent placeholder:text-text-tertiary';

/** Sign in to the PTA QMS server. Accounts are added by a QMS admin (no self sign-up). */
export function LoginPage() {
  const { t } = useTranslation();
  const { login, workOffline } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: unknown) {
      // The server's own message, e.g. "Invalid email or password" or the
      // "Too many failed logins, try again in N minutes" rate-limit message.
      const message = err instanceof Error ? err.message : '';
      setError(message && message !== 'Failed to fetch' ? message : t('auth.loginError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-secondary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-gradient-start to-gradient-end mb-4 shadow-lg">
            <span className="text-xl font-bold text-white tracking-tight">PTA</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">{t('app.name')}</h1>
          <p className="text-sm text-text-secondary mt-1">{t('auth.login')}</p>
        </div>

        <div className="bg-surface rounded-xl border border-border shadow-lg p-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="auth-email" className="block text-sm font-medium text-text-secondary mb-1.5">
                {t('auth.email')}
              </label>
              <input
                id="auth-email"
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={INPUT_CLASS}
                placeholder="you@company.com"
              />
            </div>

            <div>
              <label htmlFor="auth-password" className="block text-sm font-medium text-text-secondary mb-1.5">
                {t('auth.password')}
              </label>
              <div className="relative">
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${INPUT_CLASS} pr-10`}
                  placeholder="********"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div role="alert" className="text-sm text-danger-text bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-gradient-start to-gradient-end rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {t('auth.login')}
            </button>
          </form>

          <p className="mt-4 text-xs text-text-tertiary text-center">
            No account? Ask your QMS admin to add you.
          </p>
        </div>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={workOffline}
            className="inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary hover:underline"
          >
            <WifiOff className="w-3.5 h-3.5" />
            Work offline (this PC only - nothing is shared or saved to the server)
          </button>
        </div>
      </div>
    </div>
  );
}
