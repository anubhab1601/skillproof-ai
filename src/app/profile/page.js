'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, getDocs, doc, getDoc, where } from 'firebase/firestore';

export default function ProfilePage() {
  const { user, userProfile } = useAuth();
  const [profile, setProfile] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;

    async function loadProfile() {
      try {
        // Candidate profile
        const profileDoc = await getDoc(doc(db, 'users', user.uid, 'candidateProfile', 'profile'));
        if (profileDoc.exists()) setProfile(profileDoc.data());

        // Wallet
        const walletDoc = await getDoc(doc(db, 'users', user.uid, 'wallet', 'balance'));
        if (walletDoc.exists()) setWallet(walletDoc.data());

        // Submissions (task history)
        const subSnap = await getDocs(
          query(collection(db, 'submissions'), where('candidateUid', '==', user.uid), orderBy('createdAt', 'desc'))
        );
        setSubmissions(subSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error('Error loading profile:', err);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [user?.uid]);

  const formatPaise = (paise) => `₹${((paise || 0) / 100).toLocaleString('en-IN')}`;

  const formatDate = (ts) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-[#0623bb] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const skillTags = profile?.skillTags || [];
  const skillScore = profile?.skillScore || 0;
  const totalTasks = profile?.totalTasksCompleted || 0;
  const completedSubs = submissions.filter(s => s.status === 'submitted' && s.finalScore);

  return (
    <>
      {/* Profile Header */}
      <section className="bg-white border border-[#c5c5d7] rounded-xl p-8 mb-8 shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
          <div className="w-24 h-24 bg-gradient-to-br from-[#0623bb] to-[#4648d4] rounded-2xl flex items-center justify-center text-white text-3xl font-bold shadow-lg">
            {userProfile?.displayName?.charAt(0) || '?'}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-[#131b2e]">{userProfile?.displayName || 'Your Name'}</h1>
              {profile?.isPublic && (
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span> PUBLIC
                </span>
              )}
            </div>
            <p className="text-[#454655] mb-3">{profile?.domain || 'Complete your profile'} • {userProfile?.email}</p>
            <div className="flex flex-wrap gap-2">
              {skillTags.length > 0 ? skillTags.map(s => (
                <span key={s} className="bg-[#eaedff] text-[#0623bb] px-3 py-1 rounded-full text-xs font-semibold">{s}</span>
              )) : (
                <span className="text-sm text-[#757686]">No skills added yet. Update your profile in settings.</span>
              )}
            </div>
          </div>
          <div className="text-center p-6 bg-[#0623bb]/5 border border-[#0623bb]/10 rounded-xl">
            <p className="text-xs font-semibold text-[#0623bb] uppercase tracking-wider mb-1">SKILL SCORE</p>
            <p className="text-[48px] font-bold text-[#0623bb] leading-none">{skillScore}</p>
            <p className="text-xs text-[#757686] font-semibold mt-2">{totalTasks} tasks completed</p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Stats */}
          <section className="grid grid-cols-4 gap-4">
            {[
              { label: 'Tasks Completed', value: totalTasks },
              { label: 'Total Earned', value: formatPaise(wallet?.totalEarnedPaise) },
              { label: 'Submissions', value: submissions.length },
              { label: 'Avg Score', value: completedSubs.length > 0 ? Math.round(completedSubs.reduce((sum, s) => sum + (s.finalScore || 0), 0) / completedSubs.length) : '—' },
            ].map(s => (
              <div key={s.label} className="bg-white border border-[#c5c5d7] rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-[#131b2e]">{s.value}</p>
                <p className="text-xs text-[#454655] uppercase tracking-wider font-semibold mt-1">{s.label}</p>
              </div>
            ))}
          </section>

          {/* Task History */}
          <section className="bg-white border border-[#c5c5d7] rounded-xl overflow-hidden">
            <div className="p-6 border-b border-[#c5c5d7]">
              <h3 className="text-xl font-semibold text-[#131b2e]">Task History</h3>
            </div>
            <div className="divide-y divide-[#c5c5d7]">
              {submissions.length === 0 ? (
                <div className="p-8 text-center text-[#757686]">
                  <span className="material-symbols-outlined text-[48px] text-[#c5c5d7] mb-2 block">history</span>
                  No submissions yet. Browse tasks to get started.
                </div>
              ) : (
                submissions.map(sub => (
                  <div key={sub.id} className="p-6 flex justify-between items-center hover:bg-[#f2f3ff] transition-colors">
                    <div>
                      <h4 className="font-semibold text-[#131b2e]">{sub.taskTitle || 'Unknown Task'}</h4>
                      <p className="text-sm text-[#454655]">{formatDate(sub.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-6">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        sub.qualificationStatus === 'qualified' ? 'bg-emerald-100 text-emerald-700' :
                        sub.qualificationStatus === 'disqualified' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>{sub.qualificationStatus === 'qualified' ? 'Qualified' : sub.qualificationStatus === 'disqualified' ? 'Disqualified' : 'Pending'}</span>
                      {sub.finalScore && <span className="text-[#0623bb] font-bold text-lg">{Math.round(sub.finalScore)}%</span>}
                      <span className={`font-semibold ${sub.payoutAmount > 0 ? 'text-emerald-600' : 'text-[#454655]'}`}>
                        {sub.payoutAmount > 0 ? formatPaise(sub.payoutAmount) : sub.status === 'submitted' ? 'Under Review' : '—'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          <section className="bg-white border border-[#c5c5d7] rounded-xl p-6">
            <h3 className="text-lg font-semibold text-[#131b2e] mb-4">Domain Scores</h3>
            <div className="space-y-3">
              {Object.entries(profile?.domainScores || {}).filter(([, v]) => v > 0).map(([domain, score]) => (
                <div key={domain}>
                  <div className="flex justify-between text-sm font-medium mb-1">
                    <span className="capitalize">{domain}</span>
                    <span className="text-[#0623bb]">{score}%</span>
                  </div>
                  <div className="w-full h-2 bg-[#eaedff] rounded-full overflow-hidden">
                    <div className="h-full bg-[#0623bb] rounded-full" style={{ width: `${score}%` }} />
                  </div>
                </div>
              ))}
              {Object.keys(profile?.domainScores || {}).length === 0 && (
                <p className="text-sm text-[#757686]">Complete tasks to build domain scores.</p>
              )}
            </div>
          </section>

          <section className="bg-white border border-[#c5c5d7] rounded-xl p-6">
            <h3 className="text-lg font-semibold text-[#131b2e] mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Link href="/settings" className="flex justify-between items-center p-3 bg-[#f2f3ff] rounded-lg hover:bg-[#eaedff] transition-colors">
                <span className="text-sm font-medium">Edit Profile</span>
                <span className="material-symbols-outlined text-sm text-[#0623bb]">arrow_forward</span>
              </Link>
              <Link href="/tasks" className="flex justify-between items-center p-3 bg-[#f2f3ff] rounded-lg hover:bg-[#eaedff] transition-colors">
                <span className="text-sm font-medium">Browse Tasks</span>
                <span className="material-symbols-outlined text-sm text-[#0623bb]">arrow_forward</span>
              </Link>
              <Link href="/leaderboard" className="flex justify-between items-center p-3 bg-[#f2f3ff] rounded-lg hover:bg-[#eaedff] transition-colors">
                <span className="text-sm font-medium">View Leaderboard</span>
                <span className="material-symbols-outlined text-sm text-[#0623bb]">arrow_forward</span>
              </Link>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
