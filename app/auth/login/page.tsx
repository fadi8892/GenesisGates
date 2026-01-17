"use client";

import { useState } from 'react';
import { signInWithMagicLink } from '@/lib/auth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signInWithMagicLink(email);
    setLoading(false);
    if (error) {
      setMessage(error.message);
    } else {
      setMessage('Check your email for the login link!');
      setEmail('');
    }
  };
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <div className="max-w-md w-full p-8 bg-white border border-gray-200 rounded-xl backdrop-blur-xl shadow-xl text-gray-900">
        <h1 className="text-2xl font-bold mb-4">Sign in to Genesis Gates</h1>
        <p className="mb-6 text-sm text-gray-600">
          Enter your email and we'll send you a magic link. No passwords required.
        </p>
        <form onSubmit={handleSend} className="space-y-4">
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-2 rounded-lg bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 rounded-full bg-accent text-white font-medium hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send magic link'}
          </button>
        </form>
        {message && <p className="mt-4 text-sm text-accent">{message}</p>}
      </div>
    </div>
  );
}