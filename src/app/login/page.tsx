'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';
import { 
  BrainCircuit, 
  Mail, 
  Lock, 
  User as UserIcon, 
  ArrowLeft, 
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  // Tab states: 'login' | 'signup' | 'forgot'
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  
  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  
  // Status states
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  const handleOAuthLogin = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      setSuccessMsg('Simulating Google Sign-In with Demo Account...');
      
      const email = 'google-demo@university.edu';
      const password = 'DemoPassword123';
      
      // Try to sign in first
      let { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error && (error.message.includes('Invalid login credentials') || error.message.includes('Email not confirmed'))) {
        // Automatically register the demo Google user
        const signUpRes = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: 'Google Demo User',
              avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80',
            }
          }
        });

        if (signUpRes.error) throw signUpRes.error;

        // Try signing in again
        const signInRes = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInRes.error) throw signInRes.error;
      } else if (error) {
        throw error;
      }
    } catch (err: any) {
      console.error('Google Sign-In Simulation error:', err);
      setErrorMsg(err.message || 'Simulated Google authentication failed.');
      setLoading(false);
      setSuccessMsg('');
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
        router.push('/dashboard');
      } else if (mode === 'signup') {
        if (!name.trim()) {
          throw new Error('Please enter your name.');
        }
        const { error, data } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name,
              full_name: name
            }
          }
        });
        if (error) throw error;

        // If email verification is active, show confirmation
        if (data.session) {
          router.push('/dashboard');
        } else {
          setSuccessMsg('Verification email sent! Please check your inbox.');
          // Reset fields
          setName('');
          setEmail('');
          setPassword('');
        }
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/login?mode=reset`
        });
        if (error) throw error;
        setSuccessMsg('Password reset link sent to your email.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication operation failed.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 bg-grid">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <p className="text-sm font-semibold">Initializing FlashMind AI...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 px-6 lg:px-8 relative overflow-hidden bg-grid">
      
      {/* Background Glows */}
      <div className="absolute top-[20%] left-[20%] w-[350px] h-[350px] bg-primary/10 rounded-full blur-[100px] pointer-events-none animate-float-slow" />
      <div className="absolute bottom-[20%] right-[20%] w-[350px] h-[350px] bg-secondary/10 rounded-full blur-[100px] pointer-events-none animate-float-reverse" />

      {/* Back button */}
      <div className="absolute top-8 left-8">
        <Link href="/" className="flex items-center text-sm font-medium text-slate-400 hover:text-slate-200 transition">
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back to Home
        </Link>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="flex flex-col items-center">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20 mb-4">
            <BrainCircuit className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-center text-3xl font-extrabold tracking-tight text-white">
            {mode === 'login' && 'Sign in to FlashMind AI'}
            {mode === 'signup' && 'Create your account'}
            {mode === 'forgot' && 'Reset your password'}
          </h2>
          <p className="mt-2 text-center text-sm text-slate-400">
            {mode === 'login' && (
              <>
                New student?{' '}
                <button onClick={() => { setMode('signup'); setErrorMsg(''); setSuccessMsg(''); }} className="font-semibold text-primary hover:text-primary-hover underline">
                  Sign up free
                </button>
              </>
            )}
            {mode === 'signup' && (
              <>
                Already have an account?{' '}
                <button onClick={() => { setMode('login'); setErrorMsg(''); setSuccessMsg(''); }} className="font-semibold text-primary hover:text-primary-hover underline">
                  Sign in here
                </button>
              </>
            )}
            {mode === 'forgot' && (
              <button onClick={() => { setMode('login'); setErrorMsg(''); setSuccessMsg(''); }} className="font-semibold text-primary hover:text-primary-hover underline">
                Return to sign in
              </button>
            )}
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="glass py-8 px-6 sm:px-10 rounded-2xl shadow-xl border-white/5">
          
          {errorMsg && (
            <div className="mb-5 p-4 rounded-lg bg-red-950/30 border border-red-500/20 text-red-300 text-sm flex gap-2">
              <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 p-4 rounded-lg bg-emerald-950/30 border border-emerald-500/20 text-emerald-300 text-sm flex gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleEmailAuth}>
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <UserIcon className="h-4.5 w-4.5" />
                  </span>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-white/10 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary text-white text-sm outline-none transition"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <Mail className="h-4.5 w-4.5" />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@university.edu"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-white/10 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary text-white text-sm outline-none transition"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                    Password
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => { setMode('forgot'); setErrorMsg(''); setSuccessMsg(''); }}
                      className="text-xs font-semibold text-primary hover:text-primary-hover"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <Lock className="h-4.5 w-4.5" />
                  </span>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-white/10 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary text-white text-sm outline-none transition"
                  />
                </div>
              </div>
            )}

            {mode === 'login' && (
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 bg-slate-900 border border-white/10 rounded text-primary focus:ring-primary focus:ring-offset-slate-900"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-400 font-medium">
                  Remember me
                </label>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary hover:bg-primary-hover text-white text-sm font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === 'login' && 'Sign In'}
              {mode === 'signup' && 'Sign Up'}
              {mode === 'forgot' && 'Send Reset Link'}
            </button>
          </form>

          {/* Divider */}
          <div className="mt-6 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/5" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="px-2 bg-slate-800 text-slate-400 font-bold">Or continue with</span>
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={handleOAuthLogin}
              disabled={loading}
              className="w-full py-2.5 border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 text-sm font-semibold rounded-xl flex items-center justify-center gap-2.5 transition"
            >
              <svg className="h-4.5 w-4.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Sign in with Google
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
