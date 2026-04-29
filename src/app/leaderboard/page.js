'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

export default function LeaderboardPage() {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [domainFilter, setDomainFilter] = useState('all');

  useEffect(() => {
    async function loadLeaderboard() {
      try {
        // Get all candidate users
        const usersSnap = await getDocs(
          query(collection(db, 'users'), where('role', '==', 'candidate'))
        );

        const candidateList = [];
        for (const userDoc of usersSnap.docs) {
          const userData = userDoc.data();
          const profileDoc = await getDoc(doc(db, 'users', userDoc.id, 'candidateProfile', 'profile'));
          const profile = profileDoc.exists() ? profileDoc.data() : {};

          if (profile.skillScore > 0 || profile.totalTasksCompleted > 0) {
            const walletDoc = await getDoc(doc(db, 'users', userDoc.id, 'wallet', 'balance'));
            const wallet = walletDoc.exists() ? walletDoc.data() : {};

            candidateList.push({
              uid: userDoc.id,
              name: userData.displayName || 'Anonymous',
              photoURL: userData.photoURL,
              domain: profile.domain || 'Engineering',
              skillScore: profile.skillScore || 0,
              totalTasks: profile.totalTasksCompleted || 0,
              totalEarned: wallet.totalEarnedPaise || 0,
              skillTags: profile.skillTags || [],
            });
          }
        }

        // Sort by skillScore descending
        candidateList.sort((a, b) => b.skillScore - a.skillScore);
        setLeaders(candidateList);
      } catch (err) {
        console.error('Error loading leaderboard:', err);
      } finally {
        setLoading(false);
      }
    }

    loadLeaderboard();
  }, []);

  const formatPaise = (paise) => `₹${((paise || 0) / 100).toLocaleString('en-IN')}`;

  const filtered = domainFilter === 'all' ? leaders :
    leaders.filter(l => l.domain?.toLowerCase() === domainFilter.toLowerCase());

  const badges = ['🏆', '🥈', '🥉'];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-[#0623bb] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <header className="mb-12 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-bold text-[#131b2e] mb-2">Global Leaderboard</h1>
          <p className="text-[#454655]">Real-time rankings based on verified Performance Evidence Index.</p>
        </div>
        <div className="flex gap-3">
          <select
            className="text-sm border border-[#c5c5d7] rounded-lg px-3 py-2 bg-white"
            value={domainFilter}
            onChange={(e) => setDomainFilter(e.target.value)}
          >
            <option value="all">All Domains</option>
            <option value="engineering">Engineering</option>
            <option value="design">Design</option>
            <option value="data">Data Science</option>
            <option value="security">Security</option>
          </select>
        </div>
      </header>

      {/* Top 3 */}
      {filtered.length >= 3 && (
        <div className="grid grid-cols-3 gap-6 mb-12">
          {filtered.slice(0, 3).map((l, i) => (
            <Link href={`/u/${l.uid}`} key={l.uid} className={`block rounded-2xl p-6 text-center border transition-all hover:shadow-lg hover:-translate-y-1 ${i === 0 ? 'bg-gradient-to-b from-amber-50 to-white border-amber-200 shadow-lg' : 'bg-white border-[#c5c5d7]'}`}>
              <div className="text-4xl mb-3">{badges[i]}</div>
              {l.photoURL ? (
                <img src={l.photoURL} alt={l.name} className="w-16 h-16 rounded-full mx-auto mb-4 object-cover" />
              ) : (
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold ${i === 0 ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-600'}`}>
                  {l.name.charAt(0)}
                </div>
              )}
              <h3 className="text-lg font-bold text-[#131b2e]">{l.name}</h3>
              <p className="text-sm text-[#454655] mb-3">{l.domain}</p>
              <p className="text-3xl font-bold text-[#0623bb] mb-1">{l.skillScore}</p>
              <p className="text-xs text-[#757686] uppercase font-semibold">Skill Score</p>
            </Link>
          ))}
        </div>
      )}

      {/* Full Table */}
      <div className="bg-white border border-[#c5c5d7] rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-[#f2f3ff] text-xs uppercase tracking-wider text-[#454655]">
            <tr><th className="px-6 py-4">#</th><th className="px-6 py-4">User</th><th className="px-6 py-4">Skill Score</th><th className="px-6 py-4">Tasks</th><th className="px-6 py-4">Earned</th></tr>
          </thead>
          <tbody className="divide-y divide-[#c5c5d7]">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-[#757686]">
                  <span className="material-symbols-outlined text-[48px] text-[#c5c5d7] mb-2 block">leaderboard</span>
                  No candidates ranked yet. Be the first!
                </td>
              </tr>
            ) : (
              filtered.map((l, i) => (
                <tr key={l.uid} className="hover:bg-[#f2f3ff] transition-colors cursor-pointer" onClick={() => window.location.href = `/u/${l.uid}`}>
                  <td className="px-6 py-4 font-bold text-[#131b2e]">{badges[i] || i + 1}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {l.photoURL ? (
                        <img src={l.photoURL} alt={l.name} className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-xs">{l.name.charAt(0)}</div>
                      )}
                      <div><p className="font-semibold text-sm">{l.name}</p><p className="text-xs text-[#454655]">{l.domain}</p></div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-bold text-[#0623bb] text-lg">{l.skillScore}</td>
                  <td className="px-6 py-4">{l.totalTasks}</td>
                  <td className="px-6 py-4 font-semibold text-emerald-600">{formatPaise(l.totalEarned)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* CTA */}
      <div className="mt-8 bg-[#f2f3ff] border border-[#c5c5d7] rounded-2xl p-8 text-center">
        <h3 className="text-xl font-bold text-[#131b2e] mb-2">Want to see your name here?</h3>
        <p className="text-sm text-[#454655] mb-4">Join SkillProof, complete tasks, and climb the global leaderboard.</p>
        <Link href="/register" className="bg-[#0623bb] text-white px-8 py-3 rounded-xl font-semibold hover:opacity-90 transition-all">
          Get Started Free →
        </Link>
      </div>
    </>
  );
}
