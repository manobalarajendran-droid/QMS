import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { ArrowRight, Eye, EyeOff, KeyRound, Loader2, Lock, Mail, UserPlus, WifiOff } from 'lucide-react';
import { ShardBackground } from './ShardBackground';

type Side = 'login' | 'access';

/** Matches the .qlogin-grid opacity/blur transition in index.css. */
const SWAP_MS = 360;

const RIGHT_CLIP: Record<Side, string> = {
  login: 'polygon(47% 0, 100% 0, 100% 100%, 51.5% 100%)',
  access: 'polygon(0 0, 51.5% 0, 47% 100%, 0 100%)',
};

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Sign in to the PTA QMS server. Accounts are added by a QMS admin (no self sign-up),
 * so the reel's "create account" side explains how to get access instead.
 */
export function LoginPage() {
  const { t } = useTranslation();
  const { login, workOffline } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [side, setSide] = useState<Side>('login');
  const [fading, setFading] = useState(false);
  const swapTimer = useRef<number | undefined>(undefined);
  const emailRef = useRef<HTMLInputElement>(null);
  const accessTitleRef = useRef<HTMLHeadingElement>(null);
  const hasSwapped = useRef(false);

  useEffect(() => () => window.clearTimeout(swapTimer.current), []);

  // The clicked button unmounts on a swap, so move focus into the new side.
  useEffect(() => {
    if (!hasSwapped.current) return;
    if (side === 'login') emailRef.current?.focus();
    else accessTitleRef.current?.focus();
  }, [side]);

  const swapTo = (next: Side) => {
    if (next === side || fading) return;
    hasSwapped.current = true;
    if (prefersReducedMotion()) {
      setSide(next);
      return;
    }
    setFading(true);
    swapTimer.current = window.setTimeout(() => {
      setSide(next);
      setFading(false);
    }, SWAP_MS);
  };

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

  const loginForm = (
    <div className="qlogin-pane">
      <h1 className="qlogin-title">{t('auth.login')}</h1>
      <form onSubmit={handleSubmit}>
        <label htmlFor="auth-email" className="sr-only">{t('auth.email')}</label>
        <div className="qlogin-line">
          <Mail className="h-[18px] w-[18px] shrink-0 opacity-80" aria-hidden="true" />
          <input
            ref={emailRef}
            id="auth-email"
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('auth.email')}
          />
        </div>
        <label htmlFor="auth-password" className="sr-only">{t('auth.password')}</label>
        <div className="qlogin-line">
          <Lock className="h-[18px] w-[18px] shrink-0 opacity-80" aria-hidden="true" />
          <input
            id="auth-password"
            type={showPassword ? 'text' : 'password'}
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('auth.password')}
          />
          <button
            type="button"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-pressed={showPassword}
            onClick={() => setShowPassword(!showPassword)}
            className="grid opacity-60 transition-opacity hover:opacity-100"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        {error && (
          <div role="alert" className="mt-1 rounded-xl border border-red-400/30 bg-red-500/15 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        <button type="submit" disabled={loading} className="qlogin-pill">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {t('auth.login')}
        </button>
      </form>
      <p className="mt-5 text-center text-[13.5px] text-zinc-400">
        Don&apos;t have an account?{' '}
        <button type="button" className="qlogin-link" onClick={() => swapTo('access')}>Get access</button>
      </p>
      <button
        type="button"
        onClick={workOffline}
        className="mx-auto mt-3 inline-flex items-center gap-1.5 text-xs text-zinc-400 transition-colors hover:text-white hover:underline"
      >
        <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
        Work offline (this PC only - nothing is shared or saved to the server)
      </button>
    </div>
  );

  const helloPane = (
    <div className="qlogin-pane r">
      <h2 className="qlogin-big">Hello,<br />Friend!</h2>
      <p className="qlogin-lead">New to {t('app.name')}? Find out how to get your login.</p>
      <button type="button" className="qlogin-ghost inline-flex items-center gap-2" onClick={() => swapTo('access')}>
        Get access <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );

  const welcomePane = (
    <div className="qlogin-pane">
      <p className="qlogin-big">Welcome<br />Back!</p>
      <p className="qlogin-lead">Already have your work login? Sign in to see your QMS work.</p>
      <button type="button" className="qlogin-ghost inline-flex items-center gap-2" onClick={() => swapTo('login')}>
        Sign in <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );

  const accessPane = (
    <div className="qlogin-pane r">
      <h1 ref={accessTitleRef} tabIndex={-1} className="qlogin-title outline-none">Get access</h1>
      <div className="qlogin-line">
        <UserPlus className="h-[18px] w-[18px] shrink-0 opacity-80" aria-hidden="true" />
        <span className="text-sm leading-relaxed">Ask your QMS admin to add you.</span>
      </div>
      <div className="qlogin-line">
        <Mail className="h-[18px] w-[18px] shrink-0 opacity-80" aria-hidden="true" />
        <span className="text-sm leading-relaxed">Your work email is your login.</span>
      </div>
      <div className="qlogin-line">
        <KeyRound className="h-[18px] w-[18px] shrink-0 opacity-80" aria-hidden="true" />
        <span className="text-sm leading-relaxed">The admin gives you a first password.</span>
      </div>
      <button type="button" className="qlogin-pill" onClick={() => swapTo('login')}>I have my login</button>
      <p className="mt-5 text-center text-[13.5px] text-zinc-400">
        Already a member?{' '}
        <button type="button" className="qlogin-link" onClick={() => swapTo('login')}>Login</button>
      </p>
    </div>
  );

  const slant = side === 'login' ? { x1: '47%', x2: '51.5%' } : { x1: '51.5%', x2: '47%' };

  return (
    <div className="qlogin">
      <ShardBackground />
      <div className="qlogin-card animate-glass-rise">
        <div className="qlogin-right" style={{ clipPath: RIGHT_CLIP[side] }} aria-hidden="true" />
        <svg className="qlogin-slant" aria-hidden="true">
          <line x1={slant.x1} y1="0" x2={slant.x2} y2="100%" stroke="rgba(255,255,255,.55)" strokeWidth="1.5" />
        </svg>
        <div className={`qlogin-grid ${fading ? 'out' : ''}`}>
          {side === 'login' ? (
            <>
              {loginForm}
              {helloPane}
            </>
          ) : (
            <>
              {welcomePane}
              {accessPane}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
