// src/pages/Login.tsx
import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../store/toastStore';
import {
  Hospital, Lock, User, Eye, EyeOff,
  Users, Stethoscope, Shield, Activity, Pill, Receipt, LogIn, CheckCircle,
} from 'lucide-react';

// ── Demo accounts ─────────────────────────────────────────────────────────────
const DEMO_ACCOUNTS = [
  { username: 'admin',   password: 'admin123',  role: 'Administrator', Icon: Shield,      color: 'var(--icon-cyan-text)'   },
  { username: 'doctor1', password: 'doctor123', role: 'Doctor',        Icon: Stethoscope, color: 'var(--icon-green-text)'  },
  { username: 'nurse1',  password: 'nurse123',  role: 'Nurse',         Icon: Activity,    color: 'var(--icon-yellow-text)' },
  { username: 'pharma1', password: 'pharma123', role: 'Pharmacist',    Icon: Pill,        color: 'var(--icon-purple-text)' },
];

// ── Feature tiles ─────────────────────────────────────────────────────────────
const FEATURES = [
  { Icon: Users,      label: 'Patient Records',  desc: 'Full lifecycle management'  },
  { Icon: Stethoscope,label: 'Clinical',         desc: 'Labs, vitals, entries'       },
  { Icon: Pill,       label: 'Pharmacy',         desc: 'Prescribe & dispense'        },
  { Icon: Receipt,    label: 'Billing',          desc: 'NHIS & cash payments'        },
];

export default function Login() {
  const [username, setUsername]         = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);

  const login    = useAuthStore(s => s.login);
  const navigate = useNavigate();
  const { success, error: toastError, info } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toastError('Invalid input', 'Please enter both username and password');
      return;
    }
    setLoading(true);
    try {
      const loggedIn = await login(username, password);
      if (loggedIn) {
        success('Welcome back!', `Hello, ${username}!`, 3000);
        setTimeout(() => navigate('/dashboard', { replace: true }), 100);
      } else {
        toastError('Access denied', 'Invalid username or password', 5000);
      }
    } catch (err: any) {
      toastError('Connection error', err.message || 'Unable to connect. Please check your network.', 5000);
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (acc: typeof DEMO_ACCOUNTS[number]) => {
    setUsername(acc.username);
    setPassword(acc.password);
    info('Demo account loaded', `${acc.role} credentials ready`, 2000);
  };

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
        .feature-tile {
          padding: 12px 14px; border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.06);
          background: rgba(255,255,255,0.04);
          transition: background .2s;
        }
        .feature-tile:hover { background: rgba(255,255,255,0.07); }
      `}</style>

      {/* ── Full-screen wrapper ── */}
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.5rem', position: 'relative', background: 'var(--bg-main)',
      }}>

        {/* Background photo */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url("https://images.unsplash.com/photo-1516549655169-df83a0774514?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80")',
          backgroundSize: 'cover', backgroundPosition: 'center 30%', opacity: 0.14,
        }} />
        {/* Overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(8,14,26,0.65)' }} />

        {/* ── Card ── */}
        <div
          className="login-card"
          style={{
            position: 'relative', zIndex: 10, width: '100%', maxWidth: 860,
            display: 'grid', gridTemplateColumns: '1fr 300px', minHeight: 540,
            borderRadius: 16, overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)',
          }}
        >

          {/* ════════════════════════════════════════
              LEFT — branding panel
          ════════════════════════════════════════ */}
          <div style={{
            background: 'rgba(8,16,30,0.92)',
            backdropFilter: 'blur(20px)',
            padding: '36px 32px',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          }}>

            {/* Brand mark */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                background: 'rgba(56,149,180,0.12)',
                border: '1px solid rgba(56,149,180,0.22)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Hospital style={{ width: 18, height: 18, color: '#5BAEC8' }} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#D8E8F4', letterSpacing: '-.01em' }}>
                  Veridian HMS
                </p>
                <p style={{ margin: 0, fontSize: 11, color: '#3D607A', letterSpacing: '.03em' }}>
                  Hospital Management System
                </p>
              </div>
            </div>

            {/* Headline + features */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div>
                <p style={{
                  margin: '0 0 10px', fontSize: 24, fontWeight: 600,
                  color: '#C8DCF0', lineHeight: 1.3, letterSpacing: '-.02em',
                }}>
                  Comprehensive care,<br />one platform.
                </p>
                <p style={{ margin: 0, fontSize: 13, color: '#5A8099', lineHeight: 1.7, maxWidth: 320 }}>
                  Patient records, clinical workflows, pharmacy, billing, and reporting — built for modern Ghanaian healthcare.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {FEATURES.map(f => (
                  <div key={f.label} className="feature-tile">
                    <f.Icon style={{ width: 15, height: 15, color: '#5BAEC8', marginBottom: 7, display: 'block' }} />
                    <p style={{ margin: '0 0 2px', fontSize: 12, fontWeight: 600, color: '#A8C4D8' }}>{f.label}</p>
                    <p style={{ margin: 0, fontSize: 11, color: '#3D607A' }}>{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <p style={{ margin: 0, fontSize: 11, color: '#1E3A50' }}>
              © 2025 Veridian Health Systems
            </p>
          </div>

          {/* ════════════════════════════════════════
              RIGHT — form panel
          ════════════════════════════════════════ */}
          <div style={{
            background: 'var(--bg-card)',
            padding: '32px 24px',
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
            gap: 0,
          }}>

            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{
                width: 42, height: 42, borderRadius: 11, margin: '0 auto 12px',
                background: 'var(--icon-cyan-bg)',
                border: '1px solid var(--border-color)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Hospital style={{ width: 20, height: 20, color: 'var(--icon-cyan-text)' }} />
              </div>
              <p style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-.01em' }}>
                Sign in
              </p>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-tertiary)' }}>
                Enter your credentials to continue
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Username */}
              <div>
                <label htmlFor="username" style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5, letterSpacing: '.02em', textTransform: 'uppercase' }}>
                  Username
                </label>
                <div style={{ position: 'relative' }}>
                  <User style={{
                    position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)',
                    width: 13, height: 13, color: 'var(--text-tertiary)', pointerEvents: 'none',
                  }} />
                  <input
                    id="username" type="text" value={username} required autoComplete="username"
                    onChange={e => setUsername(e.target.value)}
                    placeholder="Enter username"
                    disabled={loading}
                    className="field-input"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5, letterSpacing: '.02em', textTransform: 'uppercase' }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock style={{
                    position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)',
                    width: 13, height: 13, color: 'var(--text-tertiary)', pointerEvents: 'none',
                  }} />
                  <input
                    id="password" type={showPassword ? 'text' : 'password'} value={password}
                    required autoComplete="current-password"
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter password"
                    disabled={loading}
                    className="field-input"
                    style={{ paddingRight: 36 }}
                  />
                  <button
                    type="button" onClick={() => setShowPassword(v => !v)} disabled={loading}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    style={{
                      position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                      color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center',
                    }}
                  >
                    {showPassword
                      ? <EyeOff style={{ width: 13, height: 13 }} />
                      : <Eye    style={{ width: 13, height: 13 }} />}
                  </button>
                </div>
              </div>

              {/* Remember + forgot */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' }}>
                  <input type="checkbox" style={{ accentColor: 'var(--icon-cyan-text)', width: 12, height: 12 }} disabled={loading} />
                  Remember me
                </label>
                <a href="#" style={{ fontSize: 11, color: 'var(--icon-cyan-text)', textDecoration: 'none', fontWeight: 500 }}>
                  Forgot password?
                </a>
              </div>

              {/* Submit */}
              <button
                type="submit" disabled={loading}
                style={{
                  width: '100%', padding: '10px 0', borderRadius: 8, border: 'none',
                  background: loading ? 'var(--text-tertiary)' : 'var(--icon-cyan-text)',
                  color: '#fff', fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'opacity .15s', opacity: loading ? 0.65 : 1,
                  letterSpacing: '.01em',
                }}
              >
                {loading ? (
                  <>
                    <div style={{
                      width: 13, height: 13, borderRadius: '50%',
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#fff',
                      animation: 'spin .7s linear infinite',
                    }} />
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
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-color)' }}>
              <p style={{
                margin: '0 0 9px', fontSize: 10, fontWeight: 700,
                color: 'var(--text-tertiary)', textTransform: 'uppercase',
                letterSpacing: '.08em', textAlign: 'center',
              }}>
                Quick demo access
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
                {DEMO_ACCOUNTS.map(acc => (
                  <button
                    key={acc.username}
                    type="button"
                    onClick={() => fillDemo(acc)}
                    disabled={loading}
                    className="demo-btn"
                  >
                    <div style={{
                      width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                      background: 'var(--bg-main)', border: '1px solid var(--border-color)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <acc.Icon style={{ width: 12, height: 12, color: acc.color }} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                        {acc.role}
                      </p>
                      <p style={{ margin: 0, fontSize: 10, color: 'var(--text-tertiary)', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                        {acc.username}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Security notice ── */}
            <div style={{
              marginTop: 14, padding: '9px 12px', borderRadius: 8,
              border: '1px solid var(--border-color)', background: 'var(--bg-main)',
              display: 'flex', alignItems: 'flex-start', gap: 8,
            }}>
              <CheckCircle style={{ width: 13, height: 13, color: 'var(--icon-green-text)', flexShrink: 0, marginTop: 1 }} />
              <p style={{ margin: 0, fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.55 }}>
                Secure &amp; HIPAA-compliant. Unauthorised access is prohibited and logged.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}