'use client';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import {
  collection, query, where, orderBy, limit, getDocs,
  doc, getDoc, onSnapshot
} from 'firebase/firestore';

export default function CompanyDashboard() {
  const { user, userProfile } = useAuth();

  const [companyProfile, setCompanyProfile] = useState(null);
  const [activeTasks, setActiveTasks] = useState([]);
  const [escrowTotal, setEscrowTotal] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [topPerformers, setTopPerformers] = useState([]);
  const [stats, setStats] = useState({ totalSubmissions: 0, shortlisted: 0, offersExtended: 0, hired: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;
    let unsubNotif = null;

    async function loadDashboard() {
      try {
        // 1. Company profile
        const profileDoc = await getDoc(doc(db, 'users', user.uid, 'companyProfile', 'profile'));
        if (profileDoc.exists()) setCompanyProfile(profileDoc.data());

        // 2. Active tasks (company's tasks that are live or under_review)
        const tasksSnap = await getDocs(
          query(collection(db, 'tasks'), where('companyUid', '==', user.uid), orderBy('createdAt', 'desc'), limit(10))
        );
        const tasksList = tasksSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setActiveTasks(tasksList);

        // Calculate pipeline stats from tasks
        let totalSubs = 0;
        tasksList.forEach(t => { totalSubs += t.totalSubmissions || 0; });
        setStats(prev => ({ ...prev, totalSubmissions: totalSubs }));

        // 3. Escrow totals from escrowAccounts
        const escrowSnap = await getDocs(
          query(collection(db, 'escrowAccounts'), where('companyUid', '==', user.uid), where('status', '==', 'held'))
        );
        let escrowSum = 0;
        escrowSnap.forEach(d => { escrowSum += d.data().prizePoolPaise || 0; });
        setEscrowTotal(escrowSum);

        // 4. Job offers stats
        const offersSnap = await getDocs(
          query(collection(db, 'jobOffers'), where('companyUid', '==', user.uid))
        );
        let extended = 0, hired = 0;
        offersSnap.forEach(d => {
          extended++;
          if (d.data().status === 'accepted') hired++;
        });
        setStats(prev => ({ ...prev, offersExtended: extended, hired }));

        // 5. Top performers (candidates with high skillScores — global query)
        // For now show from submissions of this company's tasks
        const subsSnap = await getDocs(
          query(collection(db, 'submissions'), where('companyUid', '==', user.uid), orderBy('finalScore', 'desc'), limit(3))
        );
        const performers = [];
        for (const subDoc of subsSnap.docs) {
          const sub = subDoc.data();
          if (!sub.candidateUid || !sub.finalScore) continue;
          const userDoc = await getDoc(doc(db, 'users', sub.candidateUid));
          const userData = userDoc.exists() ? userDoc.data() : {};
          performers.push({
            name: userData.displayName || 'Anonymous',
            score: Math.round(sub.finalScore),
            taskTitle: sub.taskTitle || '',
          });
        }
        setTopPerformers(performers);

        // 6. Real-time notifications
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
            console.warn('Company notification listener error:', err.message);
            setNotifications([]);
          }
        );

      } catch (err) {
        console.error('Company dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
    return () => { if (unsubNotif) unsubNotif(); };
  }, [user?.uid]);

  const formatPaise = (paise) => `₹${((paise || 0) / 100).toLocaleString('en-IN')}`;

  const getTimeLeft = (deadline) => {
    if (!deadline) return '—';
    const dl = deadline.toDate ? deadline.toDate() : new Date(deadline);
    const diff = dl - new Date();
    if (diff <= 0) return 'Expired';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d left`;
    return `${hours}h left`;
  };

  const statusLabel = (s) => {
    const map = { draft: 'Draft', live: 'Active', under_review: 'Reviewing', completed: 'Completed', cancelled: 'Cancelled' };
    return map[s] || s;
  };

  const statusColor = (s) => {
    if (s === 'live') return 'bg-emerald-100 text-emerald-700';
    if (s === 'under_review') return 'bg-amber-100 text-amber-700';
    if (s === 'completed') return 'bg-blue-100 text-blue-700';
    if (s === 'draft') return 'bg-slate-100 text-slate-600';
    return 'bg-red-100 text-red-700';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#0623bb] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#454655] font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const liveTaskCount = activeTasks.filter(t => t.status === 'live' || t.status === 'under_review').length;

  return (
    <>
      <header className="mb-12 flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-bold text-[#131b2e] mb-1">Company Dashboard</h2>
          <p className="text-[#454655]">
            Welcome back, {companyProfile?.companyName || userProfile?.displayName || 'there'}.
            {liveTaskCount > 0 ? ` You have ${liveTaskCount} active task${liveTaskCount > 1 ? 's' : ''} and ${stats.totalSubmissions} total submissions.` : ' Post your first task to get started.'}
          </p>
        </div>
        <Link href="/company/tasks/new" className="flex items-center gap-2 px-6 py-3 bg-[#0623bb] text-white font-semibold rounded-xl shadow-lg hover:opacity-90 transition-all active:scale-95">
          <span className="material-symbols-outlined">add</span> Post a Task
        </Link>
      </header>

      <div className="bento-grid">
        {/* Hiring Funnel */}
        <section className="col-span-12 lg:col-span-8 bg-white rounded-xl border border-[#c5c5d7] p-8 shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h3 className="text-2xl font-semibold mb-1 text-[#131b2e]">Hiring Funnel</h3>
              <p className="text-sm text-[#454655]">Active pipeline across all open tasks.</p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-1 mb-8">
            {[
              { label: 'Tasks', value: activeTasks.length, color: 'bg-[#eaedff] text-[#131b2e]' },
              { label: 'Submissions', value: stats.totalSubmissions, color: 'bg-[#dfe0ff] text-[#131b2e]' },
              { label: 'Shortlisted', value: stats.shortlisted, color: 'bg-[#c1c6ff] text-[#131b2e]' },
              { label: 'Offers', value: stats.offersExtended, color: 'bg-[#8b93e6] text-white' },
              { label: 'Hired', value: stats.hired, color: 'bg-[#0623bb] text-white' },
            ].map((step, i) => (
              <div key={step.label} className={`flex-1 px-4 py-6 ${step.color} rounded-lg text-center ${i > 0 ? '-ml-1' : ''}`} style={{ flex: `${5 - i}` }}>
                <p className="text-3xl font-bold">{step.value}</p>
                <p className="text-xs font-semibold mt-1 uppercase tracking-wider opacity-80">{step.label}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Conversion Rate', value: stats.totalSubmissions > 0 ? `${((stats.hired / stats.totalSubmissions) * 100).toFixed(1)}%` : '0%', desc: 'Submission → Hire' },
              { label: 'Active Tasks', value: liveTaskCount, desc: 'Currently running' },
              { label: 'Total Spent', value: formatPaise(companyProfile?.totalSpent), desc: 'Lifetime on platform' },
            ].map(m => (
              <div key={m.label} className="bg-[#f2f3ff] p-4 rounded-lg">
                <p className="text-xs font-semibold text-[#454655] uppercase tracking-wider mb-1">{m.label}</p>
                <p className="text-2xl font-bold text-[#131b2e]">{m.value}</p>
                <p className="text-[10px] text-[#757686] mt-1">{m.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Escrow Summary — LIVE DATA */}
        <section className="col-span-12 lg:col-span-4 bg-[#131b2e] text-white rounded-xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-[#c1c6ff] mb-4">Escrow Balance</h3>
            <p className="text-[42px] font-bold leading-tight mb-1">{formatPaise(escrowTotal)}</p>
            <div className="flex items-center gap-1 text-[#c1c6ff] text-sm">
              <span className="material-symbols-outlined text-sm">lock</span>
              <span>Locked in {activeTasks.filter(t => t.status === 'live').length} active task{activeTasks.filter(t => t.status === 'live').length !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <div className="mt-8 space-y-4">
            <div className="flex justify-between p-3 bg-white/10 rounded-lg">
              <span className="text-sm">Total deposited</span>
              <span className="font-bold text-emerald-400">{formatPaise(companyProfile?.totalSpent || escrowTotal)}</span>
            </div>
            <Link href="/company/billing" className="block w-full py-3 bg-[#0623bb] text-white rounded-lg font-semibold text-sm hover:bg-[#2e42d1] transition-all text-center">
              Review &amp; Release Payouts
            </Link>
          </div>
        </section>

        {/* Active Tasks Table — LIVE DATA */}
        <section className="col-span-12 bg-white rounded-xl border border-[#c5c5d7] p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-semibold text-[#131b2e]">Active Tasks</h3>
            <Link href="/company/tasks/new" className="text-[#0623bb] font-semibold text-sm flex items-center gap-1 hover:underline">
              Post a task <span className="material-symbols-outlined text-sm">add</span>
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#f2f3ff] text-xs uppercase tracking-wider text-[#454655]">
                <tr>
                  <th className="px-6 py-3 font-semibold">Task</th>
                  <th className="px-6 py-3 font-semibold">Budget</th>
                  <th className="px-6 py-3 font-semibold">Submissions</th>
                  <th className="px-6 py-3 font-semibold">Deadline</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                  <th className="px-6 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c5c5d7]">
                {activeTasks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-[#757686]">
                      <span className="material-symbols-outlined text-[48px] text-[#c5c5d7] mb-2 block">task_alt</span>
                      No tasks yet. <Link href="/company/tasks/new" className="text-[#0623bb] font-semibold hover:underline">Post your first task</Link>
                    </td>
                  </tr>
                ) : (
                  activeTasks.map(task => (
                    <tr key={task.id} className="hover:bg-[#f2f3ff] transition-colors">
                      <td className="px-6 py-4 font-semibold text-[#131b2e]">{task.title}</td>
                      <td className="px-6 py-4 text-emerald-600 font-medium">{formatPaise(task.prizePool)}</td>
                      <td className="px-6 py-4">{task.totalSubmissions || 0}</td>
                      <td className="px-6 py-4">{getTimeLeft(task.deadline)}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${statusColor(task.status)}`}>{statusLabel(task.status)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <Link href={`/company/tasks/${task.taskId || task.id}/live`} className="text-[#0623bb] font-semibold text-sm hover:underline">Review</Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Top Performers — LIVE DATA */}
        <section className="col-span-12 lg:col-span-6 bg-white rounded-xl border border-[#c5c5d7] p-6">
          <h3 className="text-xl font-semibold text-[#131b2e] mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#0623bb]">stars</span> Top Performers
          </h3>
          <div className="divide-y divide-[#c5c5d7]">
            {topPerformers.length === 0 ? (
              <p className="py-8 text-center text-sm text-[#757686]">No submissions scored yet</p>
            ) : (
              topPerformers.map((p, i) => (
                <div key={i} className="flex justify-between items-center py-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-sm">{p.name.charAt(0)}</div>
                    <div>
                      <p className="font-semibold text-[#131b2e]">{p.name}</p>
                      <p className="text-xs text-[#454655]">{p.taskTitle}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[#757686]">{i === 0 ? '🏆 Top Score' : i === 1 ? '⭐ Runner Up' : '✓ Qualified'}</p>
                    <p className="font-bold text-[#0623bb] text-lg">{p.score}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Recent Activity — LIVE NOTIFICATIONS */}
        <section className="col-span-12 lg:col-span-6 bg-white rounded-xl border border-[#c5c5d7] p-6">
          <h3 className="text-xl font-semibold text-[#131b2e] mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#0623bb]">notifications</span> Recent Activity
          </h3>
          <div className="space-y-4">
            {notifications.length === 0 ? (
              <p className="py-8 text-center text-sm text-[#757686]">No recent activity</p>
            ) : (
              notifications.map((n) => {
                const typeColor = n.type === 'payout_credited' ? 'bg-emerald-500' : n.type === 'new_submission' ? 'bg-[#0623bb]' : 'bg-amber-500';
                return (
                  <div key={n.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-[#f2f3ff] transition-colors">
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${typeColor}`} />
                    <div>
                      <p className="text-sm text-[#131b2e]">{n.body || n.title}</p>
                      <p className="text-xs text-[#757686]">
                        {n.createdAt?.toDate ? n.createdAt.toDate().toLocaleDateString() : ''}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <Link href="/company/notifications" className="mt-4 flex items-center justify-center gap-1 text-sm text-[#0623bb] font-semibold hover:underline pt-3 border-t border-[#c5c5d7]">
            See all notifications <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </Link>
        </section>
      </div>
    </>
  );
}
