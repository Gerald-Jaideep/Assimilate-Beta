import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { LogIn, Mail, Lock, UserPlus, ArrowRight, ShieldCheck, Github, Chrome } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Login() {
  const { user, signIn, signInEmail, signUpEmail, loading } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  if (loading) return null;
  if (user) return <Navigate to="/" />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setAuthLoading(true);
    try {
      if (mode === 'signup') {
        await signUpEmail(email, password);
        setVerificationSent(true);
      } else {
        await signInEmail(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication');
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="min-h-screen -mt-16 flex items-center justify-center p-4">
      <div className="max-w-[1000px] w-full grid grid-cols-1 md:grid-cols-2 bg-[#12141D] rounded-[40px] overflow-hidden shadow-2xl border border-white/5">
        
        {/* Left Side: Visual/Context */}
        <div className="hidden md:flex flex-col justify-between p-12 bg-gradient-to-br from-blue-600 to-indigo-900 relative overflow-hidden text-white">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
          <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-white/20 rounded-full blur-3xl animate-pulse" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-8">
              <img 
                src="https://firebasestorage.googleapis.com/v0/b/assimilate-live.firebasestorage.app/o/logo%2FAssimilate.svg?alt=media" 
                className="h-10 w-auto brightness-200" 
                alt="assimilate logo" 
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://api.dicebear.com/7.x/initials/svg?seed=A&backgroundColor=white';
                }}
              />
              <span className="text-3xl font-bold text-white tracking-tighter lowercase">assimilate</span>
            </div>
            <h1 className="text-5xl font-black tracking-tighter leading-[0.9] mb-4 lowercase">
              the future<br />of medicine
            </h1>
            <p className="text-blue-100 font-medium max-w-xs lowercase">
              the professional ecosystem for virtual clinical education and professional growth.
            </p>
          </div>

          <div className="relative z-10 space-y-6">
            <div className="flex -space-x-3">
              {[1, 2, 3, 4].map(i => (
                <img key={i} src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`} className="w-10 h-10 rounded-full border-2 border-white/20 bg-blue-500/20" alt="Specialist" />
              ))}
              <div className="w-10 h-10 rounded-full border-2 border-white/20 bg-white/10 backdrop-blur-md flex items-center justify-center text-[10px] font-bold">+12k</div>
            </div>
            <p className="text-xs font-bold text-blue-200 lowercase tracking-widest">joined by leading clinicians worldwide</p>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="p-8 md:p-12 space-y-8 bg-[#12141D]">
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-white tracking-tight lowercase">
                {verificationSent ? 'check your email' : mode === 'signin' ? 'welcome back' : 'create account'}
              </h2>
              <p className="text-sm text-white/40 font-medium lowercase">
                {verificationSent 
                  ? 'we sent a link to verify your identity.' 
                  : mode === 'signin' ? 'sign in to your professional portal.' : 'start your clinical learning journey today.'}
              </p>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {!verificationSent ? (
              <motion.div 
                key="form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/40 lowercase tracking-widest ml-1">work email</label>
                    <div className="relative group">
                       <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-blue-500 transition-colors" size={18} />
                       <input 
                         type="email"
                         required
                         value={email}
                         onChange={e => setEmail(e.target.value)}
                         placeholder="you@hospital.com"
                         className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium"
                       />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/40 lowercase tracking-widest ml-1">password</label>
                    <div className="relative group">
                       <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-blue-500 transition-colors" size={18} />
                       <input 
                         type="password"
                         required
                         value={password}
                         onChange={e => setPassword(e.target.value)}
                         placeholder="••••••••"
                         className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium"
                       />
                    </div>
                  </div>

                  {error && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-rose-500 text-xs font-bold tracking-tight">
                      {error}
                    </motion.p>
                  )}

                  <button 
                    type="submit"
                    disabled={authLoading}
                    className="w-full bg-white text-black py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-xl disabled:opacity-50 lowercase"
                  >
                    {authLoading ? 'processing...' : mode === 'signin' ? 'sign in' : 'create account'}
                    <ArrowRight size={18} />
                  </button>
                </form>

                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/5"></div></div>
                  <div className="relative flex justify-center text-[10px] items-center"><span className="bg-[#12141D] px-4 text-white/20 font-bold lowercase tracking-widest">or access via</span></div>
                </div>

                <button 
                  onClick={signIn}
                  className="w-full flex items-center justify-center gap-3 bg-white/5 border border-white/10 py-4 rounded-2xl font-bold text-white hover:bg-white/10 transition-all group lowercase"
                >
                  <Chrome size={20} />
                  google workspace
                </button>

                <div className="text-center pt-4">
                   <button 
                    onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                    className="text-xs font-bold text-blue-500 lowercase tracking-widest hover:text-blue-400 transition-colors"
                  >
                    {mode === 'signin' ? "don't have an account? sign up" : "already have an account? sign in"}
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="verification"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-6 pt-8"
              >
                <div className="w-20 h-20 bg-emerald-500/20 text-emerald-500 rounded-3xl flex items-center justify-center mx-auto scale-110 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                  <ShieldCheck size={40} />
                </div>
                <div className="space-y-4">
                  <p className="text-white/60 text-sm leading-relaxed max-w-sm mx-auto font-medium lowercase">
                    please check {email} to verify your account. once verified, you'll be able to complete your professional profile.
                  </p>
                  <button 
                    onClick={() => setVerificationSent(false)}
                    className="text-white/20 hover:text-white text-[10px] font-bold lowercase tracking-widest transition-colors"
                  >
                    resend link or back
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-[10px] text-white/20 text-center font-medium leading-relaxed">
            By continuing, you agree to Assimilate's <br />
            <span className="text-white/40 cursor-pointer hover:text-white">Professional Terms of Service</span> and <span className="text-white/40 cursor-pointer hover:text-white">Privacy Policy</span>.
          </p>
        </div>

      </div>
    </div>
  );
}

