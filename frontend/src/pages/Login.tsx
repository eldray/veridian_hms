// src/pages/Login.tsx — COMPLETE FILE (Your Layout, Polished)
import { useState, useId, FormEvent } from 'react';
import type { LucideIcon } from 'lucide-react';
import { useAuthStore, LoginError } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../store/toastStore';
import { forgotPassword, completePasswordReset } from '../api/auth';
import VeridianLogo from '../components/VeridianLogo';
import {
  Lock, User, Eye, EyeOff,
  Users, Stethoscope, Shield, Activity, Pill, Receipt, LogIn, CheckCircle,
  FlaskConical, ScanLine, BriefcaseBusiness, Calculator,
  HeartPulse, Archive, ArrowLeft, KeyRound, ShieldCheck, Info,
} from 'lucide-react';

// ── Feature flag ─────────────────────────────────────────────────────────────
const DEMO_ENABLED =
  import.meta.env.VITE_ENABLE_DEMO_ACCOUNTS === 'true' ||
  import.meta.env.MODE !== 'production';

// ── Demo accounts (grouped) ──────────────────────────────────────────────────
type DemoAccount = {
  username: string;
  password: string;
  role: string;
  Icon: LucideIcon;
  color: string;
};

type DemoGroup = {
  label: string;
  accounts: DemoAccount[];
};

const DEMO_GROUPS: DemoGroup[] = [
  {
    label: 'Admin',
    accounts: [
      { username: 'superadmin', password: 'superadmin123', role: 'Super Admin', Icon: Shield,           color: 'var(--icon-red-text)'  },
      { username: 'admin',      password: 'admin123',      role: 'Admin',       Icon: BriefcaseBusiness, color: 'var(--icon-cyan-text)' },
      { username: 'hr1',        password: 'hr123',         role: 'HR Officer',  Icon: Users,             color: 'var(--icon-blue-text)' },
    ],
  },
  {
    label: 'Clinical',
    accounts: [
      { username: 'doctor1',  password: 'doctor123',  role: 'Doctor',  Icon: Stethoscope, color: 'var(--icon-green-text)'  },
      { username: 'nurse1',   password: 'nurse123',   role: 'Nurse',   Icon: Activity,    color: 'var(--icon-yellow-text)' },
      { username: 'midwife1', password: 'midwife123', role: 'Midwife', Icon: HeartPulse,  color: 'var(--icon-pink-text)'   },
    ],
  },
  {
    label: 'Ancillary',
    accounts: [
      { username: 'lab1',         password: 'lab123',    role: 'Lab Tech',    Icon: FlaskConical, color: 'var(--icon-yellow-text)' },
      { username: 'sonographer1', password: 'scan123',   role: 'Sonographer', Icon: ScanLine,     color: 'var(--icon-cyan-text)'   },
      { username: 'pharma1',      password: 'pharma123', role: 'Pharmacist',  Icon: Pill,         color: 'var(--icon-purple-text)' },
    ],
  },
  {
    label: 'Finance & Records',
    accounts: [
      { username: 'accounts1', password: 'accounts123', role: 'Accounts', Icon: Calculator, color: 'var(--icon-green-text)'  },
      { username: 'records1',  password: 'records123',  role: 'Records',  Icon: Archive,    color: 'var(--icon-orange-text)' },
    ],
  },
];

const TOTAL_DEMO_ACCOUNTS = DEMO_GROUPS.reduce((n, g) => n + g.accounts.length, 0);

// ── Feature tiles ────────────────────────────────────────────────────────────
const FEATURES = [
  { Icon: Users,        label: 'Patient care',       desc: 'Records & appointments' },
  { Icon: Stethoscope,  label: 'Clinical care',      desc: 'Consultations & vitals' },
  { Icon: FlaskConical, label: 'Diagnostics',        desc: 'Laboratory & imaging' },
  { Icon: Pill,         label: 'Pharmacy & billing', desc: 'Medicines & payments' },
];

// ── FormHeader ───────────────────────────────────────────────────────────────
function FormHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
        <VeridianLogo variant="emblem" size={48} />
      </div>
      <h1 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-.01em' }}>
        {title}
      </h1>
      <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-tertiary)', lineHeight: 1.55 }}>
        {subtitle}
      </p>
    </div>
  );
}

export default function Login() {
  const uid = useId();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [resetUsername, setResetUsername] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetCode, setResetCode] = useState('');
  const [newResetPassword, setNewResetPassword] = useState('');
  const [confirmResetPassword, setConfirmResetPassword] = useState('');
  const [resetComplete, setResetComplete] = useState(false);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const { success, error: toastError, info } = useToast();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toastError('Invalid input', 'Please enter both username and password');
      return;
    }
    setLoading(true);
    try {
      const ok = await login(username, password);
      if (ok) {
        success('Welcome back!', `Hello, ${username}!`, 3000);
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      const code = err instanceof LoginError ? err.code : 'UNKNOWN';
      const msg = err instanceof LoginError ? err.message : 'Unable to sign in';
      switch (code) {
        case 'INVALID_CREDENTIALS': toastError('Access denied', msg, 5000); break;
        case 'FORBIDDEN':           toastError('Account disabled', msg, 5000); break;
        case 'RATE_LIMITED':        toastError('Too many attempts', msg, 5000); break;
        case 'NETWORK':             toastError('Connection error', msg, 5000); break;
        default:                    toastError('Sign-in failed', msg, 5000);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!resetUsername.trim()) {
      toastError('Invalid input', 'Enter your username');
      return;
    }
    setResetLoading(true);
    try {
      const response = (await forgotPassword(resetUsername.trim())) as { message?: string } | undefined;
      setResetSent(true);
      success('Request submitted', response?.message || 'Your request has been sent for administrator approval.', 6000);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Unable to send reset request';
      toastError(err?.response?.status ? 'Request failed' : 'Connection error', msg, 5000);
    } finally {
      setResetLoading(false);
    }
  };

  const handleCompleteReset = async (e: FormEvent) => {
    e.preventDefault();
    if (!resetCode.trim() || newResetPassword.length < 12) {
      toastError('Check your details', 'Enter the one-time code and a password of at least 12 characters.');
      return;
    }
    if (newResetPassword !== confirmResetPassword) {
      toastError('Passwords do not match', 'Confirm the new password correctly.');
      return;
    }
    setResetLoading(true);
    try {
      await completePasswordReset(resetUsername.trim(), resetCode.trim(), newResetPassword);
      setResetComplete(true);
      success('Password updated', 'You can now sign in using your new password.');
    } catch (err: any) {
      toastError('Reset failed', err?.response?.data?.message || err?.response?.data?.error || err?.message || 'The code may be invalid or expired.');
    } finally {
      setResetLoading(false);
    }
  };

  const backToLogin = () => {
    setMode('login');
    setResetSent(false);
    setResetComplete(false);
    setResetCode('');
    setNewResetPassword('');
    setConfirmResetPassword('');
    setResetUsername('');
  };

  const fillDemo = (acc: DemoAccount) => {
    setUsername(acc.username);
    setPassword(acc.password);
    setMode('login');
    info?.('Demo account loaded', `${acc.role} credentials ready`, 2000);
  };

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        
        .login-wrapper {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          position: relative;
          background-color: var(--bg-main);
        }
        
        /* Exact background from your design */
        .login-bg {
          position: absolute; inset: 0;
          background:
            radial-gradient(ellipse at 18% 22%, rgba(35, 145, 157, 0.28), transparent 42%),
            radial-gradient(ellipse at 82% 78%, rgba(63, 116, 164, 0.24), transparent 45%),
            linear-gradient(135deg, #071827 0%, #102f45 52%, #0b2538 100%);
          opacity: 1;
          z-index: 0;
        }
        .login-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(5, 18, 31, 0.20), rgba(5, 18, 31, 0.48));
          z-index: 1;
        }

        .login-card {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 1060px;
          display: grid;
          grid-template-columns: 1fr 460px;
          border-radius: 20px;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.08);
          box-shadow: 0 28px 72px rgba(0,0,0,0.34), 0 0 0 1px rgba(255,255,255,0.06);
          max-height: 92vh;
          animation: fadeUp 0.4s ease both;
        }

        /* ── Brand Panel ── */
        .login-brand {
          color-scheme: dark;
          background: radial-gradient(ellipse at 10% 12%, rgba(37, 112, 132, 0.22), transparent 48%), linear-gradient(155deg, #102d43 0%, #0b2032 100%);
          backdrop-filter: blur(20px);
          padding: 40px;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          min-height: 0;
        }
        .brand-inner {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 24px;
          flex: 1;
          min-height: 0;
        }
        .brand-middle {
          display: flex;
          flex-direction: column;
          gap: 28px;
          margin-top: 40px;
        }
        .brand-title {
          color: #FFFFFF;
          font-size: 26px;
          font-weight: 600;
          line-height: 1.35;
          letter-spacing: -0.02em;
          margin: 0 0 12px 0;
        }
        .brand-sub {
          color: #A9C2D2;
          font-size: 13.5px;
          line-height: 1.6;
          max-width: 320px;
          margin: 0;
        }
        
        /* Feature Tiles - styled to match your dark aesthetic */
        .feature-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .feature-tile {
          padding: 16px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.03);
          transition: background 0.2s, border-color 0.2s;
        }
        .feature-tile:hover {
          background: rgba(255,255,255,0.06);
          border-color: rgba(255,255,255,0.15);
        }
        .feature-icon {
          color: #78C9C0;
          margin-bottom: 12px;
          display: block;
        }
        .feature-label {
          color: #E2EDF4;
          font-size: 13px;
          font-weight: 600;
          margin: 0 0 4px 0;
        }
        .feature-desc {
          color: #9BB3C2;
          font-size: 11.5px;
          margin: 0;
        }

        .brand-copyright {
          color: #7895A8;
          font-size: 11px;
          margin: 0;
          padding-top: 20px;
        }

        /* ── Form Panel ── */
        .form-panel {
          background: var(--bg-card);
          overflow-y: auto;
          min-height: 0;
        }
        .form-panel-scroll {
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 40px;
          box-sizing: border-box;
          min-height: 100%;
        }
        .form-stack { display: flex; flex-direction: column; gap: 16px; }
        .form-section { margin-top: 24px; padding-top: 24px; border-top: 1px solid var(--border-color); }
        .form-section--plain { margin-top: 20px; padding-top: 0; border-top: none; }

        /* ── Fields ── */
        .field-group { display: flex; flex-direction: column; gap: 6px; }
        .field-label {
          font-size: 11px; font-weight: 600;
          color: var(--text-secondary);
          letter-spacing: 0.02em;
          text-transform: uppercase;
        }
        .field-wrap { position: relative; }
        .field-input {
          display: block; width: 100%; box-sizing: border-box;
          min-height: 48px;
          padding: 11px 12px 11px 40px;
          border: 1px solid var(--border-color);
          border-radius: 10px;
          font-size: 14px;
          color: var(--text-primary);
          background: var(--bg-main);
          outline: none;
          font-family: inherit;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .field-input:focus {
          border-color: var(--icon-cyan-text);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--icon-cyan-text) 15%, transparent);
        }
        .field-input::placeholder { color: var(--text-tertiary); }
        .field-input:focus-visible, .field-toggle:focus-visible, .link-btn:focus-visible,
        .demo-btn:focus-visible, .btn-primary:focus-visible {
          outline: 2px solid var(--icon-cyan-text);
          outline-offset: 2px;
        }
        .field-icon {
          position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
          width: 14px; height: 14px; color: var(--text-tertiary); pointer-events: none;
        }
        .field-toggle {
          position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer;
          width: 28px; height: 28px;
          display: flex; align-items: center; justify-content: center;
          color: var(--text-tertiary); border-radius: 4px;
        }
        .field-toggle:hover { color: var(--text-secondary); background: var(--bg-main); }

        /* ── Buttons ── */
        .btn-primary {
          width: 100%; min-height: 48px;
          padding: 11px 0;
          border-radius: 10px;
          border: none;
          background: var(--icon-cyan-text);
          color: var(--text-on-accent, #fff);
          font-size: 13.5px; font-weight: 600;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: opacity 0.15s, transform 0.1s, box-shadow 0.15s;
          box-shadow: 0 4px 12px color-mix(in srgb, var(--icon-cyan-text) 25%, transparent);
        }
        .btn-primary:hover:not(:disabled) { opacity: 0.95; }
        .btn-primary:active:not(:disabled) { transform: translateY(1px); }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; background: var(--text-tertiary); box-shadow: none; }

        .link-btn {
          background: none; border: none; cursor: pointer;
          font-size: 12px; color: var(--icon-cyan-text); font-weight: 500;
          padding: 2px; border-radius: 4px;
        }
        .link-btn:hover { text-decoration: underline; }
        .link-btn--back { display: inline-flex; align-items: center; gap: 6px; }

        /* ── Demo Grid (Scrollable) ── */
        .demo-scroll {
          max-height: 220px;
          overflow-y: auto;
          padding-right: 8px;
          scrollbar-width: thin;
          -webkit-mask-image: linear-gradient(to bottom, #000 calc(100% - 20px), transparent 100%);
                  mask-image: linear-gradient(to bottom, #000 calc(100% - 20px), transparent 100%);
        }
        /* Custom scrollbar for webkit */
        .demo-scroll::-webkit-scrollbar { width: 4px; }
        .demo-scroll::-webkit-scrollbar-track { background: transparent; }
        .demo-scroll::-webkit-scrollbar-thumb { background: var(--border-color); border-radius: 4px; }
        .demo-scroll::-webkit-scrollbar-thumb:hover { background: var(--text-tertiary); }

        .demo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .demo-group:not(:last-child) { margin-bottom: 12px; }
        .demo-group-label {
          margin: 0 0 6px 2px;
          font-size: 10px; font-weight: 700;
          color: var(--text-tertiary);
          text-transform: uppercase; letter-spacing: 0.08em;
        }
        .demo-btn {
          display: flex; align-items: center; gap: 8px;
          width: 100%; min-width: 0; min-height: 38px;
          padding: 6px 10px; text-align: left;
          border-radius: 8px;
          border: 1px solid var(--border-color);
          background: var(--bg-main);
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s;
        }
        .demo-btn:hover:not(:disabled) {
          background: color-mix(in srgb, var(--icon-cyan-text) 6%, var(--bg-main));
          border-color: color-mix(in srgb, var(--icon-cyan-text) 40%, var(--border-color));
        }
        .demo-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .demo-btn .demo-meta { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 1px; }
        .demo-btn .demo-meta p { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin: 0; }
        .demo-icon {
          width: 26px; height: 26px; border-radius: 6px; flex-shrink: 0;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          display: flex; align-items: center; justify-content: center;
        }

        .info-strip {
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px solid var(--border-color);
          background: var(--bg-main);
          display: flex; align-items: flex-start; gap: 8px;
        }

        /* ── Responsive ── */
        @media (max-width: 900px) {
          .login-card { grid-template-columns: 1fr !important; max-width: 460px !important; max-height: none !important; }
          .login-brand { display: flex !important; padding: 20px 24px 16px !important; overflow: visible !important; }
          .brand-inner { gap: 0 !important; }
          .brand-middle, .brand-copyright { display: none !important; }
          .login-brand .brand-inner > div:first-child { display: flex; justify-content: center; }
          .form-panel { overflow-y: visible !important; max-height: none !important; }
          .form-panel-scroll { padding: 28px 24px 30px !important; justify-content: flex-start !important; }
        }
        @media (max-width: 420px) {
          .login-wrapper { padding: 12px !important; }
          .login-brand { padding: 18px 20px 12px !important; }
          .form-panel-scroll { padding: 24px 20px !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          .login-card { animation: none !important; }
          *, *::before, *::after { scroll-behavior: auto !important; transition-duration: 0.01ms !important; }
        }
      `}</style>

      <div className="login-wrapper">
        <div className="login-bg" />
        <div className="login-overlay" />

        <div className="login-card">
          {/* ── Branding Panel ── */}
          <div className="login-brand">
            <div className="brand-inner">
              
              {/* Top: Logo */}
              <div>
                <VeridianLogo variant="wordmark" size={110} dark />
              </div>

              {/* Middle: Headline & Features */}
              <div className="brand-middle">
                <div>
                  <h2 className="brand-title">
                    Comprehensive care,<br />one platform.
                  </h2>
                  <p className="brand-sub">
                    Patient records, clinical workflows, pharmacy, billing, and reporting — built for modern Ghanaian healthcare.
                  </p>
                </div>

                <div className="feature-grid">
                  {FEATURES.map((f) => (
                    <div key={f.label} className="feature-tile">
                      <f.Icon className="feature-icon" style={{ width: 18, height: 18 }} />
                      <p className="feature-label">{f.label}</p>
                      <p className="feature-desc">{f.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom: Copyright */}
              <p className="brand-copyright">
                © {new Date().getFullYear()} Veridian Health Systems
              </p>
            </div>
          </div>

          {/* ── Form Panel ── */}
          <div className="form-panel">
            <div className="form-panel-scroll">
              {mode === 'login' && (
                <>
                  <FormHeader title="Welcome back" subtitle="Staff portal · Sign in to access your hospital workspace" />

                  <form onSubmit={handleSubmit} className="form-stack" aria-busy={loading}>
                    <div className="field-group">
                      <label htmlFor={`${uid}-username`} className="field-label">Username</label>
                      <div className="field-wrap">
                        <User className="field-icon" aria-hidden="true" />
                        <input
                          id={`${uid}-username`}
                          type="text"
                          value={username}
                          required
                          autoFocus
                          autoComplete="username"
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="Enter username"
                          disabled={loading}
                          className="field-input"
                        />
                      </div>
                    </div>

                    <div className="field-group" style={{ marginTop: -2 }}>
                      <label htmlFor={`${uid}-password`} className="field-label">Password</label>
                      <div className="field-wrap">
                        <Lock className="field-icon" aria-hidden="true" />
                        <input
                          id={`${uid}-password`}
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          required
                          autoComplete="current-password"
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter password"
                          disabled={loading}
                          className="field-input"
                          style={{ paddingRight: 44 }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          disabled={loading}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          className="field-toggle"
                        >
                          {showPassword
                            ? <EyeOff style={{ width: 15, height: 15 }} aria-hidden="true" />
                            : <Eye style={{ width: 15, height: 15 }} aria-hidden="true" />}
                        </button>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                        <button type="button" onClick={() => setMode('forgot')} disabled={loading} className="link-btn">
                          Forgot password?
                        </button>
                      </div>
                    </div>

                    <button type="submit" disabled={loading} className="btn-primary" style={{ marginTop: 4 }}>
                      {loading ? (
                        <>
                          <span
                            style={{
                              width: 14, height: 14, borderRadius: '50%',
                              border: '2px solid rgba(255,255,255,0.3)',
                              borderTopColor: 'var(--text-on-accent, #fff)',
                              animation: 'spin .7s linear infinite',
                            }}
                            aria-hidden="true"
                          />
                          Signing in…
                        </>
                      ) : (
                        <>
                          <LogIn style={{ width: 16, height: 16 }} aria-hidden="true" />
                          Sign in
                        </>
                      )}
                    </button>
                  </form>

                  {DEMO_ENABLED && TOTAL_DEMO_ACCOUNTS > 0 && (
                    <div className="form-section">
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 10 }}>
                        <Info style={{ width: 13, height: 13, color: 'var(--text-tertiary)' }} aria-hidden="true" />
                        <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          Demo access · {TOTAL_DEMO_ACCOUNTS} accounts
                        </p>
                      </div>
                      <div className="demo-scroll">
                        {DEMO_GROUPS.map((group) => (
                          <div key={group.label} className="demo-group">
                            <h3 className="demo-group-label">{group.label}</h3>
                            <div className="demo-grid">
                              {group.accounts.map((acc) => (
                                <button
                                  key={acc.username}
                                  type="button"
                                  onClick={() => fillDemo(acc)}
                                  disabled={loading}
                                  className="demo-btn"
                                >
                                  <div className="demo-icon" aria-hidden="true">
                                    <acc.Icon style={{ width: 13, height: 13, color: acc.color }} />
                                  </div>
                                  <div className="demo-meta">
                                    <p style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-primary)' }}>{acc.role}</p>
                                    <p style={{ fontSize: 10, color: 'var(--text-tertiary)', fontFamily: 'ui-monospace, monospace' }}>{acc.username}</p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="form-section--plain info-strip">
                    <ShieldCheck style={{ width: 15, height: 15, color: 'var(--icon-green-text)', flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
                    <p style={{ margin: 0, fontSize: 11.5, color: 'var(--text-tertiary)', lineHeight: 1.55 }}>
                      Authorised staff access only. System activity is monitored and recorded.
                    </p>
                  </div>
                </>
              )}

              {mode === 'forgot' && (
                <>
                  <FormHeader
                    title="Reset your password"
                    subtitle={resetComplete ? 'Your password is ready to use' : resetSent ? 'Enter the one-time code provided by an administrator' : 'Enter your username to request administrator approval'}
                  />

                  {resetComplete ? (
                    <div role="status" className="info-strip">
                      <CheckCircle style={{ width: 18, height: 18, color: 'var(--icon-green-text)', flexShrink: 0 }} aria-hidden="true" />
                      <p style={{ margin: 0, fontSize: 12.5, color: 'var(--text-primary)', lineHeight: 1.6 }}>Your password has been changed. Return to sign in with your new password.</p>
                    </div>
                  ) : resetSent ? (
                    <form onSubmit={handleCompleteReset} className="form-stack" aria-busy={resetLoading}>
                      <div className="info-strip"><Info style={{ width: 15, height: 15, flexShrink: 0 }} /><p style={{ margin: 0, fontSize: 12, lineHeight: 1.5 }}>An administrator must verify you and approve your request. Enter the one-time code they give you.</p></div>
                      <div className="field-group"><label className="field-label" htmlFor={`${uid}-code`}>One-time reset code</label><input id={`${uid}-code`} value={resetCode} onChange={e => setResetCode(e.target.value)} required autoComplete="one-time-code" className="field-input" placeholder="Enter code" /></div>
                      <div className="field-group"><label className="field-label" htmlFor={`${uid}-new-password`}>New password</label><input id={`${uid}-new-password`} type="password" value={newResetPassword} onChange={e => setNewResetPassword(e.target.value)} required minLength={12} autoComplete="new-password" className="field-input" placeholder="At least 12 characters" /></div>
                      <div className="field-group"><label className="field-label" htmlFor={`${uid}-confirm-password`}>Confirm new password</label><input id={`${uid}-confirm-password`} type="password" value={confirmResetPassword} onChange={e => setConfirmResetPassword(e.target.value)} required minLength={12} autoComplete="new-password" className="field-input" placeholder="Enter password again" /></div>
                      <button type="submit" disabled={resetLoading} className="btn-primary">{resetLoading ? 'Updating password…' : 'Set new password'}</button>
                    </form>
                  ) : (
                    <form onSubmit={handleForgotSubmit} className="form-stack" aria-busy={resetLoading}>
                      <div className="field-group">
                        <label htmlFor={`${uid}-reset`} className="field-label">Username</label>
                        <div className="field-wrap">
                          <User className="field-icon" aria-hidden="true" />
                          <input
                            id={`${uid}-reset`}
                            type="text"
                            value={resetUsername}
                            required
                            autoFocus
                            autoComplete="off"
                            onChange={(e) => setResetUsername(e.target.value)}
                            placeholder="Enter your username"
                            disabled={resetLoading}
                            className="field-input"
                          />
                        </div>
                      </div>
                      <button type="submit" disabled={resetLoading} className="btn-primary">
                        {resetLoading ? (
                          <>
                            <span
                              style={{
                                width: 14, height: 14, borderRadius: '50%',
                                border: '2px solid rgba(255,255,255,0.3)',
                                borderTopColor: 'var(--text-on-accent, #fff)',
                                animation: 'spin .7s linear infinite',
                              }}
                              aria-hidden="true"
                            />
                            Sending…
                          </>
                        ) : (
                          <>
                            <KeyRound style={{ width: 16, height: 16 }} aria-hidden="true" />
                            Request reset
                          </>
                        )}
                      </button>
                    </form>
                  )}

                  <div className="form-section--plain" style={{ display: 'flex', justifyContent: 'center' }}>
                    <button type="button" onClick={backToLogin} className="link-btn link-btn--back">
                      <ArrowLeft style={{ width: 14, height: 14 }} aria-hidden="true" />
                      Back to sign in
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}