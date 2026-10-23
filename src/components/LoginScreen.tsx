import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Boxes,
  Eye,
  EyeOff,
  FileText,
  Headphones,
  Info,
  Lock,
  ScanBarcode,
  Shield,
  ShieldCheck,
  ShoppingCart,
  User,
  Users,
  Zap,
} from 'lucide-react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';
import { BrandLogo } from './BrandLogo';
import { UserProfile } from '../types';

interface LoginScreenProps {
  initialPortalType?: 'admin' | 'staff';
  storeName?: string;
  onLoginSuccess: (token: string, user: UserProfile) => void;
  onBackToHome: () => void;
}

const DEMO_ACCOUNTS = [
  { label: 'Super Admin', username: 'admin', pass: 'Admin@123', portal: 'admin' as const },
  { label: 'Manager', username: 'manager', pass: 'Staff@123', portal: 'staff' as const },
  { label: 'Sales Operator', username: 'sales_op', pass: 'Staff@123', portal: 'staff' as const },
  { label: 'Purchase Operator', username: 'purchase_op', pass: 'Staff@123', portal: 'staff' as const },
  { label: 'Accountant', username: 'accountant', pass: 'Staff@123', portal: 'staff' as const },
  { label: 'Inventory Staff', username: 'inventory_op', pass: 'Staff@123', portal: 'staff' as const },
  { label: 'Secretary', username: 'secretary', pass: 'Staff@123', portal: 'staff' as const },
];

export const LoginScreen: React.FC<LoginScreenProps> = ({
  initialPortalType = 'admin',
  storeName = 'T Mobiles',
  onLoginSuccess,
  onBackToHome,
}) => {
  const [portalType, setPortalType] = useState<'admin' | 'staff'>(initialPortalType);
  const [username, setUsername] = useState(initialPortalType === 'admin' ? 'admin' : 'sales_op');
  const [password, setPassword] = useState(
    initialPortalType === 'admin' ? 'Admin@123' : 'Staff@123'
  );
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [helpNotice, setHelpNotice] = useState<string | null>(null);

  const switchPortal = (target: 'admin' | 'staff') => {
    setPortalType(target);
    setError(null);
    setHelpNotice(null);
    if (target === 'admin') {
      setUsername('admin');
      setPassword('Admin@123');
    } else if (username === 'admin') {
      setUsername('sales_op');
      setPassword('Staff@123');
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setHelpNotice(null);

    if (!username.trim() || !password.trim()) {
      setError('Please enter both your username and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password,
          portalType,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid credentials');
      }
      onLoginSuccess(data.token, data.user);
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const cred = await signInWithPopup(auth, googleAuthProvider);
      const idToken = await cred.user.getIdToken();
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to verify Google account');
      }
      onLoginSuccess(idToken, data.user);
    } catch (err: any) {
      setError(err.message || 'Google Sign-In was cancelled or failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#061020] via-[#0B1D3A] to-[#08152B] text-white flex flex-col justify-between p-4 sm:p-8">
      <div className="max-w-[1400px] w-full mx-auto my-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Showcase Column matching Reference 2 */}
        <div className="lg:col-span-7 space-y-6 pr-0 lg:pr-6">
          {/* Top Brand + Partner Tagline */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={onBackToHome}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-medium text-slate-200 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Storefront</span>
              </button>
              <BrandLogo theme="dark" size="lg" storeName={storeName} />
            </div>
            <div className="hidden sm:block text-right">
              <span className="text-sm italic text-slate-300 border-b border-[#0066FF] pb-1">
                Your Trusted Mobile Partner
              </span>
            </div>
          </div>

          {/* Main Headline */}
          <div className="space-y-3 pt-2">
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
              Smart Mobile Business
              <br />
              <span className="text-[#2589FF]">Management System</span>
            </h1>
            <p className="text-slate-300 text-base sm:text-lg max-w-xl leading-relaxed">
              Track purchases, manage stock, generate bills, calculate profit &amp; loss — all in one place.
            </p>
          </div>

          {/* 5 Feature Icon Boxes matching Reference 2 */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
            {[
              { icon: ShoppingCart, l1: 'Purchase', l2: 'Management' },
              { icon: ScanBarcode, l1: 'IMEI', l2: 'Tracking' },
              { icon: FileText, l1: 'Sales &', l2: 'Billing' },
              { icon: Boxes, l1: 'Inventory', l2: 'Control' },
              { icon: BarChart3, l1: 'Reports &', l2: 'Analytics' },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.l1 + item.l2}
                  className="flex flex-col items-start p-3 rounded-xl bg-white/[0.04] border border-white/10"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#0066FF]/20 border border-[#0066FF]/40 text-[#38BDF8] flex items-center justify-center mb-2">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold text-white leading-tight">
                    {item.l1}
                    <br />
                    {item.l2}
                  </span>
                </div>
              );
            })}
          </div>

          {/* 4 Flagship Phones on Stage + "Better Stock Better Business" Script */}
          <div className="relative pt-4 pb-2 flex items-center justify-start gap-8">
            <div className="relative flex items-end justify-center pt-4 pb-6 px-6">
              {/* Phone 1 */}
              <div className="w-24 sm:w-28 h-48 sm:h-54 rounded-2xl bg-gradient-to-b from-[#6E6878] to-[#3B3642] border-2 border-slate-400 shadow-2xl -mr-4 transform -rotate-3 p-2.5 flex flex-col justify-between z-10">
                <div className="w-9 h-9 rounded-xl bg-slate-900/90 p-1 grid grid-cols-2 gap-1">
                  <span className="rounded-full bg-slate-600" />
                  <span className="rounded-full bg-slate-600" />
                  <span className="rounded-full bg-slate-600" />
                </div>
                <div className="text-[10px] font-bold text-slate-300 text-center">iPhone Pro</div>
              </div>
              {/* Phone 2 */}
              <div className="w-24 sm:w-28 h-48 sm:h-54 rounded-2xl bg-gradient-to-b from-[#333A48] to-[#191E28] border-2 border-slate-500 shadow-2xl -mr-4 p-2.5 flex flex-col justify-between z-20">
                <div className="flex flex-col gap-1">
                  <span className="w-3 h-3 rounded-full bg-slate-800 border border-slate-400" />
                  <span className="w-3 h-3 rounded-full bg-slate-800 border border-slate-400" />
                  <span className="w-3 h-3 rounded-full bg-slate-800 border border-slate-400" />
                </div>
                <div className="text-[10px] font-bold text-slate-400 text-center">SAMSUNG</div>
              </div>
              {/* Phone 3 */}
              <div className="w-24 sm:w-28 h-48 sm:h-54 rounded-2xl bg-gradient-to-b from-slate-100 to-slate-300 border-2 border-white shadow-2xl -mr-4 p-2.5 flex flex-col justify-between z-30">
                <div className="flex flex-col gap-1">
                  <span className="w-3 h-3 rounded-full bg-slate-800" />
                  <span className="w-3 h-3 rounded-full bg-slate-800" />
                </div>
                <div className="text-[10px] font-bold text-slate-700 text-center">5G SERIES</div>
              </div>
              {/* Phone 4 (Front Display) */}
              <div className="w-26 sm:w-30 h-48 sm:h-54 rounded-2xl bg-gradient-to-tr from-blue-700 via-sky-400 to-pink-300 border-2 border-slate-900 shadow-2xl p-2.5 flex flex-col justify-between z-40">
                <div className="w-6 h-1 bg-slate-900 rounded-full mx-auto" />
                <div className="text-center text-white drop-shadow">
                  <div className="text-[11px] font-extrabold">T MOBILES</div>
                  <div className="text-[9px]">IMEI STOCK</div>
                </div>
                <div className="w-8 h-1 bg-white/80 rounded-full mx-auto" />
              </div>

              {/* Podium base */}
              <div className="absolute bottom-0 inset-x-0 h-8 rounded-full bg-gradient-to-r from-[#091528] via-[#1E40AF] to-[#091528] border-t border-sky-400/60 shadow-[0_8px_30px_rgba(0,102,255,0.45)]" />
            </div>

            <div className="hidden sm:block transform -rotate-6">
              <p className="text-xl font-bold italic text-sky-400 leading-snug">
                Better
                <br />
                Stock
                <br />
                Better
                <br />
                Business
              </p>
              <div className="w-20 h-1 bg-[#0066FF] rounded-full mt-1" />
            </div>
          </div>

          {/* Bottom 3 Trust Badges matching Reference 2 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full border border-sky-400/50 flex items-center justify-center text-sky-400 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Secure &amp; Reliable</div>
                <div className="text-[11px] text-slate-400">Your data is always protected</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full border border-sky-400/50 flex items-center justify-center text-sky-400 shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Easy to Use</div>
                <div className="text-[11px] text-slate-400">Simple. Fast. Efficient.</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full border border-sky-400/50 flex items-center justify-center text-sky-400 shrink-0">
                <Headphones className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">24/7 Support</div>
                <div className="text-[11px] text-slate-400">We are always here for you</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right White Login Card matching Reference 2 */}
        <div className="lg:col-span-5">
          <div className="bg-white text-slate-900 rounded-3xl shadow-2xl p-6 sm:p-9 border border-slate-100 max-w-lg mx-auto">
            <div className="flex flex-col items-center text-center mb-6">
              <BrandLogo theme="light" size="lg" storeName={storeName} />
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0A1628] mt-5">
                Welcome Back!
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Login to your account and continue
              </p>
            </div>

            {/* Two Login Entry Points: Admin Login | Staff Login */}
            <div
              role="tablist"
              aria-label="Login Portal Type"
              className="grid grid-cols-2 p-1.5 bg-slate-100 rounded-xl mb-5"
            >
              <button
                type="button"
                role="tab"
                aria-selected={portalType === 'admin'}
                onClick={() => switchPortal('admin')}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-bold transition-all ${
                  portalType === 'admin'
                    ? 'bg-[#0066FF] text-white shadow-md'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Admin Login</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={portalType === 'staff'}
                onClick={() => switchPortal('staff')}
                className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-bold transition-all ${
                  portalType === 'staff'
                    ? 'bg-[#0066FF] text-white shadow-md'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Staff Login</span>
              </button>
            </div>

            {error && (
              <div
                role="alert"
                className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold"
              >
                {error}
              </div>
            )}

            {helpNotice && (
              <div className="mb-4 p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-medium">
                {helpNotice}
              </div>
            )}

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label htmlFor="login-username" className="sr-only">
                  Username
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    id="login-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Username"
                    autoComplete="username"
                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="login-password" className="sr-only">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    autoComplete="current-password"
                    className="w-full pl-11 pr-11 py-3 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-6 rounded-xl bg-[#0066FF] hover:bg-blue-700 disabled:opacity-60 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <ArrowRight className="w-4 h-4" />
                <span>{loading ? 'Signing in...' : 'Login'}</span>
              </button>

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="inline-flex items-center gap-2 text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 text-[#0066FF] focus:ring-[#0066FF]"
                  />
                  <span>Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setHelpNotice(
                      'For security, password resets are managed by the T Mobiles Super Admin under User Management. Default Super Admin: admin / Admin@123.'
                    )
                  }
                  className="text-[#0066FF] font-semibold hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            </form>

            <div className="relative my-5 flex items-center justify-center">
              <div className="border-t border-slate-200 w-full" />
              <span className="bg-white px-3 text-[11px] font-semibold text-slate-400 uppercase">
                OR
              </span>
              <div className="border-t border-slate-200 w-full" />
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => switchPortal(portalType === 'admin' ? 'staff' : 'admin')}
                className="w-full py-2.5 px-4 rounded-xl border border-blue-200 bg-blue-50/40 hover:bg-blue-50 text-xs font-semibold text-[#0066FF] flex items-center justify-center gap-2 transition-colors"
              >
                <Shield className="w-4 h-4" />
                <span>
                  {portalType === 'admin'
                    ? 'Staff Login (Employee / Manager / Secretary)'
                    : 'Switch to Super Admin Login'}
                </span>
              </button>

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center justify-center gap-2 transition-colors"
              >
                <span>Sign in with Verified Google Account</span>
              </button>
            </div>

            {/* Quick Role Selector for Testing RBAC Accounts */}
            <div className="mt-5 pt-4 border-t border-slate-100">
              <div className="text-[11px] font-semibold text-slate-500 mb-2">
                Quick Role Fill (Click to populate credentials):
              </div>
              <div className="flex flex-wrap gap-1.5">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.username}
                    type="button"
                    onClick={() => {
                      setPortalType(acc.portal);
                      setUsername(acc.username);
                      setPassword(acc.pass);
                      setError(null);
                    }}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                      username === acc.username
                        ? 'bg-[#0A1628] text-white border-[#0A1628]'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {acc.label} ({acc.username})
                  </button>
                ))}
              </div>
            </div>

            {/* Authorized Users Notice matching Reference 2 */}
            <div className="mt-5 p-3.5 rounded-xl bg-[#F0F7FF] border border-blue-100 flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#0066FF] text-white flex items-center justify-center shrink-0 mt-0.5">
                <Info className="w-3.5 h-3.5" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-slate-800">
                  This system is for authorized users only.
                </div>
                <div className="text-[11px] text-slate-600">
                  Unauthorized access is strictly prohibited.
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-lg mx-auto mt-3 flex items-center justify-between text-[11px] text-slate-400 px-2">
            <span>© {new Date().getFullYear()} {storeName}. All rights reserved.</span>
            <span>Mobile Store Management System</span>
          </div>
        </div>
      </div>
    </div>
  );
};
