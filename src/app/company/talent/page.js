'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import {
  collection, query, where, orderBy, getDocs,
  doc, getDoc
} from 'firebase/firestore';

export default function TalentPoolPage() {
  const { user } = useAuth();
  const [talents, setTalents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [domainFilter, setDomainFilter] = useState('all');

  useEffect(() => {
    if (!user?.uid) return;

    async function loadTalent() {
      try {
        // Get candidates who submitted to this company's tasks
        const subsSnap = await getDocs(
          query(collection(db, 'submissions'), where('companyUid', '==', user.uid))
        );

        // Unique candidate UIDs
        const candidateUids = [...new Set(subsSnap.docs.map(d => d.data().candidateUid))];

        // Fetch each candidate's profile
        const talentList = [];
        for (const uid of candidateUids) {
          const [userDoc, profileDoc] = await Promise.all([
            getDoc(doc(db, 'users', uid)),
            getDoc(doc(db, 'users', uid, 'candidateProfile', 'profile'))
          ]);

          if (!userDoc.exists()) continue;
          const userData = userDoc.data();
          const profile = profileDoc.exists() ? profileDoc.data() : {};

          // Count submissions for this company
          const submissionCount = subsSnap.docs.filter(d => d.data().candidateUid === uid).length;

          // Best score for this company
          const scores = subsSnap.docs
            .filter(d => d.data().candidateUid === uid && d.data().finalScore)
            .map(d => d.data().finalScore);
          const bestScore = scores.length > 0 ? Math.max(...scores) : 0;

          talentList.push({
            uid,
            name: userData.displayName || 'Anonymous',
            photoURL: userData.photoURL,
            domain: profile.domain || 'Engineering',
            skillTags: profile.skillTags || [],
            skillScore: profile.skillScore || 0,
            totalTasksCompleted: profile.totalTasksCompleted || 0,
            submissionCount,
            bestScore: Math.round(bestScore),
          });
        }

        // Sort by skill score descending
        talentList.sort((a, b) => b.skillScore - a.skillScore);
        setTalents(talentList);
      } catch (err) {
        console.error('Error loading talent pool:', err);
      } finally {
        setLoading(false);
      }
    }

    loadTalent();
  }, [user?.uid]);

  const filtered = talents.filter(t => {
    const matchesSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.skillTags.some(s => s.toLowerCase().includes(search.toLowerCase()));
    const matchesDomain = domainFilter === 'all' || t.domain?.toLowerCase() === domainFilter.toLowerCase();
    return matchesSearch && matchesDomain;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-[#0623bb] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-bold text-[#131b2e] mb-1">Talent Pool</h1>
          <p className="text-[#454655]">Browse verified candidates ranked by performance evidence.</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
            <input
              className="pl-9 pr-4 py-2 bg-white border border-[#c5c5d7] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0623bb]"
              placeholder="Search talent..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="text-sm border border-[#c5c5d7] rounded-lg px-3 py-2 bg-white"
            value={domainFilter}
            onChange={(e) => setDomainFilter(e.target.value)}
          >
            <option value="all">All Domains</option>
            <option value="engineering">Engineering</option>
            <option value="design">Design</option>
            <option value="data">Data Science</option>
            <option value="marketing">Marketing</option>
          </select>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filtered.length === 0 ? (
          <div className="col-span-2 text-center py-16 bg-white border border-[#c5c5d7] rounded-xl">
            <span className="material-symbols-outlined text-[48px] text-[#c5c5d7] mb-3 block">person_search</span>
            <p className="font-semibold text-[#131b2e] mb-1">No candidates found</p>
            <p className="text-sm text-[#454655]">{talents.length === 0 ? 'Post tasks to attract candidates to your talent pool.' : 'Try adjusting your search or filters.'}</p>
          </div>
        ) : (
          filtered.map(t => (
            <div key={t.uid} className="bg-white border border-[#c5c5d7] rounded-xl p-6 hover:border-[#0623bb] transition-colors">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-4">
                  {t.photoURL ? (
                    <img src={t.photoURL} alt={t.name} className="w-14 h-14 rounded-full object-cover" />
                  ) : (
                    <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-lg">{t.name.charAt(0)}</div>
                  )}
                  <div>
                    <h3 className="font-bold text-lg text-[#131b2e]">{t.name}</h3>
                    <p className="text-sm text-[#454655]">{t.domain}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-[#0623bb]">{t.skillScore}</p>
                  <p className="text-[10px] text-[#757686]">SKILL SCORE</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                {t.skillTags.slice(0, 4).map(b => (
                  <span key={b} className="bg-[#eaedff] text-[#454655] px-3 py-1 rounded-full text-xs font-medium">{b}</span>
                ))}
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-[#c5c5d7]">
                <div className="flex gap-4 text-sm text-[#454655]">
                  <span>{t.totalTasksCompleted} tasks</span>
                  <span>{t.submissionCount} submissions</span>
                  {t.bestScore > 0 && <span className="text-emerald-600 font-semibold">Best: {t.bestScore}</span>}
                </div>
                <div className="flex gap-2">
                  <Link href={`/company/candidates/${t.uid}`} className="px-4 py-2 text-sm font-semibold border border-[#0623bb] text-[#0623bb] rounded-lg hover:bg-[#0623bb]/5 transition-all">View Profile</Link>
                  <button className="px-4 py-2 text-sm font-semibold bg-[#0623bb] text-white rounded-lg hover:opacity-90 transition-all">Send Offer</button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
