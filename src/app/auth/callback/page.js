'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Suspense } from 'react';

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Check if this is a Firebase email link sign-in
        if (isSignInWithEmailLink(auth, window.location.href)) {
          let email = window.localStorage.getItem('emailForSignIn');

          if (!email) {
            // If email is missing (e.g. opened on different device), prompt
            email = window.prompt('Please provide your email for confirmation');
          }

          if (!email) {
            router.push('/login');
            return;
          }

          // Complete the sign-in
          const result = await signInWithEmailLink(auth, email, window.location.href);
          window.localStorage.removeItem('emailForSignIn');

          const role = searchParams.get('role');

          if (role) {
            // New registration flow — redirect to onboarding
            router.push(`/onboarding?role=${role}`);
          } else {
            // Existing user login — check their role from Firestore
            try {
              const userDoc = await getDoc(doc(db, 'users', result.user.uid));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                if (userData.role === 'company') {
                  router.push('/company/dashboard');
                } else {
                  router.push('/dashboard');
                }
              } else {
                router.push('/dashboard');
              }
            } catch {
              router.push('/dashboard');
            }
          }
        } else {
          // Not a valid email link — check if user is already signed in
          if (auth.currentUser) {
            router.push('/dashboard');
          } else {
            router.push('/login');
          }
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        setError(err.message || 'Authentication failed');
        setTimeout(() => router.push('/login'), 3000);
      }
    };

    handleCallback();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#faf8ff]">
      <div className="flex flex-col items-center gap-4">
        {error ? (
          <>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-red-600 text-2xl">error</span>
            </div>
            <p className="text-sm font-medium text-red-600">{error}</p>
            <p className="text-xs text-slate-500">Redirecting to login...</p>
          </>
        ) : (
          <>
            <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            <p className="text-sm font-medium text-slate-500">
              Verifying your identity...
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#faf8ff]">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  );
}
