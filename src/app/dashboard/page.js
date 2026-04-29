'use client';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useRef, useEffect } from 'react';
import { db } from '@/lib/firebase';
import {
  collection, query, where, orderBy, limit, getDocs,
  doc, getDoc, onSnapshot
} from 'firebase/firestore';

export default function CandidateDashboard() {
  const { user, userProfile } = useAuth();
  const [showNotif, setShowNotif] = useState(false);
  const notifRef = useRef(null);

  // Live data states
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [activeTasks, setActiveTasks] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [candidateProfile, setCandidateProfile] = useState(null);
  const [recommendedTasks, setRecommendedTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch all dashboard data
  useEffect(() => {
    if (!user?.uid) return;
    let unsubNotif = null;

    async function loadDashboard() {
      try {
        // 1. Wallet balance
        const walletDoc = await getDoc(doc(db, 'users', user.uid, 'wallet', 'balance'));
        if (walletDoc.exists()) setWallet(walletDoc.data());

        // 2. Recent transactions (last 3)
        const txSnap = await getDocs(
          query(collection(db, 'users', user.uid, 'transactions'), orderBy('createdAt', 'desc'), limit(3))
        );
        setTransactions(txSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        // 3. Active tasks
        const atSnap = await getDocs(
          collection(db, 'users', user.uid, 'activeTasks')
        );
        const activeTasksList = [];
        for (const atDoc of atSnap.docs) {
          const at = atDoc.data();
          // Fetch full task details
          const taskDoc = await getDoc(doc(db, 'tasks', at.taskId));
          if (taskDoc.exists()) {
            activeTasksList.push({ ...at, ...taskDoc.data(), id: atDoc.id });
          }
        }
        setActiveTasks(activeTasksList);

        // 4. Candidate profile (for skill scores)
        const profileDoc = await getDoc(doc(db, 'users', user.uid, 'candidateProfile', 'profile'));
        if (profileDoc.exists()) setCandidateProfile(profileDoc.data());

        // 5. Recommended tasks (live tasks, limit 3)
        const recSnap = await getDocs(
          query(collection(db, 'tasks'), where('status', '==', 'live'), orderBy('createdAt', 'desc'), limit(3))
        );
        setRecommendedTasks(recSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        // 6. Real-time notifications listener (unread count for bell)
        unsubNotif = onSnapshot(
          query(
            collection(db, 'notifications'),
            where('recipientUid', '==', user.uid),
            orderBy('createdAt', 'desc'),
            limit(5)
          ),
          (snap) => {
            setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          },
          (err) => {
            console.warn('Dashboard notification listener error:', err.message);
            // Fallback: just set empty, don't crash
            setNotifications([]);
          }
        );

      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
    return () => { if (unsubNotif) unsubNotif(); };
  }, [user?.uid]);

  // Close notif on outside click
  useEffect(() => {
    const handler = (e) => { if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Helpers
  const formatPaise = (paise) => `₹${((paise || 0) / 100).toLocaleString('en-IN')}`;
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getTimeLeft = (deadline) => {
    if (!deadline) return 'No deadline';
    const dl = deadline.toDate ? deadline.toDate() : new Date(deadline);
    const diff = dl - new Date();
    if (diff <= 0) return 'Expired';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h left`;
    return `${hours}h left`;
  };

  const notifIcon = (type) => {
    const map = { payout_credited: 'payments', new_submission: 'assignment', offer_accepted: 'work', deadline_reminder: 'timer', candidate_joined: 'person_add' };
    return map[type] || 'notifications';
  };

  const notifColor = (type) => {
    const map = { payout_credited: 'bg-emerald-100 text-emerald-600', offer_accepted: 'bg-blue-100 text-blue-600', deadline_reminder: 'bg-amber-100 text-amber-600' };
    return map[type] || 'bg-indigo-100 text-indigo-600';
  };

  // Domain scores for radar
  const domainScores = candidateProfile?.domainScores || { coding: 0, design: 0, data: 0, writing: 0, marketing: 0, finance: 0 };
  const topStrengths = Object.entries(domainScores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([name, pct]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), pct }));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#0623bb] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#454655] font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <header className="mb-12 flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-bold text-[#131b2e] mb-1">Candidate Dashboard</h2>
          <p className="text-[#454655]">Welcome back, {userProfile?.displayName || 'there'}. {candidateProfile?.skillScore > 0 ? `Your SkillScore is ${candidateProfile.skillScore}.` : 'Complete tasks to build your SkillScore.'}</p>
        </div>
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotif(!showNotif)}
            className="relative flex items-center gap-1.5 px-3 py-2 bg-white border border-[#c5c5d7] rounded-lg text-sm font-medium hover:border-[#0623bb] transition-all"
          >
            <span className="material-symbols-outlined text-[#0623bb] text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>notifications</span>
            {unreadCount > 0 ? `${unreadCount} Alert${unreadCount > 1 ? 's' : ''}` : 'No alerts'}
          </button>

          {showNotif && (
            <div className="absolute right-0 top-12 w-[400px] bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-[#131b2e]">Notifications</h3>
                <Link href="/notifications" className="text-xs text-[#0623bb] font-semibold hover:underline">See all</Link>
              </div>
              <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-sm text-[#757686]">No notifications yet</div>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id} className={`px-4 py-3.5 flex items-start gap-3 hover:bg-slate-50 transition-colors cursor-pointer ${!n.isRead ? 'bg-indigo-50/40' : ''}`}>
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${notifColor(n.type)}`}>
                        <span className="material-symbols-outlined text-base">{notifIcon(n.type)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-sm ${!n.isRead ? 'font-bold text-[#131b2e]' : 'font-medium text-slate-700'}`}>{n.title}</p>
                          <span className="text-[10px] text-slate-400 whitespace-nowrap">
                            {n.createdAt?.toDate ? n.createdAt.toDate().toLocaleDateString() : ''}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">{n.body}</p>
                      </div>
                      {!n.isRead && <div className="w-2 h-2 rounded-full bg-[#0623bb] mt-2 shrink-0" />}
                    </div>
                  ))
                )}
              </div>
              <div className="p-3 border-t border-slate-100 text-center">
                <Link href="/notifications" onClick={() => setShowNotif(false)} className="text-xs font-semibold text-[#0623bb] hover:underline">See all notifications</Link>
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="bento-grid">
        {/* SkillScore Widget */}
        <section className="col-span-12 lg:col-span-8 bg-white rounded-xl border border-[#c5c5d7] shadow-[0px_4px_20px_rgba(0,0,0,0.04)] p-6 flex flex-col md:flex-row gap-8 items-center">
          <div className="flex-1 w-full">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-semibold text-[#131b2e] mb-1">Skill Distribution</h3>
                <p className="text-sm text-[#454655]">Verified mastery across core domains.</p>
              </div>
              <div className="bg-[#0623bb]/10 text-[#0623bb] px-3 py-1 rounded-full flex items-center gap-1 border border-[#0623bb]/20">
                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                <span className="text-xs font-semibold">PEI {candidateProfile?.skillScore || 0}</span>
              </div>
            </div>
            {/* Radar Chart */}
            <div className="radar-chart-container relative aspect-square max-w-[300px] mx-auto flex items-center justify-center border border-dashed border-[#0623bb]/20 rounded-full">
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90 opacity-20" viewBox="0 0 100 100">
                  <polygon className="text-[#0623bb]" fill="none" points="50,5 95,35 75,90 25,90 5,35" stroke="currentColor" strokeWidth="0.5" />
                  <polygon className="text-[#0623bb]" fill="none" points="50,15 85,40 70,80 30,80 15,40" stroke="currentColor" strokeWidth="0.5" />
                  <polygon className="text-[#0623bb]" fill="none" points="50,25 75,45 65,70 35,70 25,45" stroke="currentColor" strokeWidth="0.5" />
                </svg>
                <svg className="absolute w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <polygon fill="rgba(6, 35, 187, 0.1)" points={`50,${50 - (domainScores.coding/100)*45} ${50 + (domainScores.design/100)*45},${50 - (domainScores.design/100)*15} ${50 + (domainScores.data/100)*35},${50 + (domainScores.data/100)*40} ${50 - (domainScores.writing/100)*35},${50 + (domainScores.writing/100)*35} ${50 - (domainScores.marketing/100)*45},${50 - (domainScores.marketing/100)*10}`} stroke="#0623bb" strokeWidth="1.5" />
                </svg>
              </div>
              {Object.keys(domainScores).slice(0, 5).map((domain, i) => {
                const positions = [
                  { top: '-16px', left: '50%', transform: 'translateX(-50%)' },
                  { top: '25%', right: '-40px' },
                  { bottom: '0', right: '0' },
                  { bottom: '0', left: '0' },
                  { top: '25%', left: '-48px' },
                ];
                return (
                  <div key={domain} className="absolute text-xs font-semibold bg-white px-2 uppercase tracking-wider" style={positions[i]}>
                    {domain}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="w-px h-full bg-[#c5c5d7] hidden md:block" />
          <div className="w-full md:w-64 space-y-4">
            <h4 className="text-xs font-semibold text-[#454655] uppercase tracking-wider">TOP STRENGTHS</h4>
            {topStrengths.length > 0 ? topStrengths.map(skill => (
              <div key={skill.name}>
                <div className="flex justify-between text-sm font-medium mb-1">
                  <span>{skill.name}</span>
                  <span className="text-[#0623bb]">{skill.pct}%</span>
                </div>
                <div className="w-full h-2 bg-[#eaedff] rounded-full overflow-hidden">
                  <div className="h-full bg-[#0623bb] rounded-full transition-all" style={{ width: `${skill.pct}%` }} />
                </div>
              </div>
            )) : (
              <p className="text-sm text-[#757686]">Complete tasks to build your skill profile.</p>
            )}
          </div>
        </section>

        {/* Wallet Snippet — LIVE DATA */}
        <section className="col-span-12 lg:col-span-4 bg-[#2e42d1] text-white rounded-xl p-6 shadow-sm flex flex-col justify-between overflow-hidden relative">
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <span className="material-symbols-outlined text-[120px]">account_balance_wallet</span>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest opacity-80 mb-3">Available Balance</h3>
            <p className="text-[42px] font-bold leading-tight mb-1">{formatPaise(wallet?.availablePaise)}</p>
            <div className="flex items-center gap-1 text-[#c0c1ff]">
              <span className="material-symbols-outlined text-sm">pending</span>
              <span className="text-sm">+{formatPaise(wallet?.pendingPaise)} pending</span>
            </div>
          </div>
          {/* Recent Transactions */}
          <div className="mt-5 space-y-2.5 relative z-10">
            <p className="text-[10px] font-semibold uppercase tracking-widest opacity-60">Recent</p>
            {transactions.length === 0 ? (
              <p className="text-sm text-white/50">No transactions yet</p>
            ) : (
              transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between text-sm">
                  <span className="text-white/70 truncate mr-3">{tx.taskTitle || tx.type}</span>
                  <span className={`font-semibold whitespace-nowrap ${tx.type.includes('payout') || tx.type.includes('credit') ? 'text-emerald-300' : 'text-red-300'}`}>
                    {tx.type.includes('withdrawal') ? '-' : '+'}{formatPaise(tx.netAmountPaise)}
                  </span>
                </div>
              ))
            )}
          </div>
          <div className="mt-5 pt-4 border-t border-white/10 flex gap-3">
            <Link href="/wallet" className="flex-1 py-3 bg-white text-[#0623bb] rounded-lg font-bold text-sm hover:bg-gray-50 transition-colors text-center">Withdraw</Link>
            <Link href="/wallet" className="flex-1 py-3 bg-white/10 border border-white/20 text-white rounded-lg font-bold text-sm hover:bg-white/20 transition-colors text-center">History</Link>
          </div>
        </section>

        {/* Active Tasks — LIVE DATA */}
        <section className="col-span-12 lg:col-span-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-semibold text-[#131b2e]">Active Tasks</h3>
            <Link href="/tasks" className="text-[#0623bb] font-bold text-sm flex items-center gap-1">
              View all <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {activeTasks.length === 0 ? (
              <div className="col-span-2 bg-white border border-[#c5c5d7] rounded-xl p-8 text-center">
                <span className="material-symbols-outlined text-[48px] text-[#c5c5d7] mb-3 block">assignment</span>
                <p className="font-semibold text-[#131b2e] mb-1">No active tasks</p>
                <p className="text-sm text-[#454655] mb-4">Browse available tasks and join one to get started.</p>
                <Link href="/tasks" className="px-4 py-2 bg-[#0623bb] text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-all">Browse Tasks</Link>
              </div>
            ) : (
              activeTasks.map(task => {
                const timeLeft = getTimeLeft(task.deadline);
                const urgent = timeLeft.includes('h') && !timeLeft.includes('d');
                return (
                  <Link href={`/tasks/${task.taskId}`} key={task.taskId} className="bg-white border border-[#c5c5d7] rounded-xl p-6 hover:border-[#0623bb] transition-colors group">
                    <div className="flex justify-between items-start mb-3">
                      <div className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 ${urgent ? 'bg-[#ffdad6] text-[#93000a]' : 'bg-[#e2e7ff] text-[#454655]'}`}>
                        <span className="material-symbols-outlined text-xs">{urgent ? 'timer' : 'schedule'}</span>
                        {timeLeft}
                      </div>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${task.status === 'submitted' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {task.status === 'submitted' ? 'Submitted' : 'In Progress'}
                      </span>
                    </div>
                    <h4 className="font-semibold text-lg mb-1 group-hover:text-[#0623bb] transition-colors">{task.title || task.taskTitle}</h4>
                    <p className="text-[#454655] text-sm line-clamp-2 mb-4">{task.description?.substring(0, 120) || ''}</p>
                    <div className="flex items-center justify-between p-3 bg-[#eaedff] rounded-lg">
                      <div>
                        <p className="text-[10px] text-[#454655] uppercase font-bold">Prize Pool</p>
                        <p className="font-bold text-[#131b2e]">{formatPaise(task.prizePool)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-[#454655] uppercase font-bold">Submissions</p>
                        <p className="font-bold text-[#131b2e]">{task.totalSubmissions || 0}</p>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </section>

        {/* Recommended Tasks — LIVE DATA */}
        <section className="col-span-12 lg:col-span-4 flex flex-col">
          <h3 className="text-2xl font-semibold text-[#131b2e] mb-6">Recommended For You</h3>
          <div className="flex-1 bg-white border border-[#c5c5d7] rounded-xl overflow-hidden divide-y divide-[#c5c5d7]">
            {recommendedTasks.length === 0 ? (
              <div className="p-6 text-center text-sm text-[#757686]">No tasks available right now</div>
            ) : (
              recommendedTasks.map(task => (
                <Link href={`/tasks/${task.taskId || task.id}`} key={task.id} className="p-4 hover:bg-[#faf8ff] transition-colors cursor-pointer group block">
                  <div className="flex justify-between items-center mb-1">
                    <span className="px-2 py-0.5 bg-[#e1e0ff] text-[#07006c] rounded-full text-[10px] font-bold">{task.taskType?.toUpperCase() || 'TASK'}</span>
                    <span className="text-[#0623bb] font-bold text-sm">{formatPaise(task.prizePool)}</span>
                  </div>
                  <h5 className="font-bold text-[#131b2e] mb-1 group-hover:text-[#0623bb]">{task.title}</h5>
                  <div className="flex flex-wrap gap-1">
                    {(task.skillTags || []).slice(0, 3).map(tag => (
                      <span key={tag} className="px-2 py-0.5 bg-[#eaedff] text-[#454655] rounded text-[10px]">{tag}</span>
                    ))}
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>
    </>
  );
}
