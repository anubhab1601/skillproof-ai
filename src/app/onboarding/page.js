'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';
import { Suspense } from 'react';

function OnboardingContent() {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, userProfile, refreshProfile } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = searchParams.get('role') || userProfile?.role || 'candidate';
  const isCompany = role === 'company';
  const totalSteps = isCompany ? 5 : 4;

  const handleComplete = async () => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        onboardingComplete: true,
      });
      await refreshProfile();
      router.push(isCompany ? '/company/dashboard' : '/dashboard');
    } catch (err) {
      console.error('Error completing onboarding:', err);
      router.push(isCompany ? '/company/dashboard' : '/dashboard');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const candidateLabels = ['Profile Basics', 'Skills & Domain', 'Connect Accounts', 'Preferences'];
  const companyLabels = ['Company Profile', 'Hiring Preferences', 'Team Setup', 'Payment Connect', 'Review & Go Live'];
  const stepLabels = isCompany ? companyLabels : candidateLabels;

  return (
    <div className="min-h-screen flex flex-col bg-[#faf8ff]">
      <header className="bg-white/90 backdrop-blur-md sticky top-0 z-50 border-b border-[#c5c5d7] shadow-sm">
        <div className="max-w-[1280px] mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-[#0623bb]">SkillProof</span>
            <span className="h-4 w-px bg-[#c5c5d7] mx-2" />
            <span className="text-xs font-semibold text-[#454655] uppercase tracking-widest">
              {isCompany ? 'Company Setup' : 'Onboarding'}
            </span>
          </div>
          <button
            onClick={handleComplete}
            className="text-[#454655] hover:text-[#0623bb] transition-colors text-sm font-medium"
          >
            Skip & Complete
          </button>
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center py-16 px-8">
        {/* Progress */}
        <div className="w-full max-w-2xl mb-12">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-[#0623bb] uppercase">Step {step} of {totalSteps}</span>
            <span className="text-xs text-[#454655] uppercase">{stepLabels[step - 1]}</span>
          </div>
          <div className="h-2 w-full bg-[#eaedff] rounded-full overflow-hidden">
            <div className="h-full bg-[#0623bb] rounded-full transition-all" style={{ width: `${(step / totalSteps) * 100}%` }} />
          </div>
          {/* Step indicators */}
          <div className="flex justify-between mt-4">
            {stepLabels.map((label, i) => (
              <button
                key={label}
                onClick={() => i + 1 <= step && setStep(i + 1)}
                className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                  i + 1 === step ? 'text-[#0623bb]' : i + 1 < step ? 'text-emerald-600 cursor-pointer' : 'text-[#757686]'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  i + 1 === step ? 'bg-[#0623bb] text-white' : i + 1 < step ? 'bg-emerald-100 text-emerald-700' : 'bg-[#eaedff] text-[#757686]'
                }`}>
                  {i + 1 < step ? '✓' : i + 1}
                </span>
                <span className="hidden md:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="w-full max-w-2xl space-y-8">
          {/* ===== CANDIDATE STEPS ===== */}
          {!isCompany && step === 1 && (
            <>
              <div className="text-center space-y-3">
                <h1 className="text-4xl font-bold text-[#131b2e]">Welcome to SkillProof</h1>
                <p className="text-lg text-[#454655]">Let&apos;s set up your professional profile.</p>
              </div>
              <section className="bg-white p-8 rounded-xl border border-[#c5c5d7] shadow-[0px_4px_20px_rgba(0,0,0,0.04)] space-y-4">
                <input className="w-full px-4 py-3 bg-[#eaedff] border border-[#c5c5d7] rounded-lg outline-none focus:ring-2 focus:ring-[#0623bb]" placeholder="Display Name" defaultValue={userProfile?.displayName || ''} />
                <input className="w-full px-4 py-3 bg-[#eaedff] border border-[#c5c5d7] rounded-lg outline-none focus:ring-2 focus:ring-[#0623bb]" placeholder="Professional Title" />
                <textarea className="w-full px-4 py-3 bg-[#eaedff] border border-[#c5c5d7] rounded-lg outline-none focus:ring-2 focus:ring-[#0623bb] h-24" placeholder="Short bio (max 200 chars)" />
              </section>
            </>
          )}

          {!isCompany && step === 2 && (
            <>
              <div className="text-center space-y-3">
                <h1 className="text-4xl font-bold text-[#131b2e]">Your skills & domain</h1>
                <p className="text-lg text-[#454655]">Select the areas where you excel.</p>
              </div>
              <section className="bg-white p-8 rounded-xl border border-[#c5c5d7] shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
                <h3 className="text-xl font-semibold mb-4">Select your domains</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { icon: 'terminal', label: 'Software', desc: 'Eng, DevOps, Arch' },
                    { icon: 'database', label: 'Data', desc: 'AI, ML, Analytics' },
                    { icon: 'palette', label: 'Design', desc: 'UX, Visual, Product' },
                  ].map((d, i) => (
                    <label key={d.label} className="group relative flex flex-col p-4 rounded-lg border-2 border-[#eaedff] hover:border-[#0623bb] cursor-pointer transition-all">
                      <input className="sr-only peer" type="checkbox" defaultChecked={i === 0} />
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 ${i === 0 ? 'bg-[#dfe0ff] text-[#0623bb]' : 'bg-[#eaedff] text-[#454655]'}`}>
                        <span className="material-symbols-outlined">{d.icon}</span>
                      </div>
                      <span className="font-semibold">{d.label}</span>
                      <span className="text-sm text-[#454655]">{d.desc}</span>
                    </label>
                  ))}
                </div>
              </section>
            </>
          )}

          {!isCompany && step === 3 && (
            <>
              <div className="text-center space-y-3">
                <h1 className="text-4xl font-bold text-[#131b2e]">Build your proof</h1>
                <p className="text-lg text-[#454655]">Upload credentials and connect repositories.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <section className="bg-white p-6 rounded-xl border border-[#c5c5d7] shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
                  <h3 className="font-semibold mb-2">Resume / CV</h3>
                  <p className="text-sm text-[#454655] mb-4">We use AI to parse your accomplishments.</p>
                  <div className="border-2 border-dashed border-[#c5c5d7] rounded-lg p-4 text-center hover:bg-[#f2f3ff] transition-colors cursor-pointer">
                    <span className="material-symbols-outlined text-[#757686] mb-1">upload_file</span>
                    <p className="text-sm font-medium">Drop PDF or browse</p>
                    <p className="text-[10px] text-[#757686] mt-1">Max 5MB</p>
                  </div>
                </section>
                <section className="bg-white p-6 rounded-xl border border-[#c5c5d7] shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
                  <h3 className="font-semibold mb-2">Connect Repos</h3>
                  <p className="text-sm text-[#454655] mb-4">Analyze code quality for verified proof.</p>
                  <button className="w-full flex items-center justify-center gap-2 bg-[#131b2e] text-white py-3 rounded-lg hover:bg-[#283044] transition-all">
                    <span className="material-symbols-outlined text-sm">code</span>
                    Connect GitHub
                  </button>
                  <button className="w-full flex items-center justify-center gap-2 bg-[#0077b5] text-white py-3 rounded-lg hover:bg-[#006097] transition-all mt-3">
                    <span className="material-symbols-outlined text-sm">badge</span>
                    Connect LinkedIn
                  </button>
                </section>
              </div>
            </>
          )}

          {!isCompany && step === 4 && (
            <>
              <div className="text-center space-y-3">
                <h1 className="text-4xl font-bold text-[#131b2e]">Almost there!</h1>
                <p className="text-lg text-[#454655]">Set your notification preferences.</p>
              </div>
              <section className="bg-white p-8 rounded-xl border border-[#c5c5d7] shadow-[0px_4px_20px_rgba(0,0,0,0.04)] space-y-4">
                {['Task Recommendations', 'Payout Alerts', 'New Messages', 'Weekly Reports'].map(pref => (
                  <label key={pref} className="flex items-center justify-between p-4 border border-[#c5c5d7] rounded-lg cursor-pointer hover:bg-[#f2f3ff]">
                    <span className="font-medium">{pref}</span>
                    <input type="checkbox" defaultChecked className="rounded text-[#0623bb] focus:ring-[#0623bb]" />
                  </label>
                ))}
              </section>
            </>
          )}

          {/* ===== COMPANY STEPS ===== */}
          {isCompany && step === 1 && (
            <>
              <div className="text-center space-y-3">
                <h1 className="text-4xl font-bold text-[#131b2e]">Company Profile</h1>
                <p className="text-lg text-[#454655]">Tell us about your organization so candidates know who you are.</p>
              </div>
              <section className="bg-white p-8 rounded-xl border border-[#c5c5d7] shadow-[0px_4px_20px_rgba(0,0,0,0.04)] space-y-5">
                <div>
                  <label className="text-sm font-semibold text-[#131b2e] block mb-2">Company Name</label>
                  <input className="w-full px-4 py-3 bg-[#eaedff] border border-[#c5c5d7] rounded-lg outline-none focus:ring-2 focus:ring-[#0623bb]" placeholder="Acme Inc." defaultValue={userProfile?.companyName || ''} />
                </div>
                <div>
                  <label className="text-sm font-semibold text-[#131b2e] block mb-2">Company Website</label>
                  <input className="w-full px-4 py-3 bg-[#eaedff] border border-[#c5c5d7] rounded-lg outline-none focus:ring-2 focus:ring-[#0623bb]" placeholder="https://acme.com" defaultValue={userProfile?.website || ''} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-[#131b2e] block mb-2">Industry</label>
                    <select className="w-full px-4 py-3 bg-[#eaedff] border border-[#c5c5d7] rounded-lg outline-none focus:ring-2 focus:ring-[#0623bb]">
                      <option>Technology</option><option>Finance</option><option>Healthcare</option><option>Education</option><option>E-commerce</option><option>Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-[#131b2e] block mb-2">Company Size</label>
                    <select className="w-full px-4 py-3 bg-[#eaedff] border border-[#c5c5d7] rounded-lg outline-none focus:ring-2 focus:ring-[#0623bb]" defaultValue={userProfile?.companySize || '1-10'}>
                      <option>1-10</option><option>11-50</option><option>51-200</option><option>201-1000</option><option>1000+</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-[#131b2e] block mb-2">Company Description</label>
                  <textarea className="w-full px-4 py-3 bg-[#eaedff] border border-[#c5c5d7] rounded-lg outline-none focus:ring-2 focus:ring-[#0623bb] h-24" placeholder="Brief description of what your company does..." />
                </div>
                <div>
                  <label className="text-sm font-semibold text-[#131b2e] block mb-2">Company Logo</label>
                  <div className="border-2 border-dashed border-[#c5c5d7] rounded-lg p-6 text-center hover:bg-[#f2f3ff] transition-colors cursor-pointer">
                    <span className="material-symbols-outlined text-[#757686] text-3xl mb-2">add_photo_alternate</span>
                    <p className="text-sm font-medium">Upload logo (PNG, SVG)</p>
                    <p className="text-[10px] text-[#757686] mt-1">Recommended: 256×256px, max 2MB</p>
                  </div>
                </div>
              </section>
            </>
          )}

          {isCompany && step === 2 && (
            <>
              <div className="text-center space-y-3">
                <h1 className="text-4xl font-bold text-[#131b2e]">Hiring Preferences</h1>
                <p className="text-lg text-[#454655]">What kind of talent are you looking for?</p>
              </div>
              <section className="bg-white p-8 rounded-xl border border-[#c5c5d7] shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
                <h3 className="text-lg font-semibold mb-4">Domains you hire for</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                  {[
                    { icon: 'terminal', label: 'Software Engineering' },
                    { icon: 'palette', label: 'Design' },
                    { icon: 'analytics', label: 'Data Science' },
                    { icon: 'security', label: 'Security' },
                    { icon: 'campaign', label: 'Marketing' },
                    { icon: 'account_tree', label: 'DevOps' },
                  ].map((d) => (
                    <label key={d.label} className="flex items-center gap-3 p-4 rounded-lg border-2 border-[#eaedff] hover:border-[#0623bb] cursor-pointer transition-all">
                      <input type="checkbox" className="rounded text-[#0623bb] focus:ring-[#0623bb]" />
                      <span className="material-symbols-outlined text-[#454655] text-[20px]">{d.icon}</span>
                      <span className="text-sm font-medium">{d.label}</span>
                    </label>
                  ))}
                </div>
                <h3 className="text-lg font-semibold mb-4">Hiring volume</h3>
                <div className="grid grid-cols-3 gap-3">
                  {['1-5 / month', '5-20 / month', '20+ / month'].map(v => (
                    <label key={v} className="flex items-center justify-center p-4 rounded-lg border-2 border-[#eaedff] hover:border-[#0623bb] cursor-pointer transition-all text-sm font-medium text-center">
                      <input type="radio" name="volume" className="sr-only" />
                      {v}
                    </label>
                  ))}
                </div>
              </section>
            </>
          )}

          {isCompany && step === 3 && (
            <>
              <div className="text-center space-y-3">
                <h1 className="text-4xl font-bold text-[#131b2e]">Team Setup</h1>
                <p className="text-lg text-[#454655]">Invite team members who will review submissions and manage hiring.</p>
              </div>
              <section className="bg-white p-8 rounded-xl border border-[#c5c5d7] shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
                <div className="space-y-4 mb-6">
                  <div className="flex items-center gap-3 p-4 bg-[#f2f3ff] rounded-lg border border-[#c5c5d7]">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">
                      {userProfile?.displayName?.charAt(0) || 'Y'}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{userProfile?.displayName || 'You'}</p>
                      <p className="text-xs text-[#757686]">{userProfile?.email}</p>
                    </div>
                    <span className="px-3 py-1 bg-[#0623bb] text-white rounded-full text-xs font-bold">Admin</span>
                  </div>
                </div>
                <div className="border-t border-[#c5c5d7] pt-6">
                  <h4 className="text-sm font-semibold text-[#131b2e] mb-3">Invite team members</h4>
                  <div className="flex gap-3">
                    <input className="flex-1 px-4 py-3 bg-[#eaedff] border border-[#c5c5d7] rounded-lg outline-none focus:ring-2 focus:ring-[#0623bb]" placeholder="team@company.com" />
                    <select className="px-4 py-3 bg-[#eaedff] border border-[#c5c5d7] rounded-lg outline-none">
                      <option>Reviewer</option><option>Admin</option><option>Viewer</option>
                    </select>
                    <button className="px-6 py-3 bg-[#0623bb] text-white rounded-lg font-semibold text-sm hover:opacity-90 transition-all">
                      Invite
                    </button>
                  </div>
                  <p className="text-xs text-[#757686] mt-2">Reviewers can evaluate submissions. Admins can post tasks and manage billing.</p>
                </div>
              </section>
            </>
          )}

          {isCompany && step === 4 && (
            <>
              <div className="text-center space-y-3">
                <h1 className="text-4xl font-bold text-[#131b2e]">Payment Setup</h1>
                <p className="text-lg text-[#454655]">Connect your payment method to fund escrow for task bounties.</p>
              </div>
              <section className="bg-white p-8 rounded-xl border border-[#c5c5d7] shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <button className="flex items-center gap-4 p-6 rounded-xl border-2 border-[#eaedff] hover:border-[#0623bb] transition-all">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <span className="material-symbols-outlined text-blue-600 text-2xl">account_balance</span>
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-[#131b2e]">Razorpay</p>
                      <p className="text-xs text-[#454655]">UPI, Cards, Net Banking</p>
                    </div>
                  </button>
                  <button className="flex items-center gap-4 p-6 rounded-xl border-2 border-[#eaedff] hover:border-[#0623bb] transition-all">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <span className="material-symbols-outlined text-purple-600 text-2xl">credit_card</span>
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-[#131b2e]">Stripe</p>
                      <p className="text-xs text-[#454655]">International cards, ACH</p>
                    </div>
                  </button>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                  <span className="material-symbols-outlined text-amber-600">info</span>
                  <div>
                    <p className="font-semibold text-amber-800 text-sm">How Escrow Works</p>
                    <p className="text-amber-700 text-sm">When you post a task, the prize pool is locked in escrow. Funds are only released to candidates after you review and approve their submissions. A 5% platform fee applies per transaction.</p>
                  </div>
                </div>
              </section>
            </>
          )}

          {isCompany && step === 5 && (
            <>
              <div className="text-center space-y-3">
                <h1 className="text-4xl font-bold text-[#131b2e]">You&apos;re all set!</h1>
                <p className="text-lg text-[#454655]">Review your setup and go live.</p>
              </div>
              <section className="bg-white p-8 rounded-xl border border-[#c5c5d7] shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
                <div className="space-y-4">
                  {[
                    { label: 'Company Profile', icon: 'business', status: 'complete' },
                    { label: 'Hiring Preferences', icon: 'tune', status: 'complete' },
                    { label: 'Team Setup', icon: 'groups', status: 'complete' },
                    { label: 'Payment Connected', icon: 'payments', status: 'pending' },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between p-4 border border-[#c5c5d7] rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-[#454655]">{item.icon}</span>
                        <span className="font-medium">{item.label}</span>
                      </div>
                      {item.status === 'complete' ? (
                        <span className="flex items-center gap-1 text-emerald-600 text-sm font-semibold">
                          <span className="material-symbols-outlined text-sm">check_circle</span> Done
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-amber-600 text-sm font-semibold">
                          <span className="material-symbols-outlined text-sm">pending</span> Optional
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-6 p-4 bg-[#f2f3ff] rounded-lg border border-[#c5c5d7]">
                  <p className="text-sm text-[#454655]">You can always update these settings later from your dashboard. Payment can be set up when you post your first task.</p>
                </div>
              </section>
            </>
          )}

          {/* Navigation */}
          <div className="flex justify-between items-center pt-4 border-t border-[#c5c5d7]">
            <button
              onClick={() => step > 1 && setStep(step - 1)}
              className={`flex items-center gap-2 font-medium transition-colors ${step > 1 ? 'text-[#454655] hover:text-[#131b2e]' : 'opacity-0'}`}
            >
              <span className="material-symbols-outlined">arrow_back</span> Back
            </button>
            <div className="flex gap-4">
              {step < totalSteps && (
                <button
                  onClick={() => setStep(step + 1)}
                  className="px-6 py-3 rounded-lg border border-[#c5c5d7] text-[#454655] hover:bg-[#eaedff] transition-all"
                >
                  Skip for now
                </button>
              )}
              <button
                onClick={handleNext}
                disabled={isSubmitting}
                className="px-8 py-3 rounded-lg bg-[#0623bb] text-white font-semibold shadow-lg hover:shadow-indigo-200 active:scale-95 transition-all disabled:opacity-70 flex items-center gap-2"
              >
                {isSubmitting ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : step === totalSteps ? (
                  isCompany ? 'Launch Dashboard →' : 'Complete Setup'
                ) : (
                  'Next Step'
                )}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#faf8ff]">
          <div className="w-12 h-12 border-4 border-[#0623bb]/20 border-t-[#0623bb] rounded-full animate-spin" />
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}
