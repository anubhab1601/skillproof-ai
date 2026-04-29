'use client';
import Link from 'next/link';
import { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError('');
    try {
      await sendPasswordResetEmail(auth, email);
      setSent(true);
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        setError('No account found with this email.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many attempts. Try again later.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else {
        setError(err.message || 'Failed to send reset email.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#faf8ff] items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-black text-[#0623bb]">SkillProof</Link>
        </div>
        <div className="bg-white border border-[#c5c5d7]/30 rounded-xl p-8 shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
          {!sent ? (
            <>
              <h1 className="text-2xl font-bold text-[#131b2e] mb-2">Reset your password</h1>
              <p className="text-sm text-[#454655] mb-6">Enter your email and we&apos;ll send you a reset link.</p>
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <input className="w-full px-4 py-3 bg-[#eaedff] border border-[#c5c5d7] rounded-lg focus:ring-2 focus:ring-[#0623bb] transition-all outline-none"
                  placeholder="Email Address" type="email" value={email} onChange={e => setEmail(e.target.value)} required disabled={loading} />
                <button className="w-full py-3 bg-[#0623bb] text-white font-semibold rounded-lg hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  type="submit" disabled={loading}>
                  {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-emerald-600 text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>mail</span>
              </div>
              <h2 className="text-xl font-bold text-[#131b2e]">Check your inbox</h2>
              <p className="text-sm text-[#454655]">We&apos;ve sent a password reset link to <strong>{email}</strong></p>
              <p className="text-xs text-[#757686]">Didn&apos;t receive it? Check your spam folder or
                <button onClick={() => { setSent(false); setError(''); }} className="text-[#0623bb] font-semibold hover:underline ml-1">try again</button>
              </p>
            </div>
          )}
          <div className="mt-6 text-center">
            <Link href="/login" className="text-sm text-[#0623bb] font-semibold hover:underline">← Back to login</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
