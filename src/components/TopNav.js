'use client';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function TopNav({ variant = 'default' }) {
  const { user, userProfile, signOut } = useAuth();

  if (variant === 'minimal') {
    return (
      <header className="bg-white/90 backdrop-blur-md sticky top-0 z-50 border-b border-slate-200 shadow-sm">
        <div className="max-w-[1280px] mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Link href="/" className="text-xl font-bold text-[#0623bb]">SkillProof</Link>
          </div>
        </div>
      </header>
    );
  }

  // On the landing page variant, always show Login + Get Started
  const showAuthButtons = variant === 'landing' || !user;

  return (
    <header className="bg-white/90 backdrop-blur-md sticky top-0 z-50 border-b border-slate-200 shadow-sm">
      <div className="flex justify-between items-center w-full px-6 py-4 max-w-[1280px] mx-auto">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-xl font-bold text-slate-900">SkillProof</Link>
          <nav className="hidden md:flex gap-6">
            <Link className="text-sm font-medium text-slate-500 hover:text-indigo-700 transition-colors" href="/tasks">
              Marketplace
            </Link>
            <Link className="text-sm font-medium text-slate-500 hover:text-indigo-700 transition-colors" href="/leaderboard">
              Leaderboard
            </Link>
            <Link className="text-sm font-medium text-slate-500 hover:text-indigo-700 transition-colors" href="/help">
              Resources
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {showAuthButtons ? (
            <>
              <Link href="/login" className="text-slate-600 hover:text-indigo-600 font-medium text-sm transition-colors">
                Login
              </Link>
              <Link
                href="/register"
                className="bg-[#0623bb] text-white px-6 py-2 rounded-lg font-medium text-sm hover:opacity-90 active:scale-95 transition-all"
              >
                Get Started
              </Link>
            </>
          ) : (
            <>
              <Link href="/notifications" className="p-2 text-slate-500 hover:text-indigo-600 transition-colors">
                <span className="material-symbols-outlined">notifications</span>
              </Link>
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                  {userProfile?.displayName?.charAt(0) || 'U'}
                </div>
                <span className="text-sm font-medium text-slate-700">{userProfile?.displayName || 'Profile'}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

