'use client';
import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import TopNav from '@/components/TopNav';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, orderBy, getDocs } from 'firebase/firestore';

export default function PublicProfilePage({ params }) {
  const { username } = use(params);
  const [profile, setProfile] = useState(null);
  const [userData, setUserData] = useState(null);
  const [completions, setCompletions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username) return;

    async function loadProfile() {
      try {
        // The username param could be a UID or an actual username
        // Try as UID first (for leaderboard links)
        let uid = username;
        let userDoc = await getDoc(doc(db, 'users', username));

        if (!userDoc.exists()) {
          // Try looking up by username field
          const usersSnap = await getDocs(
            query(collection(db, 'users'), where('username', '==', username))
          );
          if (!usersSnap.empty) {
            uid = usersSnap.docs[0].id;
            userDoc = usersSnap.docs[0];
          }
        }

        if (!userDoc.exists()) {
          setLoading(false);
          return;
        }

        setUserData({ uid, ...userDoc.data() });

        // Load candidate profile
        const profileDoc = await getDoc(doc(db, 'users', uid, 'candidateProfile', 'profile'));
        if (profileDoc.exists()) setProfile(profileDoc.data());

        // Load completed submissions (public)
        const subSnap = await getDocs(
          query(collection(db, 'submissions'), where('candidateUid', '==', uid), orderBy('createdAt', 'desc'))
        );
        setCompletions(subSnap.docs.map(d => ({ id: d.id, ...d.data() })).filter(s => s.finalScore));
      } catch (err) {
        console.error('Error loading public profile:', err);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [username]);

  const formatDate = (ts) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <>
        <TopNav variant="landing" />
        <main className="max-w-[960px] mx-auto px-6 py-12">
          <div className="flex items-center justify-center min-h-[40vh]">
            <div className="w-12 h-12 border-4 border-[#0623bb] border-t-transparent rounded-full animate-spin" />
          </div>
        </main>
      </>
    );
  }

  if (!userData) {
    return (
      <>
        <TopNav variant="landing" />
        <main className="max-w-[960px] mx-auto px-6 py-12 text-center">
          <span className="material-symbols-outlined text-[64px] text-[#c5c5d7] mb-4 block">person_off</span>
          <h1 className="text-2xl font-bold text-[#131b2e] mb-2">Profile Not Found</h1>
          <p className="text-[#454655]">This user doesn&apos;t exist or their profile is private.</p>
          <Link href="/leaderboard" className="inline-block mt-6 text-[#0623bb] font-semibold hover:underline">← Back to Leaderboard</Link>
        </main>
      </>
    );
  }

  const skillTags = profile?.skillTags || [];
  const domainScores = profile?.domainScores || {};
  const skillScore = profile?.skillScore || 0;
  const totalTasks = profile?.totalTasksCompleted || 0;

  return (
    <>
      <TopNav variant="landing" />
      <main className="max-w-[960px] mx-auto px-6 py-12">
        {/* Profile Header */}
        <div className="bg-white border border-[#c5c5d7] rounded-2xl p-8 mb-6">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-6">
              {userData.photoURL ? (
                <img src={userData.photoURL} alt={userData.displayName} className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-100 to-violet-200 text-indigo-600 flex items-center justify-center font-bold text-4xl border-4 border-white shadow-lg">
                  {(userData.displayName || '?').charAt(0)}
                </div>
              )}
              <div>
                <h1 className="text-3xl font-bold text-[#131b2e]">{userData.displayName || 'Anonymous'}</h1>
                <p className="text-[#454655]">{profile?.domain || 'Candidate'}</p>
                <div className="flex items-center gap-3 mt-2">
                  {profile?.isPublic && <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">Verified</span>}
                  <span className="text-xs text-[#757686]">@{userData.username || username}</span>
                  {userData.createdAt && <span className="text-xs text-[#757686]">• Joined {formatDate(userData.createdAt)}</span>}
                </div>
              </div>
            </div>
            <Link
              href="/register"
              className="px-6 py-3 bg-[#0623bb] text-white rounded-xl font-semibold hover:opacity-90 transition-all"
            >
              Hire Me
            </Link>
          </div>
          <p className="mt-6 text-sm text-[#454655] max-w-2xl">{profile?.bio || ''}</p>
          {/* Skills */}
          {skillTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {skillTags.map(b => (
                <span key={b} className="bg-[#eaedff] text-[#454655] px-3 py-1 rounded-full text-xs font-medium">{b}</span>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Score Cards */}
          <div className="col-span-12 grid grid-cols-3 gap-4">
            <div className="bg-[#0623bb] text-white rounded-xl p-6 text-center">
              <p className="text-4xl font-bold">{skillScore}</p>
              <p className="text-xs uppercase tracking-wider opacity-80 mt-1">SkillScore</p>
            </div>
            <div className="bg-[#131b2e] text-white rounded-xl p-6 text-center">
              <p className="text-4xl font-bold">{completions.length > 0 ? Math.round(completions.reduce((s, c) => s + (c.finalScore || 0), 0) / completions.length) : 0}</p>
              <p className="text-xs uppercase tracking-wider opacity-80 mt-1">Avg Score</p>
            </div>
            <div className="bg-white border border-[#c5c5d7] rounded-xl p-6 text-center">
              <p className="text-4xl font-bold text-[#131b2e]">{totalTasks}</p>
              <p className="text-xs uppercase tracking-wider text-[#757686] mt-1">Tasks Completed</p>
            </div>
          </div>

          {/* Performance Radar */}
          <div className="col-span-12 lg:col-span-7 bg-white border border-[#c5c5d7] rounded-xl p-6">
            <h3 className="text-lg font-semibold text-[#131b2e] mb-6">Performance Radar</h3>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(domainScores).filter(([, v]) => v > 0).map(([key, val]) => (
                <div key={key} className="p-3 bg-[#f2f3ff] rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-[#131b2e] capitalize">{key}</span>
                    <span className={`text-sm font-bold ${val >= 90 ? 'text-emerald-600' : 'text-amber-600'}`}>{val}</span>
                  </div>
                  <div className="h-2 bg-[#eaedff] rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${val >= 90 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${val}%` }} />
                  </div>
                </div>
              ))}
              {Object.keys(domainScores).filter(k => domainScores[k] > 0).length === 0 && (
                <p className="text-sm text-[#757686] col-span-2">No domain scores yet.</p>
              )}
            </div>
          </div>

          {/* Skills */}
          <div className="col-span-12 lg:col-span-5 bg-white border border-[#c5c5d7] rounded-xl p-6">
            <h3 className="text-lg font-semibold text-[#131b2e] mb-4">Verified Skills</h3>
            <div className="flex flex-wrap gap-2">
              {skillTags.length > 0 ? skillTags.map(s => (
                <span key={s} className="bg-[#eaedff] text-[#454655] px-4 py-2 rounded-lg text-sm font-medium">{s}</span>
              )) : (
                <p className="text-sm text-[#757686]">No skills listed yet.</p>
              )}
            </div>
          </div>

          {/* Task Completions */}
          <div className="col-span-12 bg-white border border-[#c5c5d7] rounded-xl p-6">
            <h3 className="text-lg font-semibold text-[#131b2e] mb-4">Task Completions</h3>
            <table className="w-full text-left">
              <thead className="bg-[#f2f3ff] text-xs uppercase tracking-wider text-[#454655]">
                <tr>
                  <th className="px-4 py-3">Task</th>
                  <th className="px-4 py-3">Domain</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c5c5d7]">
                {completions.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-[#757686]">No completed tasks to show.</td></tr>
                ) : (
                  completions.map((c, i) => (
                    <tr key={i} className="hover:bg-[#f2f3ff] transition-colors">
                      <td className="px-4 py-3 font-semibold text-sm">{c.taskTitle || 'Task'}</td>
                      <td className="px-4 py-3"><span className="px-2 py-1 bg-[#eaedff] text-[#454655] rounded text-xs font-semibold capitalize">{c.taskType || '—'}</span></td>
                      <td className="px-4 py-3"><span className={`font-bold ${(c.finalScore || 0) >= 90 ? 'text-emerald-600' : 'text-amber-600'}`}>{Math.round(c.finalScore)}</span></td>
                      <td className="px-4 py-3 text-sm text-[#454655]">{formatDate(c.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8 bg-[#0623bb] rounded-2xl p-8 text-center text-white">
          <h3 className="text-2xl font-bold mb-2">Want to hire {(userData.displayName || 'this candidate').split(' ')[0]}?</h3>
          <p className="text-[#c1c6ff] mb-6">Create a company account to send job offers to verified talent.</p>
          <Link href="/register" className="bg-white text-[#0623bb] px-8 py-3 rounded-xl font-bold hover:shadow-xl transition-all">
            Get Started →
          </Link>
        </div>
      </main>
    </>
  );
}
