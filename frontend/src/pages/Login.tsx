// src/pages/Login.tsx
import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { 
  Hospital, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  Stethoscope, 
  Shield, 
  Activity, 
  Heart,
  Calendar,
  ClipboardList,
  Users
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../store/toastStore';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const success = await login(username, password);
      
      if (success) {
        toast.success('Welcome to Veridian HMS', `Hello, ${username}!`, 3000);
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 1000);
      } else {
        toast.error('Access Denied', 'Invalid username or password', 5000);
      }
    } catch (error: any) {
      console.error('Login error:', error);
      toast.error(
        'Connection Error', 
        error.message || 'Unable to connect to Veridian HMS. Please try again.',
        5000
      );
    } finally {
      setLoading(false);
    }
  };

  const fillDemoCredentials = (demoUsername: string, demoPassword: string, role: string) => {
    setUsername(demoUsername);
    setPassword(demoPassword);
    toast.info('Demo Credentials', `${role} account loaded`, 2000);
  };

  const demoAccounts = [
    { username: 'admin', password: 'admin123', role: 'System Administrator', icon: Shield, color: 'from-blue-500 to-blue-600' },
    { username: 'doctor1', password: 'doctor123', role: 'Medical Doctor', icon: Stethoscope, color: 'from-green-500 to-green-600' },
    { username: 'nurse1', password: 'nurse123', role: 'Registered Nurse', icon: Activity, color: 'from-teal-500 to-teal-600' },
    { username: 'pharma1', password: 'pharma123', role: 'Pharmacist', icon: ClipboardList, color: 'from-orange-500 to-orange-600' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Pulse animation circles */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/5 rounded-full animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 right-1/3 w-48 h-48 bg-green-500/10 rounded-full animate-pulse delay-500"></div>
        
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
      </div>

      {/* Main Login Card */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-6xl overflow-hidden border border-white/20 relative z-10 transform transition-all duration-300 hover:shadow-3xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 min-h-[700px]">
          {/* Left Side - Medical Branding */}
          <div className="bg-gradient-to-br from-blue-600 to-teal-700 p-8 lg:p-12 relative overflow-hidden">
            {/* Medical background pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%22200%22%20height%3D%22200%22%20viewBox%3D%220%200%20200%20200%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M100%20100l40-40m0%2080l-40-40m40%2040l-40%2040m80-80l-40%2040%22%20stroke%3D%22%23ffffff%22%20stroke-width%3D%222%22%20fill%3D%22none%22/%3E%3C/svg%3E')]"></div>
            </div>
            
            <div className="relative z-10 h-full flex flex-col justify-between">
              {/* Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-2xl mb-6 backdrop-blur-sm border border-white/30">
                  <Hospital className="w-10 h-10 text-white" />
                </div>
                <h1 className="text-4xl font-bold text-white mb-3">Veridian HMS</h1>
                <p className="text-blue-100 text-lg">Hospital Management System</p>
                <p className="text-blue-200 text-sm mt-2">Advanced Healthcare Solutions</p>
              </div>

              {/* Features */}
              <div className="space-y-4 mb-8">
                <div className="flex items-center space-x-4 p-4 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">Patient Management</p>
                    <p className="text-blue-100 text-xs">Comprehensive care coordination</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4 p-4 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">Medical Records</p>
                    <p className="text-blue-100 text-xs">Secure digital health records</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4 p-4 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">HIPAA Compliant</p>
                    <p className="text-blue-100 text-xs">Enterprise-grade security</p>
                  </div>
                </div>
              </div>

              {/* Demo Accounts */}
              <div>
                <p className="text-blue-200 text-sm font-medium mb-4 text-center">Quick Access Demo Accounts</p>
                <div className="grid grid-cols-2 gap-3">
                  {demoAccounts.map((account) => {
                    const Icon = account.icon;
                    return (
                      <button
                        key={account.username}
                        onClick={() => fillDemoCredentials(account.username, account.password, account.role)}
                        className="bg-white/10 hover:bg-white/20 border border-white/20 p-3 rounded-xl transition-all duration-200 hover:scale-105 group backdrop-blur-sm"
                      >
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${account.color} flex items-center justify-center flex-shrink-0 shadow-lg`}>
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                          <div className="text-left min-w-0">
                            <p className="text-white text-sm font-semibold truncate">
                              {account.role.split(' ')[0]}
                            </p>
                            <p className="text-blue-200 text-xs truncate">{account.username}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="p-8 lg:p-12 bg-white">
            <div className="h-full flex flex-col justify-center">
              <div className="max-w-md mx-auto w-full">
                {/* Form Header */}
                <div className="text-center mb-8">
                  <h2 className="text-2xl lg:text-3xl font-bold text-gray-800 mb-3">Welcome Back</h2>
                  <p className="text-gray-600">Sign in to access the healthcare system</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Username Field */}
                  <div>
                    <label htmlFor="username" className="block text-sm font-semibold text-gray-700 mb-3">
                      Username
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                      </div>
                      <input
                        id="username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="block w-full pl-12 pr-4 py-3 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base shadow-sm"
                        placeholder="Enter your username"
                        required
                        autoComplete="username"
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div>
                    <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-3">
                      Password
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                      </div>
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="block w-full pl-12 pr-12 py-3 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white text-base shadow-sm"
                        placeholder="Enter your password"
                        required
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-4 flex items-center"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Remember Me & Forgot Password */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center">
                      <input
                        id="remember-me"
                        name="remember-me"
                        type="checkbox"
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="remember-me" className="ml-2 block text-gray-700">
                        Remember me
                      </label>
                    </div>

                    <div>
                      <a href="#" className="font-medium text-blue-600 hover:text-blue-500 transition-colors">
                        Forgot password?
                      </a>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-base shadow-md"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                        Signing in...
                      </>
                    ) : (
                      <>
                        <Lock className="w-5 h-5 mr-3" />
                        Sign In to Veridian HMS
                      </>
                    )}
                  </button>
                </form>

                {/* Security Notice */}
                <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <div className="flex items-start space-x-3">
                    <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-blue-800">Secure Access Required</p>
                      <p className="text-sm text-blue-600 mt-1">
                        This system contains protected health information. Unauthorized access is strictly prohibited.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-6 text-center">
                  <p className="text-xs text-gray-500">
                    © 2024 Veridian Hospital Management System
                    <br />
                    HIPAA Compliant • v2.1.0
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
