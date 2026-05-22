// src/pages/Login.tsx
import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../store/toastStore';
import {
  Hospital,
  Lock,
  User,
  Eye,
  EyeOff,
  Users,
  Stethoscope,
  Shield,
  Activity,
  Pill,
  Receipt,
  LogIn,
  CheckCircle,
} from 'lucide-react';

// ── Demo accounts ─────────────────────────────────────────────────────────────

const DEMO_ACCOUNTS = [
  {
    username: 'admin',
    password: 'admin123',
    role: 'Administrator',
    Icon: Shield,
    iconBg: 'var(--icon-cyan-bg)',
    iconColor: 'var(--icon-cyan-text)',
  },
  {
    username: 'doctor1',
    password: 'doctor123',
    role: 'Doctor',
    Icon: Stethoscope,
    iconBg: 'var(--icon-green-bg)',
    iconColor: 'var(--icon-green-text)',
  },
  {
    username: 'nurse1',
    password: 'nurse123',
    role: 'Nurse',
    Icon: Activity,
    iconBg: 'var(--icon-yellow-bg)',
    iconColor: 'var(--icon-yellow-text)',
  },
  {
    username: 'pharma1',
    password: 'pharma123',
    role: 'Pharmacist',
    Icon: Pill,
    iconBg: 'var(--icon-purple-bg)',
    iconColor: 'var(--icon-purple-text)',
  },
];

// ── Feature cards shown on the left panel ─────────────────────────────────────

const FEATURES = [
  {
    Icon: Users,
    label: 'Patients',
    desc: 'Full record management',
    iconBg: 'rgba(96,165,250,0.15)',
    iconColor: '#93C5FD',
    border: 'rgba(96,165,250,0.25)',
  },
  {
    Icon: Stethoscope,
    label: 'Clinical',
    desc: 'Labs, vitals, entries',
    iconBg: 'rgba(110,231,183,0.15)',
    iconColor: '#6EE7B7',
    border: 'rgba(110,231,183,0.25)',
  },
  {
    Icon: Pill,
    label: 'Pharmacy',
    desc: 'Prescribe & dispense',
    iconBg: 'rgba(196,165,250,0.15)',
    iconColor: '#C4B5FD',
    border: 'rgba(196,165,250,0.25)',
  },
  {
    Icon: Receipt,
    label: 'Billing',
    desc: 'NHIS & cash payments',
    iconBg: 'rgba(253,186,116,0.15)',
    iconColor: '#FDBA74',
    border: 'rgba(253,186,116,0.25)',
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function Login() {
  const [username, setUsername]         = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]           = useState(false);

  const login    = useAuthStore((state) => state.login);
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

      const storeState = useAuthStore.getState();
      console.log('Store after login:', {
        hasUser:       !!storeState.user,
        hasToken:      !!storeState.token,
        user:          storeState.user?.username,
        isInitialized: storeState.isInitialized,
      });

      if (loggedIn) {
        success('Welcome back!', `Hello, ${username}!`, 3000);
        setTimeout(() => navigate('/dashboard', { replace: true }), 100);
      } else {
        toastError('Access denied', 'Invalid username or password', 5000);
      }
    } catch (err: any) {
      toastError(
        'Connection error',
        err.message || 'Unable to connect. Please check your network and try again.',
        5000
      );
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (acc: (typeof DEMO_ACCOUNTS)[number]) => {
    setUsername(acc.username);
    setPassword(acc.password);
    info('Demo account loaded', `${acc.role} credentials ready`, 2000);
  };

  // ── Shared input style ──────────────────────────────────────────────────────
  const inputBase: React.CSSProperties = {
    display:     'block',
    width:       '100%',
    padding:     '8px 12px 8px 34px',
    border:      '0.5px solid var(--border-color)',
    borderRadius: 8,
    fontSize:    13,
    color:       'var(--text-primary)',
    background:  'var(--bg-main)',
    outline:     'none',
    boxSizing:   'border-box',
    fontFamily:  'inherit',
    transition:  'border-color .15s',
  };

  return (
    <div
      className="min-h-screen"
      style={{
        position: 'relative',
        display:  'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        background: 'var(--bg-main)',
      }}
    >
      {/* ── Background photo ─────────────────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          inset:    0,
          backgroundImage:
            'url("https://images.unsplash.com/photo-1551076805-e1869033e561?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80")',
          backgroundSize:     'cover',
          backgroundPosition: 'center',
          opacity:            0.18,
        }}
      />
      {/* Dark overlay */}
      <div
        style={{
          position: 'absolute',
          inset:    0,
          background: 'rgba(10,18,32,0.55)',
        }}
      />

      {/* ── Login card ───────────────────────────────────────────────────── */}
      <div
        className="relative z-10 w-full rounded-2xl overflow-hidden border"
        style={{
          maxWidth:    900,
          borderColor: 'var(--border-color)',
          boxShadow:   '0 24px 64px rgba(0,0,0,0.35)',
          display:     'grid',
          gridTemplateColumns: '1fr 320px',
          minHeight:   520,
        }}
      >

        {/* ── LEFT: branding panel ─────────────────────────────────────── */}
        <div
          style={{
            background: 'rgba(10,20,38,0.88)',
            padding:    '32px 28px',
            display:    'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            backdropFilter: 'blur(12px)',
          }}
        >
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width:        40,
                height:       40,
                borderRadius: 10,
                background:   'rgba(96,165,250,0.12)',
                border:       '0.5px solid rgba(96,165,250,0.3)',
                display:      'flex',
                alignItems:   'center',
                justifyContent: 'center',
                flexShrink:   0,
              }}
            >
              <Hospital style={{ width: 20, height: 20, color: '#93C5FD' }} />
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 500, color: '#E2EAF4', margin: 0 }}>
                Veridian HMS
              </p>
              <p style={{ fontSize: 11, color: '#4F7298', margin: 0 }}>
                Hospital Management System
              </p>
            </div>
          </div>

          {/* Tagline + features */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <p style={{ fontSize: 22, fontWeight: 500, color: '#E2EAF4', lineHeight: 1.35, margin: '0 0 8px' }}>
                Comprehensive care,<br />all in one platform.
              </p>
              <p style={{ fontSize: 13, color: '#7FA0BF', lineHeight: 1.65, margin: 0, maxWidth: 340 }}>
                Manage patients, clinical records, pharmacy, billing, and more
                — built for modern healthcare.
              </p>
            </div>

            <div
              style={{
                display:             'grid',
                gridTemplateColumns: '1fr 1fr',
                gap:                 8,
              }}
            >
              {FEATURES.map((f) => (
                <div
                  key={f.label}
                  style={{
                    padding:      '10px 12px',
                    borderRadius: 8,
                    background:   f.iconBg,
                    border:       `0.5px solid ${f.border}`,
                  }}
                >
                  <f.Icon
                    style={{ width: 16, height: 16, color: f.iconColor, display: 'block', marginBottom: 5 }}
                  />
                  <p style={{ fontSize: 12, fontWeight: 500, color: '#CBD8E8', margin: '0 0 2px' }}>
                    {f.label}
                  </p>
                  <p style={{ fontSize: 11, color: '#4F7298', margin: 0 }}>
                    {f.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <p style={{ fontSize: 11, color: '#1E3A5A', margin: 0 }}>
            © 2025 Veridian Health Systems · All rights reserved
          </p>
        </div>

        {/* ── RIGHT: form panel ────────────────────────────────────────── */}
        <div
          style={{
            background:    'var(--bg-card)',
            padding:       '28px 24px',
            display:       'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div
              style={{
                width:        44,
                height:       44,
                borderRadius: 12,
                background:   'var(--icon-cyan-bg)',
                border:       '0.5px solid var(--border-color)',
                display:      'flex',
                alignItems:   'center',
                justifyContent: 'center',
                margin:       '0 auto 10px',
              }}
            >
              <Hospital style={{ width: 22, height: 22, color: 'var(--icon-cyan-text)' }} />
            </div>
            <p
              style={{
                fontSize:   16,
                fontWeight: 500,
                color:      'var(--text-primary)',
                margin:     '0 0 3px',
              }}
            >
              Welcome back
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0 }}>
              Sign in to your account
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Username */}
            <div>
              <label
                htmlFor="username"
                style={{
                  display:    'block',
                  fontSize:   11,
                  fontWeight: 500,
                  color:      'var(--text-secondary)',
                  marginBottom: 4,
                }}
              >
                Username
              </label>
              <div style={{ position: 'relative' }}>
                <User
                  style={{
                    position:  'absolute',
                    left:      10,
                    top:       '50%',
                    transform: 'translateY(-50%)',
                    width:     14,
                    height:    14,
                    color:     'var(--text-tertiary)',
                    pointerEvents: 'none',
                  }}
                />
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  required
                  autoComplete="username"
                  disabled={loading}
                  style={inputBase}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--icon-cyan-text)')}
                  onBlur={(e)  => (e.target.style.borderColor = 'var(--border-color)')}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                style={{
                  display:    'block',
                  fontSize:   11,
                  fontWeight: 500,
                  color:      'var(--text-secondary)',
                  marginBottom: 4,
                }}
              >
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock
                  style={{
                    position:  'absolute',
                    left:      10,
                    top:       '50%',
                    transform: 'translateY(-50%)',
                    width:     14,
                    height:    14,
                    color:     'var(--text-tertiary)',
                    pointerEvents: 'none',
                  }}
                />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  disabled={loading}
                  style={{ ...inputBase, paddingRight: 36 }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--icon-cyan-text)')}
                  onBlur={(e)  => (e.target.style.borderColor = 'var(--border-color)')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  style={{
                    position:   'absolute',
                    right:      10,
                    top:        '50%',
                    transform:  'translateY(-50%)',
                    background: 'none',
                    border:     'none',
                    cursor:     'pointer',
                    padding:    0,
                    display:    'flex',
                    color:      'var(--text-tertiary)',
                  }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword
                    ? <EyeOff style={{ width: 14, height: 14 }} />
                    : <Eye    style={{ width: 14, height: 14 }} />}
                </button>
              </div>
            </div>

            {/* Remember + forgot */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label
                style={{
                  display:    'flex',
                  alignItems: 'center',
                  gap:        5,
                  fontSize:   11,
                  color:      'var(--text-secondary)',
                  cursor:     'pointer',
                }}
              >
                <input
                  type="checkbox"
                  style={{ accentColor: 'var(--icon-cyan-text)' }}
                  disabled={loading}
                />
                Remember me
              </label>
              <a
                href="#"
                style={{
                  fontSize: 11,
                  color:    'var(--icon-cyan-text)',
                  textDecoration: 'none',
                }}
              >
                Forgot password?
              </a>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width:          '100%',
                padding:        '10px 0',
                borderRadius:   8,
                border:         'none',
                background:     loading ? 'var(--text-tertiary)' : 'var(--icon-cyan-text)',
                color:          '#fff',
                fontSize:       13,
                fontWeight:     500,
                cursor:         loading ? 'not-allowed' : 'pointer',
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                gap:            7,
                transition:     'opacity .15s',
                opacity:        loading ? 0.7 : 1,
              }}
            >
              {loading ? (
                <>
                  <div
                    style={{
                      width:       14,
                      height:      14,
                      border:      '2px solid rgba(255,255,255,0.4)',
                      borderTop:   '2px solid #fff',
                      borderRadius: '50%',
                      animation:   'spin 0.7s linear infinite',
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

          {/* Demo accounts */}
          <div
            style={{
              marginTop:  18,
              paddingTop: 16,
              borderTop:  '0.5px solid var(--border-color)',
            }}
          >
            <p
              style={{
                fontSize:      10,
                fontWeight:    500,
                color:         'var(--text-tertiary)',
                textTransform: 'uppercase',
                letterSpacing: '.06em',
                textAlign:     'center',
                marginBottom:  8,
              }}
            >
              Quick demo access
            </p>
            <div
              style={{
                display:             'grid',
                gridTemplateColumns: '1fr 1fr',
                gap:                 5,
              }}
            >
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.username}
                  type="button"
                  onClick={() => fillDemo(acc)}
                  disabled={loading}
                  style={{
                    display:    'flex',
                    alignItems: 'center',
                    gap:        8,
                    padding:    '6px 8px',
                    borderRadius: 7,
                    border:     '0.5px solid var(--border-color)',
                    background: 'var(--bg-main)',
                    cursor:     loading ? 'not-allowed' : 'pointer',
                    textAlign:  'left',
                    transition: 'background .15s',
                  }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLButtonElement).style.background =
                      'var(--icon-cyan-bg)')
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLButtonElement).style.background =
                      'var(--bg-main)')
                  }
                >
                  <div
                    style={{
                      width:          22,
                      height:         22,
                      borderRadius:   5,
                      background:     acc.iconBg,
                      display:        'flex',
                      alignItems:     'center',
                      justifyContent: 'center',
                      flexShrink:     0,
                    }}
                  >
                    <acc.Icon style={{ width: 12, height: 12, color: acc.iconColor }} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p
                      style={{
                        fontSize:  11,
                        fontWeight: 500,
                        color:     'var(--text-primary)',
                        margin:    0,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {acc.role}
                    </p>
                    <p
                      style={{
                        fontSize:  10,
                        color:     'var(--text-tertiary)',
                        margin:    0,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {acc.username}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Security notice */}
          <div
            style={{
              marginTop:  14,
              padding:    '9px 11px',
              borderRadius: 8,
              border:     '0.5px solid var(--border-color)',
              background: 'var(--bg-main)',
              display:    'flex',
              alignItems: 'center',
              gap:        8,
            }}
          >
            <CheckCircle
              style={{ width: 13, height: 13, color: 'var(--icon-green-text)', flexShrink: 0 }}
            />
            <p
              style={{
                fontSize:   11,
                color:      'var(--text-secondary)',
                margin:     0,
                lineHeight: 1.5,
              }}
            >
              Secure & HIPAA-compliant. Unauthorised access is prohibited.
            </p>
          </div>
        </div>
      </div>

      {/* Spinner keyframe injected once */}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}