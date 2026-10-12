import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { CircleAlert, Eye, EyeOff, FilePenLine, Lock, LogIn, Mail, ShieldCheck } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { InputField } from '../../components/ui/InputField';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import { useAuth } from '../../hooks/useAuth';
import { DEFAULT_ADMIN } from '../../config/constants';

/** Admin sign-in page at /login. */
export default function LoginPage() {
  const { isAuthenticated, login, usingDefaultPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) return <Navigate to={from} replace />;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const errors: typeof fieldErrors = {};
    if (!email.trim()) errors.email = 'Enter your email';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = 'Enter a valid email address';
    if (!password) errors.password = 'Enter your password';
    setFieldErrors(errors);
    setError('');
    if (Object.keys(errors).length) return;

    setLoading(true);
    const result = await login(email, password, remember);
    setLoading(false);
    if (result.ok) {
      navigate(from, { replace: true });
    } else {
      setError(result.error);
      setPassword('');
    }
  };

  return (
    <div className="bg-blobs flex min-h-screen">
      {/* Brand panel (desktop) */}
      <aside className="relative hidden w-[44%] max-w-xl overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-accent-700 p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" aria-hidden />
        <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-accent-400/30 blur-3xl" aria-hidden />

        <div className="relative flex items-center gap-3 text-xl font-bold">
          <span className="rounded-xl bg-white/15 p-2.5 ring-1 ring-white/25 backdrop-blur">
            <FilePenLine className="h-6 w-6" aria-hidden />
          </span>
          QuotePro
        </div>

        <div className="relative space-y-6">
          <h2 className="text-4xl font-bold leading-tight tracking-tight">
            Professional quotations,
            <br />
            ready in minutes.
          </h2>
          <ul className="space-y-3 text-brand-100">
            <li className="flex items-center gap-3"><ShieldCheck size={20} aria-hidden /> VAT 18% and SSCL calculated automatically</li>
            <li className="flex items-center gap-3"><ShieldCheck size={20} aria-hidden /> Amounts in LKR, with the total in words</li>
            <li className="flex items-center gap-3"><ShieldCheck size={20} aria-hidden /> Print or save as PDF in one click</li>
          </ul>
        </div>

        <p className="relative text-sm text-brand-200">© {new Date().getFullYear()} QuotePro · Made for Sri Lankan businesses</p>
      </aside>

      {/* Sign-in form */}
      <main className="relative flex flex-1 items-center justify-center px-4 py-12 sm:px-8">
        <div className="absolute right-4 top-4 sm:right-8 sm:top-6">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 text-xl font-bold text-slate-900 lg:hidden dark:text-white">
            <span className="rounded-xl bg-gradient-to-br from-brand-600 to-accent-600 p-2 shadow-lg shadow-brand-600/25">
              <FilePenLine className="h-5 w-5 text-white" aria-hidden />
            </span>
            QuotePro
          </div>

          <div className="glass-strong rounded-3xl p-6 sm:p-8">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Admin sign in</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-zinc-400">Enter your email and password to continue.</p>

            {error && (
              <div role="alert" className="mt-5 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                <CircleAlert size={18} className="mt-px shrink-0" aria-hidden />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-5">
              <InputField
                label="Email"
                type="email"
                autoComplete="username"
                autoFocus
                icon={<Mail size={16} />}
                placeholder="admin@company.lk"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={fieldErrors.email}
              />

              <div className="relative">
                <InputField
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  icon={<Lock size={16} />}
                  placeholder="••••••••"
                  className="pr-11"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  error={fieldErrors.password}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className="absolute right-2 top-[31px] rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>

              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-600 dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-brand-600"
                />
                Keep me signed in on this device
              </label>

              <Button type="submit" size="lg" className="w-full" loading={loading} leftIcon={<LogIn size={18} />}>
                {loading ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>

            {usingDefaultPassword && (
              <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                <p className="font-semibold">First time? Use the default login:</p>
                <p className="mt-1 font-mono">
                  {DEFAULT_ADMIN.email} / {DEFAULT_ADMIN.password}
                </p>
                <p className="mt-1">Change it in Settings → Security after you sign in. This note disappears once you do.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
