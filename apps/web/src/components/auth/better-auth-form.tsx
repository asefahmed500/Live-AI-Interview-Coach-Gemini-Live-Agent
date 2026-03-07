'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useBetterAuthStore } from '@/store/use-better-auth-store';
import { Loader2, Mail, Lock, User, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';

/**
 * Better Auth Form Component
 *
 * This component uses Better Auth for authentication.
 * It provides login and registration functionality with a toggle between modes.
 */
export function BetterAuthForm() {
  const router = useRouter();
  const { login, register, isLoading } = useBetterAuthStore();
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      if (isLogin) {
        await login(email, password);
        router.push('/dashboard');
      } else {
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          return;
        }

        await register(name, email, password);
        router.push('/dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 overflow-hidden relative" style={{ background: 'oklch(1.00 0 0)' }}>
      {/* Subtle Background Gradient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-[#2383e2]/3 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-gradient-to-t from-[#2383e2]/3 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-md mb-4 shadow-notion" style={{ background: 'oklch(0.97 0 0)', border: '1px solid oklch(0.92 0 0)' }}>
            <Sparkles className="w-5 h-5" style={{ color: 'oklch(0.40 0 0)' }} />
          </div>
          <h1 className="text-xl font-medium mb-2 tracking-tight" style={{ color: 'oklch(0.20 0 0)' }}>
            {isLogin ? 'Welcome back' : 'Create account'}
          </h1>
          <p className="text-sm" style={{ color: 'oklch(0.50 0 0)' }}>
            {isLogin ? 'Sign in to continue to Interview Coach' : 'Start your interview practice journey'}
          </p>
        </div>

        {/* Form Card */}
        <div className="backdrop-blur-xl rounded-md p-6 shadow-notion-lg" style={{ background: 'oklch(1.00 0 0)', border: '1px solid oklch(0.92 0 0)' }}>
          {error && (
            <div className="mb-5 p-3 rounded-md flex items-start gap-3" style={{ background: 'oklch(0.97 0 0)', border: '1px solid oklch(0.92 0 0)' }}>
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'oklch(0.40 0 0)' }} />
              <span className="text-sm" style={{ color: 'oklch(0.40 0 0)' }}>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-1.5">
                <label htmlFor="name" className="block text-xs font-medium" style={{ color: 'oklch(0.50 0 0)' }}>
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'oklch(0.60 0 0)' }} />
                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required={!isLogin}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    className="input input-with-icon"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-xs font-medium" style={{ color: 'oklch(0.50 0 0)' }}>
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'oklch(0.60 0 0)' }} />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="input input-with-icon"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-xs font-medium" style={{ color: 'oklch(0.50 0 0)' }}>
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'oklch(0.60 0 0)' }} />
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input input-with-icon"
                />
              </div>
            </div>

            {!isLogin && (
              <div className="space-y-1.5">
                <label htmlFor="confirmPassword" className="block text-xs font-medium" style={{ color: 'oklch(0.50 0 0)' }}>
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'oklch(0.60 0 0)' }} />
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required={!isLogin}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input input-with-icon"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 font-medium rounded-md transition-all shadow-notion flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed hover:shadow-notion-md"
              style={{ background: 'oklch(0.97 0 0)', color: 'oklch(0.20 0 0)', border: '1px solid oklch(0.92 0 0)' }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Please wait...</span>
                </>
              ) : (
                <>
                  <span>{isLogin ? 'Continue' : 'Create account'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Toggle */}
          <div className="mt-5 text-center">
            <p className="text-sm" style={{ color: 'oklch(0.50 0 0)' }}>
              {isLogin ? "Don't have an account?" : 'Already have an account?'}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError(null);
                }}
                className="ml-1 font-medium transition-all hover-notion rounded-md px-1.5 py-0.5"
                style={{ color: 'oklch(0.20 0 0)' }}
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs mt-6" style={{ color: 'oklch(0.60 0 0)' }}>
          By continuing, you agree to our{' '}
          <a href="#" className="transition-all hover-notion rounded-md px-1 py-0.5" style={{ color: 'oklch(0.40 0 0)' }}>
            Terms
          </a>{' '}
          and{' '}
          <a href="#" className="transition-all hover-notion rounded-md px-1 py-0.5" style={{ color: 'oklch(0.40 0 0)' }}>
            Privacy Policy
          </a>
        </p>
      </div>
    </div>
  );
}
