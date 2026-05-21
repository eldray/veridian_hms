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
  Calendar,
  Stethoscope,
  Shield,
  Activity,
  ClipboardList
} from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();
  const { success, error: toastError, info } = useToast();

// In Login.tsx - update handleSubmit
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!username.trim() || !password.trim()) {
    toastError('Invalid Input', 'Please enter both username and password');
    return;
  }

  setLoading(true);
  try {
    console.log('📤 Attempting login...');
    const loggedIn = await login(username, password);
    console.log('📥 Login result:', loggedIn);
    
    // ✅ Check store state after login
    const storeState = useAuthStore.getState();
    console.log('🏪 Store after login:', { 
      hasUser: !!storeState.user, 
      hasToken: !!storeState.token,
      user: storeState.user?.username,
      isInitialized: storeState.isInitialized
    });

    if (loggedIn) {
      success('Welcome back!', `Hello, ${username}!`, 3000);
      
      // ✅ Small delay to ensure state is persisted
      setTimeout(() => {
        console.log('🚀 Navigating to dashboard...');
        navigate('/dashboard', { replace: true });
      }, 100);
    } else {
      toastError('Access Denied', 'Invalid username or password', 5000);
    }
  } catch (err: any) {
    console.error('❌ Login error:', err);
    toastError(
      'Connection Error',
      err.message || 'Unable to connect. Please check your network and try again.',
      5000
    );
  } finally {
    setLoading(false);
  }
};

  const fillDemoCredentials = (demoUsername: string, demoPassword: string, role: string) => {
    setUsername(demoUsername);
    setPassword(demoPassword);
    info('Demo Account Loaded', `${role} credentials ready`, 2000);
  };

  const demoAccounts = [
    { username: 'admin', password: 'admin123', role: 'System Administrator', icon: Shield },
    { username: 'doctor1', password: 'doctor123', role: 'Medical Doctor', icon: Stethoscope },
    { username: 'nurse1', password: 'nurse123', role: 'Registered Nurse', icon: Activity },
    { username: 'pharma1', password: 'pharma123', role: 'Pharmacist', icon: ClipboardList },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-main)] flex items-center justify-center p-4">
      {/* Background with Medical Theme and Overlay */}
      <div className="absolute inset-0">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-10"
          style={{
            backgroundImage: 'url("https://images.unsplash.com/photo-1551076805-e1869033e561?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80")'
          }}
        />
        {/* Theme-based overlay */}
        <div className="absolute inset-0 bg-[var(--icon-cyan-bg)] opacity-20" />
      </div>

      {/* Main Login Container */}
      <div className="bg-[var(--bg-card)] rounded-xl shadow-lg w-full max-w-4xl overflow-hidden border border-[var(--border-color)] relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[500px]">
          {/* Left: Branding & Demo Accounts */}
          <div className="bg-gradient-to-br from-[var(--icon-cyan-text)] to-[var(--icon-purple-text)] p-6 relative">
            {/* Background Pattern Overlay */}
            <div className="absolute inset-0 bg-white/10" />
            <div className="relative z-10 h-full flex flex-col">
              {/* Header */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-white/20 rounded-lg mb-3 border border-white/30">
                  <Hospital className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-xl font-bold text-white mb-1">Veridian HMS</h1>
                <p className="text-white/80 text-sm">Hospital Management System</p>
              </div>

              {/* Features - Compact Layout */}
              <div className="space-y-2 mb-4 flex-1">
                {[
                  { icon: Users, title: 'Patient Management', desc: 'Comprehensive care tracking', bgColor: 'bg-[var(--icon-cyan-bg)]', textColor: 'text-[var(--icon-cyan-text)]' },
                  { icon: Calendar, title: 'Medical Records', desc: 'Secure digital records', bgColor: 'bg-[var(--icon-green-bg)]', textColor: 'text-[var(--icon-green-text)]' },
                  { icon: Shield, title: 'HIPAA Compliant', desc: 'Enterprise security', bgColor: 'bg-[var(--icon-purple-bg)]', textColor: 'text-[var(--icon-purple-text)]' }
                ].map((feat, i) => (
                  <div 
                    key={i} 
                    className="flex items-center space-x-2 p-2 bg-white/10 rounded-lg border border-white/20 backdrop-blur-sm"
                  >
                    <div className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0 ${feat.bgColor} ${feat.textColor}`}>
                      <feat.icon className="w-4 h-4 text-current" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-xs">{feat.title}</p>
                      <p className="text-white/80 text-xs">{feat.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Demo Accounts */}
              <div>
                <p className="text-white/80 font-medium mb-2 text-center text-xs">Quick Demo Access</p>
                <div className="grid grid-cols-2 gap-1">
                  {demoAccounts.map((acc) => {
                    const Icon = acc.icon;
                    return (
                      <button
                        key={acc.username}
                        onClick={() => fillDemoCredentials(acc.username, acc.password, acc.role)}
                        className="bg-white/10 hover:bg-white/20 border border-white/20 p-1 rounded transition-all duration-200 group backdrop-blur-sm"
                      >
                        <div className="flex items-center space-x-1">
                          <div className="w-6 h-6 bg-white/20 rounded flex items-center justify-center flex-shrink-0">
                            <Icon className="w-3 h-3 text-white" />
                          </div>
                          <div className="text-left min-w-0 flex-1">
                            <p className="text-white text-xs font-semibold truncate">{acc.role.split(' ')[0]}</p>
                            <p className="text-white/80 text-xs truncate">{acc.username}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Login Form */}
          <div className="p-6 bg-[var(--bg-card)]">
            <div className="h-full flex flex-col justify-center">
              <div className="max-w-xs mx-auto w-full">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold text-[var(--text-primary)] mb-1">Welcome Back</h2>
                  <p className="text-[var(--text-secondary)] text-sm">Sign in to your account</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Username */}
                  <div>
                    <label htmlFor="username" className="block text-sm font-semibold text-[var(--text-primary)] mb-1">
                      Username
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-4 w-4 text-[var(--text-tertiary)]" />
                      </div>
                      <input
                        id="username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="block w-full pl-9 pr-3 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm"
                        placeholder="Enter username"
                        required
                        autoComplete="username"
                        disabled={loading}
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label htmlFor="password" className="block text-sm font-semibold text-[var(--text-primary)] mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-4 w-4 text-[var(--text-tertiary)]" />
                      </div>
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="block w-full pl-9 pr-9 py-2 text-[var(--text-primary)] bg-[var(--bg-main)] border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--icon-cyan-text)] focus:border-[var(--icon-cyan-text)] text-sm"
                        placeholder="Enter password"
                        required
                        autoComplete="current-password"
                        disabled={loading}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={loading}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-[var(--text-tertiary)]" />
                        ) : (
                          <Eye className="h-4 w-4 text-[var(--text-tertiary)]" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Remember & Forgot */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center">
                      <input
                        id="remember-me"
                        type="checkbox"
                        className="h-3 w-3 text-[var(--icon-cyan-text)] focus:ring-[var(--icon-cyan-text)] border-[var(--border-color)] rounded"
                        disabled={loading}
                      />
                      <label htmlFor="remember-me" className="ml-1 block text-[var(--text-primary)]">Remember me</label>
                    </div>
                    <a href="#" className="text-[var(--icon-cyan-text)] hover:text-[var(--icon-cyan-text)]/80">
                      Forgot password?
                    </a>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-[var(--icon-cyan-text)] to-[var(--icon-purple-text)] hover:from-[var(--icon-cyan-text)]/90 hover:to-[var(--icon-purple-text)]/90 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-sm"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Signing in...
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 mr-2" />
                        Sign In
                      </>
                    )}
                  </button>
                </form>

                {/* Security Notice */}
                <div className="mt-4 p-3 bg-[var(--icon-cyan-bg)] rounded-lg border border-[var(--icon-cyan-text)]">
                  <div className="flex items-start space-x-2">
                    <Shield className="w-4 h-4 text-[var(--icon-cyan-text)] mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-[var(--icon-cyan-text)]">Secure Access</p>
                      <p className="text-xs text-[var(--icon-cyan-text)] mt-0.5">
                        Protected health information. Unauthorized access prohibited.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-4 text-center">
                  <p className="text-xs text-[var(--text-secondary)]">
                    © 2024 Veridian Hospital Management System
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}