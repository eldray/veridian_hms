// src/pages/Login.tsx — COMPLETE FILE
import { useState, FormEvent } from 'react';
import type { LucideIcon } from 'lucide-react';
import { useAuthStore, LoginError } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../store/toastStore';
import { forgotPassword } from '../api/auth';
import VeridianLogo from '../components/VeridianLogo';
import {
  Lock, User, Eye, EyeOff,
  Users, Stethoscope, Shield, Activity, Pill, Receipt, LogIn, CheckCircle,
  FlaskConical, ScanLine, BriefcaseBusiness, Calculator,
  HeartPulse, Archive, ArrowLeft, KeyRound,
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
  { Icon: Users,       label: 'Patient Records', desc: 'Full lifecycle management' },
  { Icon: Stethoscope, label: 'Clinical',        desc: 'Labs, vitals, entries'     },
  { Icon: Pill,        label: 'Pharmacy',        desc: 'Prescribe & dispense'      },
  { Icon: Receipt,     label: 'Billing',         desc: 'NHIS & cash payments'      },
];

// ── FormHeader ───────────────────────────────────────────────────────────────
function FormHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
        <VeridianLogo variant="emblem" size={48} />
      </div>
      <p style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-.01em' }}>
        {title}
      </p>
      <p style={{ margin: 0, fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.55 }}>
        {subtitle}
      </p>
    </div>
  );
}

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [resetUsername, setResetUsername] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
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
      success(
        'Ask an administrator',
        response?.message || 'Passwords are reset by a system administrator at this facility.',
        8000,
      );
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Unable to send reset request';
      toastError(err?.response?.status ? 'Request failed' : 'Connection error', msg, 5000);
    } finally {
      setResetLoading(false);
    }
  };

  const backToLogin = () => {
    setMode('login');
    setResetSent(false);
    setResetUsername('');
  };

  const fillDemo = (acc: DemoAccount) => {
    setUsername(acc.username);
    setPassword(acc.password);
    setMode('login');
    info('Demo account loaded', `${acc.role} credentials ready`, 2000);
  };

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .login-card { animation: fadeUp .45s ease both; }
        .login-brand { color-scheme: dark; }
        .login-brand .brand-title { color: #C8DCF0; margin: 0; }
        .login-brand .brand-sub { color: #5A8099; margin: 0; }
        .login-brand .brand-copyright { color: #1E3A50; }
        .login-brand .feature-tile { padding: 14px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.06); background: rgba(255,255,255,0.04); transition: background .2s; }
        .login-brand .feature-tile:hover { background: rgba(255,255,255,0.07); }
        .field-group { display: flex; flex-direction: column; gap: 6px; }
        .field-label { display: block; font-size: 11px; font-weight: 600; color: var(--text-secondary); letter-spacing: .02em; text-transform: uppercase; }
        .field-input { display: block; width: 100%; box-sizing: border-box; padding: 10px 12px 10px 38px; border: 1px solid var(--border-color); border-radius: 8px; font-size: 13px; color: var(--text-primary); background: var(--bg-main); outline: none; font-family: inherit; transition: border-color .15s, box-shadow .15s; }
        .field-input:focus { border-color: var(--icon-cyan-text); box-shadow: 0 0 0 3px color-mix(in srgb, var(--icon-cyan-text) 12%, transparent); }
        .field-input::placeholder { color: var(--text-tertiary); }
        .field-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); width: 14px; height: 14px; color: var(--text-tertiary); pointer-events: none; }
        .field-toggle { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; padding: 2px; color: var(--text-tertiary); display: flex; align-items: center; border-radius: 4px; }
        .field-toggle:hover { color: var(--text-secondary); }
        .field-toggle:focus-visible { outline: 2px solid var(--icon-cyan-text); outline-offset: 2px; }
        .btn-primary { width: 100%; padding: 11px 0; border-radius: 8px; border: none; background: var(--icon-cyan-text); color: var(--text-on-accent, #fff); font-size: 13px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: opacity .15s, background .15s; letter-spacing: .01em; }
        .btn-primary:hover:not(:disabled) { opacity: .9; }
        .btn-primary:focus-visible { outline: 2px solid var(--icon-cyan-text); outline-offset: 2px; }
        .btn-primary:disabled { opacity: .6; cursor: not-allowed; background: var(--text-tertiary); }
        .link-btn { background: none; border: none; cursor: pointer; font-size: 12px; color: var(--icon-cyan-text); font-weight: 500; padding: 2px; border-radius: 4px; }
        .link-btn:hover { text-decoration: underline; }
        .link-btn:focus-visible { outline: 2px solid var(--icon-cyan-text); outline-offset: 2px; }
        .link-btn--back { display: inline-flex; align-items: center; gap: 6px; }
        .demo-btn { display: flex; align-items: center; gap: 8px; width: 100%; min-width: 0; min-height: 36px; padding: 6px 10px; text-align: left; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-main); cursor: pointer; transition: background .15s, border-color .15s; }
        .demo-btn:hover:not(:disabled) { background: var(--icon-cyan-bg); border-color: var(--icon-cyan-text); }
        .demo-btn:focus-visible { outline: 2px solid var(--icon-cyan-text); outline-offset: 2px; }
        .demo-btn:disabled { opacity: .55; cursor: not-allowed; }
        .demo-btn .demo-meta { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 1px; }
        .demo-btn .demo-meta p { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin: 0; }
        .demo-icon { width: 26px; height: 26px; border-radius: 6px; flex-shrink: 0; background: var(--bg-card); border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: center; }
        .demo-group-label { margin: 0 0 6px 2px; font-size: 9px; font-weight: 700; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: .08em; }
        .demo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
        .demo-group:not(:last-child) { margin-bottom: 12px; }

        /* ── Left brand panel: distribute vertically so footer pins to bottom ── */
        .brand-inner {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 24px;
          flex: 1;
          min-height: 0;
        }
        .brand-middle { display: flex; flex-direction: column; gap: 24px; }

        /* ── Right panel rhythm ── */
        .form-panel-scroll {
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 36px 32px;
          box-sizing: border-box;
          min-height: 100%;
        }
        .form-stack { display: flex; flex-direction: column; gap: 18px; }
        .form-section { margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--border-color); }
        .form-section--plain { margin-top: 20px; padding-top: 0; border-top: none; }

        @media (max-width: 900px) {
          .login-card { grid-template-columns: 1fr !important; max-width: 440px !important; max-height: none !important; }
          .login-brand { display: none !important; }
          .form-panel { overflow-y: auto !important; max-height: none !important; }
          .form-panel-scroll { padding: 28px 24px !important; justify-content: flex-start !important; }
        }
      `}</style>

      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', position: 'relative', background: 'var(--bg-main)' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'url("https://images.unsplash.com/photo-1516549655169-df83a0774514?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80")', backgroundSize: 'cover', backgroundPosition: 'center 30%', opacity: 0.14 }} />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(8,14,26,0.65)' }} />

        <div
          className="login-card"
          style={{
            position: 'relative',
            zIndex: 10,
            width: '100%',
            maxWidth: 1080,
            display: 'grid',
            gridTemplateColumns: '1fr 460px',
            borderRadius: 16,
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)',
            maxHeight: '90vh',
          }}
        >
          {/* ── Branding panel ── */}
          <div
            className="login-brand"
            style={{
              background: 'rgba(8,16,30,0.92)',
              backdropFilter: 'blur(20px)',
              padding: '36px 32px',
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto',
              minHeight: 0,
            }}
          >
            <div className="brand-inner">
              {/* Top: logo — pushed down slightly, reduced size */}
              <div style={{ display: 'flex', justifyContent: 'flex-start', paddingTop: 12 }}>
                <VeridianLogo variant="wordmark" size={96} dark />
              </div>

              {/* Middle: headline + subtitle + feature tiles */}
              <div className="brand-middle">
                <div>
                  <p className="brand-title" style={{ fontSize: 23, fontWeight: 600, lineHeight: 1.35, letterSpacing: '-.02em', marginBottom: 8 }}>
                    Comprehensive care,<br />one platform.
                  </p>
                  <p className="brand-sub" style={{ fontSize: 13, lineHeight: 1.7, maxWidth: 300 }}>
                    Patient records, clinical workflows, pharmacy, billing, and reporting — built for modern Ghanaian healthcare.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {FEATURES.map((f) => (
                    <div key={f.label} className="feature-tile">
                      <f.Icon style={{ width: 16, height: 16, color: '#5BAEC8', marginBottom: 8, display: 'block' }} />
                      <p style={{ margin: '0 0 2px', fontSize: 12, fontWeight: 600, color: '#A8C4D8', lineHeight: 1.4 }}>{f.label}</p>
                      <p style={{ margin: 0, fontSize: 11, color: '#3D607A', lineHeight: 1.4 }}>{f.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom: copyright pinned via space-between */}
              <p className="brand-copyright" style={{ margin: 0, paddingTop: 16, fontSize: 11 }}>
                © {new Date().getFullYear()} Veridian Health Systems
              </p>
            </div>
          </div>

          {/* ── Form panel ── */}
          <div
            className="form-panel"
            style={{ background: 'var(--bg-card)', overflowY: 'auto', minHeight: 0 }}
          >
            <div className="form-panel-scroll">
              {mode === 'login' && (
                <>
                  <FormHeader title="Sign in" subtitle="Enter your credentials to continue" />

                  <form onSubmit={handleSubmit} className="form-stack">
                    <div className="field-group">
                      <label htmlFor="username" className="field-label">Username</label>
                      <div style={{ position: 'relative' }}>
                        <User className="field-icon" />
                        <input id="username" type="text" value={username} required autoFocus autoComplete="username" onChange={(e) => setUsername(e.target.value)} placeholder="Enter username" disabled={loading} className="field-input" />
                      </div>
                    </div>

                    <div className="field-group" style={{ marginTop: -2 }}>
                      <label htmlFor="password" className="field-label">Password</label>
                      <div style={{ position: 'relative' }}>
                        <Lock className="field-icon" />
                        <input id="password" type={showPassword ? 'text' : 'password'} value={password} required autoComplete="current-password" onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" disabled={loading} className="field-input" style={{ paddingRight: 38 }} />
                        <button type="button" onClick={() => setShowPassword((v) => !v)} disabled={loading} aria-label={showPassword ? 'Hide password' : 'Show password'} className="field-toggle">
                          {showPassword ? <EyeOff style={{ width: 14, height: 14 }} /> : <Eye style={{ width: 14, height: 14 }} />}
                        </button>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 2 }}>
                        <button type="button" onClick={() => setMode('forgot')} disabled={loading} className="link-btn">Forgot password?</button>
                      </div>
                    </div>

                    <button type="submit" disabled={loading} className="btn-primary" style={{ marginTop: 4 }}>
                      {loading ? (
                        <><div style={{ width: 13, height: 13, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'var(--text-on-accent, #fff)', animation: 'spin .7s linear infinite' }} />Signing in…</>
                      ) : (
                        <><LogIn style={{ width: 14, height: 14 }} />Sign in</>
                      )}
                    </button>
                  </form>

                  {DEMO_ENABLED && TOTAL_DEMO_ACCOUNTS > 0 && (
                    <div className="form-section">
                      <p style={{ margin: '0 0 10px', fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '.08em', textAlign: 'center' }}>
                        Quick demo access · {TOTAL_DEMO_ACCOUNTS} accounts
                      </p>
                      <div style={{ maxHeight: 260, overflowY: 'auto', paddingRight: 4, scrollbarWidth: 'thin' }}>
                        {DEMO_GROUPS.map((group) => (
                          <div key={group.label} className="demo-group">
                            <p className="demo-group-label">{group.label}</p>
                            <div className="demo-grid">
                              {group.accounts.map((acc) => (
                                <button key={acc.username} type="button" onClick={() => fillDemo(acc)} disabled={loading} className="demo-btn">
                                  <div className="demo-icon"><acc.Icon style={{ width: 12, height: 12, color: acc.color }} /></div>
                                  <div className="demo-meta">
                                    <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>{acc.role}</p>
                                    <p style={{ fontSize: 10, color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>{acc.username}</p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="form-section--plain" style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--bg-main)', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <CheckCircle style={{ width: 14, height: 14, color: 'var(--icon-green-text)', flexShrink: 0, marginTop: 1 }} />
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.55 }}>Secure &amp; HIPAA-compliant. Unauthorised access is prohibited and logged.</p>
                  </div>
                </>
              )}

              {mode === 'forgot' && (
                <>
                  <FormHeader
                    title="Reset your password"
                    subtitle={resetSent ? 'Ask a system administrator to reset it for you' : 'Enter your username to be told how a reset is done here'}
                  />

                  {resetSent ? (
                    <div style={{ padding: '14px 16px', borderRadius: 8, border: '1px solid var(--border-color)', background: 'var(--icon-cyan-bg)' }}>
                      <p style={{ margin: 0, fontSize: 12, color: 'var(--icon-cyan-text)', lineHeight: 1.6 }}>
                        This facility runs without an email service, so passwords are reset by a system administrator. Ask one to open <strong>Staff management</strong> for <strong>{resetUsername}</strong>, set a new password and hand it to you in person. Signing in with it closes every other session of that account.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleForgotSubmit} className="form-stack">
                      <div className="field-group">
                        <label htmlFor="resetUsername" className="field-label">Username</label>
                        <div style={{ position: 'relative' }}>
                          <User className="field-icon" />
                          <input id="resetUsername" type="text" value={resetUsername} required autoFocus autoComplete="off" onChange={(e) => setResetUsername(e.target.value)} placeholder="Enter your username" disabled={resetLoading} className="field-input" />
                        </div>
                      </div>
                      <button type="submit" disabled={resetLoading} className="btn-primary">
                        {resetLoading ? (
                          <><div style={{ width: 13, height: 13, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'var(--text-on-accent, #fff)', animation: 'spin .7s linear infinite' }} />Sending…</>
                        ) : (
                          <><KeyRound style={{ width: 14, height: 14 }} />Request reset</>
                        )}
                      </button>
                    </form>
                  )}

                  <div className="form-section--plain" style={{ display: 'flex', justifyContent: 'center' }}>
                    <button type="button" onClick={backToLogin} className="link-btn link-btn--back">
                      <ArrowLeft style={{ width: 13, height: 13 }} />Back to sign in
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