// src/pages/Login.tsx
import { useState, useMemo, FormEvent } from 'react';
import { useAuthStore, LoginError } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../store/toastStore';
import { forgotPassword } from '../api/auth';
import {
  Hospital, Lock, User, Eye, EyeOff,
  Users, Stethoscope, Shield, Activity, Pill, Receipt, LogIn, CheckCircle,
  GraduationCap, FlaskConical, ScanLine, BriefcaseBusiness, Calculator,
  HeartPulse, Archive, ArrowLeft, Mail,
} from 'lucide-react';

// ── Feature flag ─────────────────────────────────────────────────────────────
const DEMO_ENABLED =
  import.meta.env.VITE_ENABLE_DEMO_ACCOUNTS === 'true' ||
  import.meta.env.MODE !== 'production';

// ── Demo accounts (grouped) ──────────────────────────────────────────────────
type DemoGroup = {
  label: string;
  accounts: Array<{
    username: string;
    password: string;
    role: string;
    Icon: any;
    color: string;
  }>;
};

const DEMO_GROUPS: DemoGroup[] = [
  {
    label: 'Admin',
    accounts: [
      { username: 'superadmin', password: 'superadmin123', role: 'Super Admin', Icon: Shield,           color: 'var(--icon-red-text)'    },
      { username: 'admin',      password: 'admin123',      role: 'Admin',       Icon: BriefcaseBusiness, color: 'var(--icon-cyan-text)'   },
      { username: 'hr1',        password: 'hr123',         role: 'HR Officer',  Icon: Users,             color: 'var(--icon-blue-text)'   },
    ],
  },
  {
    label: 'Clinical',
    accounts: [
      { username: 'doctor1',  password: 'doctor123',  role: 'Doctor',      Icon: Stethoscope, color: 'var(--icon-green-text)'  },
      { username: 'nurse1',   password: 'nurse123',   role: 'Nurse',       Icon: Activity,    color: 'var(--icon-yellow-text)' },
      { username: 'midwife1', password: 'midwife123', role: 'Midwife',     Icon: HeartPulse,  color: 'var(--icon-pink-text)'   },
    ],
  },
  {
    label: 'Ancillary',
    accounts: [
      { username: 'lab1',         password: 'lab123',   role: 'Lab Tech',    Icon: FlaskConical, color: 'var(--icon-yellow-text)' },
      { username: 'sonographer1', password: 'scan123',  role: 'Sonographer', Icon: ScanLine,     color: 'var(--icon-cyan-text)'   },
      { username: 'pharma1',      password: 'pharma123',role: 'Pharmacist',  Icon: Pill,         color: 'var(--icon-purple-text)' },
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

// ── Feature tiles ────────────────────────────────────────────────────────────
const FEATURES = [
  { Icon: Users,       label: 'Patient Records', desc: 'Full lifecycle management' },
  { Icon: Stethoscope, label: 'Clinical',        desc: 'Labs, vitals, entries'     },
  { Icon: Pill,        label: 'Pharmacy',        desc: 'Prescribe & dispense'      },
  { Icon: Receipt,     label: 'Billing',         desc: 'NHIS & cash payments'      },
];

export default function Login() {
  // ── Login form state ──────────────────────────────────────
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // ── Forgot-password state ─────────────────────────────────
  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [resetUsername, setResetUsername] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const { success, error: toastError, info } = useToast();

  // ── Login submit ──────────────────────────────────────────
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
        setTimeout(() => navigate('/dashboard', { replace: true }), 100);
      }
    } catch (err: any) {
      const code = err instanceof LoginError ? err.code : 'UNKNOWN';
      const msg =
        err instanceof LoginError
          ? err.message
          : err?.message || 'Unable to sign in';

      if (code === 'INVALID_CREDENTIALS') {
        toastError('Access denied', msg, 5000);
      } else if (code === 'FORBIDDEN') {
        toastError('Account disabled', msg, 5000);
      } else if (code === 'RATE_LIMITED') {
        toastError('Too many attempts', msg, 5000);
      } else if (code === 'NETWORK') {
        toastError('Connection error', msg, 5000);
      } else {
        toastError('Sign-in failed', msg, 5000);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot-password submit ────────────────────────────────
  const handleForgotSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!resetUsername.trim()) {
      toastError('Invalid input', 'Enter your username');
      return;
    }
    setResetLoading(true);
    try {
      await forgotPassword(resetUsername.trim());
      setResetSent(true);
      success(
        'Reset requested',
        'If the account exists, a reset link has been sent.',
        6000,
      );
    } catch (err: any) {
      // Backend always returns 200 for forgot-password (security best practice),
      // so an error here is usually network or 5xx.
      const status = err?.response?.status;
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Unable to send reset request';
      if (!status) {
        toastError('Connection error', msg, 5000);
      } else {
        toastError('Request failed', msg, 5000);
      }
    } finally {
      setResetLoading(false);
    }
  };

  const backToLogin = () => {
    setMode('login');
    setResetSent(false);
    setResetUsername('');
  };

  // ── Demo fill ─────────────────────────────────────────────
  const fillDemo = (acc: { username: string; password: string; role: string }) => {
    setUsername(acc.username);
    setPassword(acc.password);
    setMode('login');
    info('Demo account loaded', `${acc.role} credentials ready`, 2000);
  };

  const totalDemoAccounts = useMemo(
    () => DEMO_GROUPS.reduce((n, g) => n + g.accounts.length, 0),
    [],
  );

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        .login-card   { animation: fadeUp .45s ease both; }
        .field-input  {
          display: block; width: 100%; box-sizing: border-box;
          padding: 9px 12px 9px 36px;
          border: 1px solid var(--border-color); border-radius: 8px;
          font-size: 13px; color: var(--text-primary);
          background: var(--bg-main); outline: none; font-family: inherit;
          transition: border-color .15s, box-shadow .15s;
        }
        .field-input:focus {
          border-color: var(--icon-cyan-text);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--icon-cyan-text) 12%, transparent);
        }
        .field-input::placeholder { color: var(--text-tertiary); }
        .demo-btn {
          display: flex; align-items: center; gap: 8px;
          width: 100%; padding: 7px 10px; text-align: left;
          border-radius: 8px; border: 1px solid var(--border-color);
          background: var(--bg-main); cursor: pointer;
          transition: background .15s, border-color .15s;
        }
        .demo-btn:hover {
          background: var(--icon-cyan-bg);
          border-color: var(--icon-cyan-text);
        }
        .demo-btn:disabled { opacity: .55; cursor: not-allowed; }
        .feature-tile {
          padding: 12px 14px; border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.06);
          background: rgba(255,255,255,0.04);
          transition: background .2s;
        }
        .feature-tile:hover { background: rgba(255,255,255,0.07); }
        .demo-scroll {
          max-height: 260px; overflow-y: auto; padding-right: 4px;
          scrollbar-width: thin;
        }
      `}</style>

      {/* ── Full-screen wrapper ── */}
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          position: 'relative',
          background: 'var(--bg-main)',
        }}
      >
        {/* Background photo */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'url("https://images.unsplash.com/photo-1516549655169-df83a0774514?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80")',
            backgroundSize: 'cover',
            backgroundPosition: 'center 30%',
            opacity: 0.14,
          }}
        />
        {/* Overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(8,14,26,0.65)',
          }}
        />

        {/* ── Card ── */}
        <div
          className="login-card"
          style={{
            position: 'relative',
            zIndex: 10,
            width: '100%',
            maxWidth: 1120,
            display: 'grid',
            gridTemplateColumns: '1fr 480px',
            minHeight: 540,
            borderRadius: 16,
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)',
          }}
        >
          {/* ════════════════════════════════════════
              LEFT — branding panel
          ════════════════════════════════════════ */}
          <div
            style={{
              background: 'rgba(8,16,30,0.92)',
              backdropFilter: 'blur(20px)',
              padding: '36px 32px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  flexShrink: 0,
                  background: 'rgba(56,149,180,0.12)',
                  border: '1px solid rgba(56,149,180,0.22)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Hospital style={{ width: 18, height: 18, color: '#5BAEC8' }} />
              </div>
              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 14,
                    fontWeight: 600,
                    color: '#D8E8F4',
                    letterSpacing: '-.01em',
                  }}
                >
                  Veridian HMS
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: 11,
                    color: '#3D607A',
                    letterSpacing: '.03em',
                  }}
                >
                  Hospital Management System
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div>
                <p
                  style={{
                    margin: '0 0 10px',
                    fontSize: 24,
                    fontWeight: 600,
                    color: '#C8DCF0',
                    lineHeight: 1.3,
                    letterSpacing: '-.02em',
                  }}
                >
                  Comprehensive care,
                  <br />
                  one platform.
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    color: '#5A8099',
                    lineHeight: 1.7,
                    maxWidth: 320,
                  }}
                >
                  Patient records, clinical workflows, pharmacy, billing, and
                  reporting — built for modern Ghanaian healthcare.
                </p>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 8,
                }}
              >
                {FEATURES.map((f) => (
                  <div key={f.label} className="feature-tile">
                    <f.Icon
                      style={{
                        width: 15,
                        height: 15,
                        color: '#5BAEC8',
                        marginBottom: 7,
                        display: 'block',
                      }}
                    />
                    <p
                      style={{
                        margin: '0 0 2px',
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#A8C4D8',
                      }}
                    >
                      {f.label}
                    </p>
                    <p style={{ margin: 0, fontSize: 11, color: '#3D607A' }}>
                      {f.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <p style={{ margin: 0, fontSize: 11, color: '#1E3A50' }}>
              © 2025 Veridian Health Systems
            </p>
          </div>

          {/* ════════════════════════════════════════
              RIGHT — form panel
          ════════════════════════════════════════ */}
          <div
            style={{
              background: 'var(--bg-card)',
              padding: '32px 24px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              overflowY: 'auto',
              maxHeight: '100vh',
            }}
          >
            {/* ──────────────────────────────
                LOGIN VIEW
            ────────────────────────────── */}
            {mode === 'login' && (
              <>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 11,
                      margin: '0 auto 12px',
                      background: 'var(--icon-cyan-bg)',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Hospital
                      style={{
                        width: 20,
                        height: 20,
                        color: 'var(--icon-cyan-text)',
                      }}
                    />
                  </div>
                  <p
                    style={{
                      margin: '0 0 4px',
                      fontSize: 15,
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      letterSpacing: '-.01em',
                    }}
                  >
                    Sign in
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12,
                      color: 'var(--text-tertiary)',
                    }}
                  >
                    Enter your credentials to continue
                  </p>
                </div>

                {/* Form */}
                <form
                  onSubmit={handleSubmit}
                  style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
                >
                  {/* Username */}
                  <div>
                    <label
                      htmlFor="username"
                      style={{
                        display: 'block',
                        fontSize: 11,
                        fontWeight: 600,
                        color: 'var(--text-secondary)',
                        marginBottom: 5,
                        letterSpacing: '.02em',
                        textTransform: 'uppercase',
                      }}
                    >
                      Username
                    </label>
                    <div style={{ position: 'relative' }}>
                      <User
                        style={{
                          position: 'absolute',
                          left: 11,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: 13,
                          height: 13,
                          color: 'var(--text-tertiary)',
                          pointerEvents: 'none',
                        }}
                      />
                      <input
                        id="username"
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

                  {/* Password */}
                  <div>
                    <label
                      htmlFor="password"
                      style={{
                        display: 'block',
                        fontSize: 11,
                        fontWeight: 600,
                        color: 'var(--text-secondary)',
                        marginBottom: 5,
                        letterSpacing: '.02em',
                        textTransform: 'uppercase',
                      }}
                    >
                      Password
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Lock
                        style={{
                          position: 'absolute',
                          left: 11,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: 13,
                          height: 13,
                          color: 'var(--text-tertiary)',
                          pointerEvents: 'none',
                        }}
                      />
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        required
                        autoComplete="current-password"
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter password"
                        disabled={loading}
                        className="field-input"
                        style={{ paddingRight: 36 }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        disabled={loading}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        style={{
                          position: 'absolute',
                          right: 10,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: 0,
                          color: 'var(--text-tertiary)',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        {showPassword ? (
                          <EyeOff style={{ width: 13, height: 13 }} />
                        ) : (
                          <Eye style={{ width: 13, height: 13 }} />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Forgot password link */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setMode('forgot')}
                      disabled={loading}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: 11,
                        color: 'var(--icon-cyan-text)',
                        fontWeight: 500,
                        padding: 0,
                      }}
                    >
                      Forgot password?
                    </button>
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      width: '100%',
                      padding: '10px 0',
                      borderRadius: 8,
                      border: 'none',
                      background: loading
                        ? 'var(--text-tertiary)'
                        : 'var(--icon-cyan-text)',
                      color: '#fff',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: loading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      transition: 'opacity .15s',
                      opacity: loading ? 0.65 : 1,
                      letterSpacing: '.01em',
                    }}
                  >
                    {loading ? (
                      <>
                        <div
                          style={{
                            width: 13,
                            height: 13,
                            borderRadius: '50%',
                            border: '2px solid rgba(255,255,255,0.3)',
                            borderTopColor: '#fff',
                            animation: 'spin .7s linear infinite',
                          }}
                        />
                        Signing in…
                      </>
                    ) : (
                      <>
                        <LogIn style={{ width: 14, height: 14 }} />
                        Sign in
                      </>
                    )}
                  </button>
                </form>

                {/* ── Demo accounts ── */}
                {DEMO_ENABLED && totalDemoAccounts > 0 && (
                  <div
                    style={{
                      marginTop: 18,
                      paddingTop: 14,
                      borderTop: '1px solid var(--border-color)',
                    }}
                  >
                    <p
                      style={{
                        margin: '0 0 9px',
                        fontSize: 10,
                        fontWeight: 700,
                        color: 'var(--text-tertiary)',
                        textTransform: 'uppercase',
                        letterSpacing: '.08em',
                        textAlign: 'center',
                      }}
                    >
                      Quick demo access · {totalDemoAccounts} accounts
                    </p>

                    <div className="demo-scroll">
                      {DEMO_GROUPS.map((group) => (
                        <div key={group.label} style={{ marginBottom: 10 }}>
                          <p
                            style={{
                              margin: '0 0 5px 2px',
                              fontSize: 9,
                              fontWeight: 700,
                              color: 'var(--text-tertiary)',
                              textTransform: 'uppercase',
                              letterSpacing: '.08em',
                            }}
                          >
                            {group.label}
                          </p>
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr',
                              gap: 5,
                            }}
                          >
                            {group.accounts.map((acc) => (
                              <button
                                key={acc.username}
                                type="button"
                                onClick={() => fillDemo(acc)}
                                disabled={loading}
                                className="demo-btn"
                              >
                                <div
                                  style={{
                                    width: 24,
                                    height: 24,
                                    borderRadius: 6,
                                    flexShrink: 0,
                                    background: 'var(--bg-main)',
                                    border: '1px solid var(--border-color)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  <acc.Icon
                                    style={{
                                      width: 12,
                                      height: 12,
                                      color: acc.color,
                                    }}
                                  />
                                </div>
                                <div style={{ minWidth: 0 }}>
                                  <p
                                    style={{
                                      margin: 0,
                                      fontSize: 11,
                                      fontWeight: 600,
                                      color: 'var(--text-primary)',
                                      whiteSpace: 'nowrap',
                                    }}
                                  >
                                    {acc.role}
                                  </p>
                                  <p
                                    style={{
                                      margin: 0,
                                      fontSize: 10,
                                      color: 'var(--text-tertiary)',
                                      whiteSpace: 'nowrap',
                                      fontFamily: 'monospace',
                                    }}
                                  >
                                    {acc.username}
                                  </p>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Security notice ── */}
                <div
                  style={{
                    marginTop: 14,
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-main)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                  }}
                >
                  <CheckCircle
                    style={{
                      width: 13,
                      height: 13,
                      color: 'var(--icon-green-text)',
                      flexShrink: 0,
                      marginTop: 1,
                    }}
                  />
                  <p
                    style={{
                      margin: 0,
                      fontSize: 11,
                      color: 'var(--text-tertiary)',
                      lineHeight: 1.55,
                    }}
                  >
                    Secure &amp; HIPAA-compliant. Unauthorised access is
                    prohibited and logged.
                  </p>
                </div>
              </>
            )}

            {/* ──────────────────────────────
                FORGOT-PASSWORD VIEW
            ────────────────────────────── */}
            {mode === 'forgot' && (
              <>
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 11,
                      margin: '0 auto 12px',
                      background: 'var(--icon-cyan-bg)',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Mail
                      style={{
                        width: 20,
                        height: 20,
                        color: 'var(--icon-cyan-text)',
                      }}
                    />
                  </div>
                  <p
                    style={{
                      margin: '0 0 4px',
                      fontSize: 15,
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      letterSpacing: '-.01em',
                    }}
                  >
                    Reset your password
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12,
                      color: 'var(--text-tertiary)',
                    }}
                  >
                    {resetSent
                      ? 'Check your inbox for the reset link'
                      : 'Enter your username and we’ll send a reset link'}
                  </p>
                </div>

                {resetSent ? (
                  <div
                    style={{
                      padding: '14px 16px',
                      borderRadius: 8,
                      border: '1px solid var(--border-color)',
                      background: 'var(--icon-green-bg)',
                      marginBottom: 16,
                    }}
                  >
                    <p
                      style={{
                        margin: 0,
                        fontSize: 12,
                        color: 'var(--icon-green-text)',
                        lineHeight: 1.55,
                      }}
                    >
                      If an account exists for{' '}
                      <strong>{resetUsername}</strong>, a password reset link
                      has been sent. The link expires in 1 hour.
                    </p>
                  </div>
                ) : (
                  <form
                    onSubmit={handleForgotSubmit}
                    style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
                  >
                    <div>
                      <label
                        htmlFor="resetUsername"
                        style={{
                          display: 'block',
                          fontSize: 11,
                          fontWeight: 600,
                          color: 'var(--text-secondary)',
                          marginBottom: 5,
                          letterSpacing: '.02em',
                          textTransform: 'uppercase',
                        }}
                      >
                        Username
                      </label>
                      <div style={{ position: 'relative' }}>
                        <User
                          style={{
                            position: 'absolute',
                            left: 11,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: 13,
                            height: 13,
                            color: 'var(--text-tertiary)',
                            pointerEvents: 'none',
                          }}
                        />
                        <input
                          id="resetUsername"
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

                    <button
                      type="submit"
                      disabled={resetLoading}
                      style={{
                        width: '100%',
                        padding: '10px 0',
                        borderRadius: 8,
                        border: 'none',
                        background: resetLoading
                          ? 'var(--text-tertiary)'
                          : 'var(--icon-cyan-text)',
                        color: '#fff',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: resetLoading ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        transition: 'opacity .15s',
                        opacity: resetLoading ? 0.65 : 1,
                      }}
                    >
                      {resetLoading ? (
                        <>
                          <div
                            style={{
                              width: 13,
                              height: 13,
                              borderRadius: '50%',
                              border: '2px solid rgba(255,255,255,0.3)',
                              borderTopColor: '#fff',
                              animation: 'spin .7s linear infinite',
                            }}
                          />
                          Sending…
                        </>
                      ) : (
                        <>
                          <Mail style={{ width: 14, height: 14 }} />
                          Send reset link
                        </>
                      )}
                    </button>
                  </form>
                )}

                <button
                  type="button"
                  onClick={backToLogin}
                  style={{
                    marginTop: 16,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 12,
                    color: 'var(--icon-cyan-text)',
                    fontWeight: 500,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    alignSelf: 'center',
                    padding: 0,
                  }}
                >
                  <ArrowLeft style={{ width: 13, height: 13 }} />
                  Back to sign in
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}