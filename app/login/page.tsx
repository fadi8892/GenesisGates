'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Wallet, CheckCircle, Loader2, Lock, Mail, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [view, setView] = useState<'sign-in' | 'sign-up'>('sign-in'); // Toggle between login/signup
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const router = useRouter();
  const supabase = createClient();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (view === 'sign-in') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push('/dashboard');
        router.refresh();
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        setMessage({ type: 'success', text: 'Account created! Please check your email to verify.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 relative overflow-hidden">
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-[100px]" />
      
      <div className="glass-panel w-full max-w-md p-8 relative z-10">
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-900 flex items-center gap-2 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
        
        <h2 className="text-2xl font-bold mb-2">
          {view === 'sign-in' ? 'Welcome Back' : 'Create Account'}
        </h2>
        <p className="text-gray-600 mb-8">
          {view === 'sign-in' 
            ? 'Enter your credentials to access your account.' 
            : 'Sign up to start building your family tree.'}
        </p>

        <form onSubmit={handleAuth} className="space-y-4">
          {/* Email Input */}
          <div className="relative">
            <Mail className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
            <input 
              type="email" 
              placeholder="name@example.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-50 border border-gray-300 rounded-lg pl-10 pr-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-accent transition-colors"
              required
            />
          </div>

          {/* Password Input */}
          <div className="relative">
            <Lock className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
            <input 
              type="password" 
              placeholder="Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-50 border border-gray-300 rounded-lg pl-10 pr-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-accent transition-colors"
              required
              minLength={6}
            />
          </div>
          
          {/* Error/Success Message */}
          {message && (
            <div className={`p-3 rounded-lg text-sm flex items-start gap-2 ${
              message.type === 'success' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'
            }`}>
              {message.type === 'success' ? <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
              {message.text}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-accent text-white font-bold py-3 rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (view === 'sign-in' ? 'Sign In' : 'Sign Up')}
          </button>
        </form>

        {/* Toggle View */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            {view === 'sign-in' ? "Don't have an account? " : "Already have an account? "}
            <button 
              onClick={() => {
                setView(view === 'sign-in' ? 'sign-up' : 'sign-in');
                setMessage(null);
              }}
              className="text-accent hover:text-accent-hover font-bold hover:underline"
            >
              {view === 'sign-in' ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </div>
        
        <div className="mt-6 pt-6 border-t border-gray-200 text-center">
            <button className="text-sm text-gray-600 hover:text-gray-900 flex items-center justify-center gap-2 mx-auto w-full py-2 hover:bg-gray-100 rounded transition-colors">
                <Wallet className="w-4 h-4" /> Connect Wallet (Coming Soon)
            </button>
        </div>
      </div>
    </div>
  );
}