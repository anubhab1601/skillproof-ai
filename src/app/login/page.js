"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, googleProvider } from "@/lib/firebase";

// Admin UID — hardcoded for security (only this UID gets /admin access)
const ADMIN_UID = 'crNoGP1j7RXy5xGraa92PJNFwU43';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Helper: after Firebase signIn, look up role from Firestore and redirect
  const redirectByRole = async (firebaseUser) => {
    try {
      // Admin shortcut — check UID first
      if (firebaseUser.uid === ADMIN_UID) {
        // Ensure admin profile exists in Firestore
        const adminDocRef = doc(db, "users", firebaseUser.uid);
        const adminDoc = await getDoc(adminDocRef);
        if (!adminDoc.exists()) {
          await setDoc(adminDocRef, {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || 'Admin',
            role: 'admin',
            onboardingComplete: true,
            isActive: true,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
        router.push("/admin");
        return;
      }

      const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
      if (userDoc.exists()) {
        const profile = userDoc.data();
        // Also check admin role from Firestore
        if (profile.role === "admin") {
          router.push("/admin");
        } else if (!profile.onboardingComplete) {
          router.push(`/onboarding?role=${profile.role}`);
        } else if (profile.role === "company") {
          router.push("/company/dashboard");
        } else {
          router.push("/dashboard");
        }
      } else {
        router.push("/dashboard");
      }
    } catch {
      router.push("/dashboard");
    }
  };

  // ─── Google Sign-In ──────────────────────────────────────────
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError("");
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;

      // Check if user profile exists in Firestore
      const userDocRef = doc(db, "users", firebaseUser.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        // New Google user — create profile via backend
        const idToken = await firebaseUser.getIdToken();
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/create-profile`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${idToken}`,
            },
            body: JSON.stringify({
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || '',
              photoURL: firebaseUser.photoURL || '',
              role: 'candidate', // Default role for Google sign-in
              phone: firebaseUser.phoneNumber || '',
            }),
          }
        );

        if (!res.ok) {
          // If backend profile creation fails, still redirect to onboarding
          console.warn('Backend profile creation failed, proceeding with basic profile');
          await setDoc(userDocRef, {
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || '',
            photoURL: firebaseUser.photoURL || '',
            role: 'candidate',
            onboardingComplete: false,
            createdAt: serverTimestamp(),
          });
        }
      }

      await redirectByRole(firebaseUser);
    } catch (err) {
      if (err.code === 'auth/popup-closed-by-user') {
        // User closed the popup — not an error
        return;
      }
      if (err.code === 'auth/cancelled-popup-request') return;
      setError(err.message || "Google sign-in failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    setError("");
    try {
      // Check if this email exists in the system at all
      const checkRes = await fetch("/api/auth/check-email-exists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const checkData = await checkRes.json();
      if (!checkRes.ok) {
        setError(checkData.error || "Email check failed");
        return;
      }
      if (!checkData.exists) {
        setError("No account found with this email. Please register first.");
        return;
      }

      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to send OTP");
        return;
      }
      setOtpSent(true);
    } catch {
      setError("Failed to send OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOTPChange = (index, value) => {
    if (value.length > 1) value = value.slice(-1);
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
  };

  const verifyOTP = async () => {
    const otpValue = otp.join("");
    if (otpValue.length < 6) return;
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: otpValue }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Verification failed");
        return;
      }
      setOtpVerified(true);
    } catch {
      setError("Error during verification.");
    } finally {
      setIsLoading(false);
    }
  };

  // After OTP verified → user enters password to complete Firebase sign-in
  const handleOTPPasswordLogin = async (e) => {
    e.preventDefault();
    if (!password) return;
    setIsLoading(true);
    setError("");
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      await redirectByRole(cred.user);
    } catch (err) {
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password") {
        setError("Invalid password.");
      } else if (err.code === "auth/user-not-found") {
        setError("No account found with this email.");
      } else {
        setError(err.message || "Login failed.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // --- PASSWORD FLOW ---
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsLoading(true);
    setError("");
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      await redirectByRole(cred.user);
    } catch (err) {
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password") {
        setError("Invalid email or password.");
      } else if (err.code === "auth/user-not-found") {
        setError("No account found with this email.");
      } else {
        setError(err.message || "Login failed.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-140px)] flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-[#faf8ff]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-block">
          <span className="text-3xl font-black text-indigo-700 font-display">
            SkillProof
          </span>
        </Link>
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-slate-900">
          Welcome back
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          Sign in to your SkillProof account
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-4 shadow sm:rounded-2xl sm:px-10 border border-slate-200">
          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* ─── Google Sign-In Button ─── */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="flex w-full justify-center items-center gap-3 rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm font-semibold leading-6 text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-70 transition-all mb-6"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-sm font-medium leading-6">
              <span className="bg-white px-6 text-slate-500">or sign in with email</span>
            </div>
          </div>

          {!usePassword ? (
            /* ============= OTP FLOW ============= */
            <div className="space-y-6">
              {!otpSent ? (
                /* Step 1: Enter email → send OTP */
                <form onSubmit={handleSendOTP} className="space-y-6">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium leading-6 text-slate-900">
                      Email address
                    </label>
                    <div className="mt-2">
                      <input
                        id="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="block w-full rounded-lg border-0 py-2.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 px-3"
                        placeholder="you@company.com"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex w-full justify-center items-center gap-2 rounded-lg bg-indigo-600 px-3 py-3 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-700 disabled:opacity-70 transition-all"
                  >
                    {isLoading ? <Loader2 className="animate-spin" size={20} /> : "Send OTP"}
                  </button>
                </form>
              ) : !otpVerified ? (
                /* Step 2: Enter 6-digit OTP */
                <div className="space-y-6">
                  <div className="text-center">
                    <p className="text-sm text-slate-600">
                      We sent a 6-digit code to{" "}
                      <span className="font-medium text-slate-900">{email}</span>
                    </p>
                  </div>
                  <div className="flex justify-center gap-2">
                    {otp.map((digit, index) => (
                      <input
                        key={index}
                        id={`otp-${index}`}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOTPChange(index, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Backspace" && !otp[index] && index > 0)
                            document.getElementById(`otp-${index - 1}`)?.focus();
                        }}
                        className="w-12 h-14 text-center text-xl font-semibold rounded-lg border-0 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 px-3"
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={verifyOTP}
                    disabled={isLoading}
                    className="flex w-full justify-center rounded-lg bg-indigo-600 px-3 py-3 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-700 transition-all disabled:opacity-50"
                  >
                    {isLoading ? <Loader2 className="animate-spin" size={20} /> : "Verify OTP"}
                  </button>
                  <p className="text-center text-sm text-slate-500">
                    Didn&apos;t receive the code?{" "}
                    <button
                      onClick={() => { setOtpSent(false); setOtp(["","","","","",""]); }}
                      className="text-indigo-600 font-semibold hover:underline"
                    >
                      Resend
                    </button>
                  </p>
                </div>
              ) : (
                /* Step 3: OTP verified → enter password */
                <form onSubmit={handleOTPPasswordLogin} className="space-y-6">
                  <div className="text-center mb-2">
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="material-symbols-outlined">check_circle</span>
                    </div>
                    <p className="text-sm text-slate-600">
                      Email verified. Enter your password to sign in.
                    </p>
                  </div>
                  <div>
                    <label htmlFor="otp-password" className="block text-sm font-medium leading-6 text-slate-900">
                      Password
                    </label>
                    <div className="mt-2 relative">
                      <input
                        id="otp-password"
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="block w-full rounded-lg border-0 py-2.5 pr-10 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 px-3"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex w-full justify-center items-center gap-2 rounded-lg bg-indigo-600 px-3 py-3 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-700 disabled:opacity-70 transition-all"
                  >
                    {isLoading ? <Loader2 className="animate-spin" size={20} /> : "Sign in"}
                  </button>
                  <div className="text-center">
                    <Link href="/forgot-password" className="text-sm font-semibold text-indigo-600 hover:text-indigo-500">
                      Forgot password?
                    </Link>
                  </div>
                </form>
              )}
            </div>
          ) : (
            /* ============= PASSWORD FLOW ============= */
            <form onSubmit={handlePasswordLogin} className="space-y-6">
              <div>
                <label htmlFor="email-password" className="block text-sm font-medium leading-6 text-slate-900">
                  Email address
                </label>
                <div className="mt-2">
                  <input
                    id="email-password"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full rounded-lg border-0 py-2.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 px-3"
                    placeholder="you@company.com"
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="block text-sm font-medium leading-6 text-slate-900">
                    Password
                  </label>
                  <Link href="/forgot-password" className="text-sm font-semibold text-indigo-600 hover:text-indigo-500">
                    Forgot password?
                  </Link>
                </div>
                <div className="mt-2 relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full rounded-lg border-0 py-2.5 pr-10 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 px-3"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                />
                <label htmlFor="remember-me" className="ml-3 block text-sm leading-6 text-slate-900 cursor-pointer">
                  Keep me signed in for 30 days
                </label>
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full justify-center items-center gap-2 rounded-lg bg-indigo-600 px-3 py-3 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-700 disabled:opacity-70 transition-all"
              >
                {isLoading ? <Loader2 className="animate-spin" size={20} /> : "Sign in"}
              </button>
            </form>
          )}

          <div className="mt-6">
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => {
                  setUsePassword(!usePassword);
                  setOtpSent(false);
                  setOtpVerified(false);
                  setOtp(["","","","","",""]);
                  setPassword("");
                  setError("");
                }}
                className="text-sm font-semibold leading-6 text-slate-600 hover:text-indigo-600 transition-colors"
              >
                {usePassword ? "Sign in with email OTP instead" : "Sign in with password instead"}
              </button>
            </div>
          </div>
        </div>

        <p className="mt-8 text-center text-sm text-slate-600">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-semibold leading-6 text-indigo-600 hover:text-indigo-500 hover:underline">
            Register — Let&apos;s get started
          </Link>
        </p>
      </div>
    </div>
  );
}
