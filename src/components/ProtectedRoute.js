'use client';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

// Admin UID — hardcoded for security
const ADMIN_UID = 'crNoGP1j7RXy5xGraa92PJNFwU43';

export default function ProtectedRoute({ role, children }) {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    // Not logged in → go to login
    if (!user) {
      router.push('/login');
      return;
    }

    // User profile loaded — check role and onboarding
    if (userProfile) {
      const isAdmin = user.uid === ADMIN_UID || userProfile.role === 'admin';

      // Admin can access any page
      if (isAdmin) return;

      // Wrong role → redirect to their correct dashboard
      if (role && role !== 'admin' && userProfile.role !== role) {
        if (userProfile.role === 'company') {
          router.push('/company/dashboard');
        } else {
          router.push('/dashboard');
        }
        return;
      }

      // Non-admin trying to access admin page
      if (role === 'admin' && !isAdmin) {
        if (userProfile.role === 'company') {
          router.push('/company/dashboard');
        } else {
          router.push('/dashboard');
        }
        return;
      }

      // Onboarding not complete and not already on onboarding page
      if (!userProfile.onboardingComplete && !pathname.startsWith('/onboarding')) {
        router.push(`/onboarding?role=${userProfile.role}`);
        return;
      }
    }
  }, [user, userProfile, loading, role, router, pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#faf8ff]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#0623bb]/20 border-t-[#0623bb] rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // For admin role check
  if (role === 'admin') {
    const isAdmin = user.uid === ADMIN_UID || userProfile?.role === 'admin';
    if (!isAdmin) return null;
  } else if (role && userProfile?.role !== role) {
    // Also allow admin to view any role's page
    const isAdmin = user.uid === ADMIN_UID || userProfile?.role === 'admin';
    if (!isAdmin) return null;
  }

  return children;
}
