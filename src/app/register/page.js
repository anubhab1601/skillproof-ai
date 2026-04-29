"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BriefcaseBusiness,
  Code2,
  ArrowRight,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, googleProvider } from "@/lib/firebase";

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState('');

  const handleGoogleRegister = async (selectedRole) => {
    setGoogleLoading(true);
    setGoogleError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;

      // Check if user already has a profile
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        // Already registered — just redirect
        const profile = userDocSnap.data();
        if (profile.role === 'company') router.push('/company/dashboard');
        else router.push('/dashboard');
        return;
      }

      // Create profile via backend
      const idToken = await firebaseUser.getIdToken();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/create-profile`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
          body: JSON.stringify({
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || '',
            photoURL: firebaseUser.photoURL || '',
            role: selectedRole,
            phone: firebaseUser.phoneNumber || '',
          }),
        }
      );

      if (!res.ok) {
        // Fallback: create minimal profile
        await setDoc(userDocRef, {
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || '',
          photoURL: firebaseUser.photoURL || '',
          role: selectedRole,
          onboardingComplete: false,
          createdAt: serverTimestamp(),
        });
      }

      router.push(`/onboarding?role=${selectedRole}`);
    } catch (err) {
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') return;
      setGoogleError(err.message || 'Google sign-up failed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  if (role) {
    return <RegisterForm role={role} onBack={() => setRole(null)} />;
  }

  return (
    <div className="min-h-[calc(100vh-140px)] flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-[#faf8ff]">
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl text-center">
        <Link href="/" className="inline-block">
          <span className="text-3xl font-black text-indigo-700 font-display">
            SkillProof
          </span>
        </Link>
        <h2 className="mt-6 text-center text-4xl font-bold tracking-tight text-slate-900">
          Join SkillProof
        </h2>
        <p className="mt-2 text-center text-lg text-slate-600">
          Choose how you want to use the platform
        </p>
      </div>

      <div className="mt-12 sm:mx-auto sm:w-full sm:max-w-3xl px-4 sm:px-0">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Candidate Card */}
          <div
            onClick={() => setRole("candidate")}
            className="bg-white rounded-2xl shadow-sm border-2 border-transparent hover:border-indigo-600 p-8 cursor-pointer transition-all flex flex-col group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-indigo-50 rounded-full group-hover:scale-[2] transition-transform duration-500 z-0"></div>
            <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mb-6 z-10">
              <Code2 size={28} />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2 z-10">
              I want to find work
            </h3>
            <p className="text-slate-600 mb-6 flex-grow z-10">
              Demonstrate your skills and get paid for real assignments.
            </p>
            <ul className="space-y-3 mb-8 z-10">
              <li className="flex items-center gap-2 text-sm text-slate-700">
                <CheckIcon /> Browse verified tasks
              </li>
              <li className="flex items-center gap-2 text-sm text-slate-700">
                <CheckIcon /> Get paid instantly
              </li>
              <li className="flex items-center gap-2 text-sm text-slate-700">
                <CheckIcon /> Build your SkillScore
              </li>
            </ul>
            <button className="flex items-center justify-between w-full font-semibold text-indigo-600 group-hover:text-indigo-700 z-10">
              Join as Candidate{" "}
              <ArrowRight
                size={20}
                className="transform group-hover:translate-x-1 transition-transform"
              />
            </button>
          </div>

          {/* Company Card */}
          <div
            onClick={() => setRole("company")}
            className="bg-white rounded-2xl shadow-sm border-2 border-transparent hover:border-slate-900 p-8 cursor-pointer transition-all flex flex-col group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-slate-50 rounded-full group-hover:scale-[2] transition-transform duration-500 z-0"></div>
            <div className="w-14 h-14 bg-slate-100 text-slate-700 rounded-xl flex items-center justify-center mb-6 z-10">
              <BriefcaseBusiness size={28} />
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2 z-10">
              I want to hire
            </h3>
            <p className="text-slate-600 mb-6 flex-grow z-10">
              Post tasks and evaluate candidates based on objective metrics.
            </p>
            <ul className="space-y-3 mb-8 z-10">
              <li className="flex items-center gap-2 text-sm text-slate-700">
                <CheckIcon color="text-slate-700" /> Post paid tasks
              </li>
              <li className="flex items-center gap-2 text-sm text-slate-700">
                <CheckIcon color="text-slate-700" /> Review quality submissions
              </li>
              <li className="flex items-center gap-2 text-sm text-slate-700">
                <CheckIcon color="text-slate-700" /> Make job offers direct
              </li>
            </ul>
            <button className="flex items-center justify-between w-full font-semibold text-slate-900 z-10">
              Join as Company{" "}
              <ArrowRight
                size={20}
                className="transform group-hover:translate-x-1 transition-transform"
              />
            </button>
          </div>
        </div>

        {/* Google Sign-Up */}
        <div className="mt-8 max-w-md mx-auto">
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-sm font-medium leading-6">
              <span className="bg-[#faf8ff] px-6 text-slate-500">or register with</span>
            </div>
          </div>

          {googleError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 text-center">{googleError}</div>
          )}

          <button
            type="button"
            onClick={() => handleGoogleRegister('candidate')}
            disabled={googleLoading}
            className="flex w-full justify-center items-center gap-3 rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm font-semibold leading-6 text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-70 transition-all"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {googleLoading ? 'Signing up...' : 'Continue with Google'}
          </button>
          <p className="text-xs text-center text-slate-500 mt-2">Signs up as Candidate by default</p>
        </div>

        <p className="mt-8 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold leading-6 text-indigo-600 hover:text-indigo-500 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

function CheckIcon({ color = "text-indigo-600" }) {
  return (
    <svg
      className={`w-5 h-5 ${color}`}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function RegisterForm({ role, onBack }) {
  const router = useRouter();
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    companyName: "",
    website: "",
    companySize: "1-10",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSendOTP = async () => {
    if (!formData.email)
      return alert("Please enter an email address first.");
    setIsSendingOtp(true);
    setError("");

    try {
      // Pre-check duplicate email by role
      const check = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email, role }),
      });
      const checkPayload = await check.json();
      if (!check.ok) {
        setError(checkPayload.error || "Email not allowed");
        setIsSendingOtp(false);
        return;
      }

      // Send OTP via Nodemailer
      const otpRes = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email }),
      });
      const otpData = await otpRes.json();
      if (!otpRes.ok) {
        setError(otpData.error || "Failed to send OTP");
        setIsSendingOtp(false);
        return;
      }
      setOtpSent(true);
    } catch (err) {
      console.error(err);
      setError(err.message || "Error sending verification email.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleOTPChange = async (index, value) => {
    if (value.length > 1) value = value.slice(-1);
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      const nextInput = document.getElementById(`reg-otp-${index + 1}`);
      nextInput?.focus();
    }

    // Auto-verify if all 6 digits entered
    if (index === 5 && value && newOtp.every((d) => d)) {
      const otpValue = newOtp.join("");
      try {
        const response = await fetch("/api/auth/verify-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: formData.email,
            otp: otpValue,
          }),
        });

        if (response.ok) {
          setOtpVerified(true);
        } else {
          const err = await response.json();
          setError(err.error || "Verification failed");
        }
      } catch (err) {
        console.error(err);
        setError("Error verifying OTP.");
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!otpVerified) {
      setError("Please verify your email via OTP first.");
      return;
    }
    if (!formData.password || formData.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      // Create Firebase auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );
      const user = userCredential.user;

      // Update display name
      await updateProfile(user, { displayName: formData.fullName });

      // Call backend API to create user profile + wallet + role subcollections
      const idToken = await user.getIdToken();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/create-profile`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            email: formData.email,
            phone: formData.phone,
            displayName: formData.fullName,
            role,
          }),
        }
      );

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to create profile');
      }

      // Redirect to login so user can sign in and be routed correctly
      router.push('/login');
    } catch (err) {
      console.error(err);
      if (err.code === "auth/email-already-in-use") {
        setError("An account with this email already exists.");
      } else if (err.code === "auth/weak-password") {
        setError("Password is too weak. Use at least 8 characters.");
      } else {
        setError(err.message || "Registration failed.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-[#faf8ff]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <button
          onClick={onBack}
          className="text-slate-500 hover:text-slate-900 text-sm font-medium mb-6 flex items-center justify-center mx-auto gap-2"
        >
          <ArrowRight size={16} className="rotate-180" /> Back to role selection
        </button>
        <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900">
          Create your {role === "candidate" ? "Candidate" : "Company"} Account
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-4 shadow sm:rounded-2xl sm:px-10 border border-slate-200">
          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium leading-6 text-slate-900">
                Full name
              </label>
              <input
                name="fullName"
                type="text"
                required
                onChange={handleChange}
                className="mt-2 block w-full rounded-lg border-0 py-2.5 px-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              />
            </div>
            <div>
              <label className="block text-sm font-medium leading-6 text-slate-900">
                Email address
              </label>
              <div className="mt-2 flex shadow-sm rounded-lg">
                <input
                  name="email"
                  type="email"
                  required
                  disabled={otpSent || otpVerified}
                  onChange={handleChange}
                  className="block w-full min-w-0 flex-1 rounded-none rounded-l-lg border-0 py-2.5 px-3 text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 disabled:bg-slate-50 disabled:text-slate-500"
                />
                <button
                  type="button"
                  onClick={handleSendOTP}
                  disabled={isSendingOtp || otpVerified || !formData.email}
                  className="relative -ml-px inline-flex items-center gap-x-1.5 rounded-r-lg px-4 py-2.5 text-sm font-semibold text-indigo-700 bg-indigo-50 ring-1 ring-inset ring-slate-300 hover:bg-indigo-100 disabled:opacity-50 transition-colors"
                >
                  {isSendingOtp ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : otpVerified ? (
                    <CheckCircle2 size={16} className="text-emerald-600" />
                  ) : (
                    "Send OTP"
                  )}
                </button>
              </div>

              {otpSent && !otpVerified && (
                <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-sm font-medium text-slate-900 mb-3 text-center">
                    Enter the 6-digit code sent to your email.
                  </p>
                  <div className="flex justify-center gap-2">
                    {otp.map((digit, index) => (
                      <input
                        key={index}
                        id={`reg-otp-${index}`}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) =>
                          handleOTPChange(index, e.target.value)
                        }
                        onKeyDown={(e) => {
                          if (
                            e.key === "Backspace" &&
                            !otp[index] &&
                            index > 0
                          ) {
                            const prevInput = document.getElementById(
                              `reg-otp-${index - 1}`
                            );
                            prevInput?.focus();
                          }
                        }}
                        className="w-10 h-10 text-center text-lg font-semibold rounded-md border-0 text-slate-900 ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium leading-6 text-slate-900">
                Phone number
              </label>
              <input
                name="phone"
                type="tel"
                required
                onChange={handleChange}
                placeholder="+91"
                className="mt-2 block w-full rounded-lg border-0 py-2.5 px-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              />
            </div>

            {role === "company" && (
              <>
                <div className="border-t border-slate-200 pt-6">
                  <label className="block text-sm font-medium leading-6 text-slate-900">
                    Company name
                  </label>
                  <input
                    name="companyName"
                    type="text"
                    required
                    onChange={handleChange}
                    className="mt-2 block w-full rounded-lg border-0 py-2.5 px-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium leading-6 text-slate-900">
                    Company Website
                  </label>
                  <input
                    name="website"
                    type="url"
                    onChange={handleChange}
                    className="mt-2 block w-full rounded-lg border-0 py-2.5 px-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium leading-6 text-slate-900">
                    Team Size
                  </label>
                  <select
                    name="companySize"
                    onChange={handleChange}
                    className="mt-2 block w-full rounded-lg border-0 py-2.5 px-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 bg-white"
                  >
                    <option>1-10</option>
                    <option>11-50</option>
                    <option>51-200</option>
                    <option>200+</option>
                  </select>
                </div>
              </>
            )}

            <div className="border-t border-slate-200 pt-6">
              <label className="block text-sm font-medium leading-6 text-slate-900">
                Password
              </label>
              <input
                name="password"
                type="password"
                required
                onChange={handleChange}
                className="mt-2 block w-full rounded-lg border-0 py-2.5 px-3 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              />
              <p className="mt-2 text-xs text-slate-500">
                Must be at least 8 characters.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start">
                <input
                  id="terms"
                  type="checkbox"
                  required
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                />
                <label
                  htmlFor="terms"
                  className="ml-3 block text-xs leading-5 text-slate-600 cursor-pointer"
                >
                  I agree to SkillProof&apos;s{" "}
                  <a href="#" className="text-indigo-600 hover:underline">
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a href="#" className="text-indigo-600 hover:underline">
                    Privacy Policy
                  </a>
                </label>
              </div>
              <div className="flex items-start">
                <input
                  id="ip"
                  type="checkbox"
                  required
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                />
                <label
                  htmlFor="ip"
                  className="ml-3 block text-xs leading-5 text-slate-600 cursor-pointer"
                >
                  I understand the{" "}
                  <a href="#" className="text-indigo-600 hover:underline">
                    IP Ownership policy
                  </a>{" "}
                  for submitted work
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full justify-center items-center gap-2 rounded-lg bg-indigo-600 px-3 py-3.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-700 transition-all disabled:opacity-70"
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                "Create Account"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
