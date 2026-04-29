'use client';
import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';

export default function LiveTaskPage({ params }) {
  const { id } = use(params);
  const { user } = useAuth();
  const [task, setTask] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid || !id) return;

    async function loadTask() {
      try {
        const taskDoc = await getDoc(doc(db, 'tasks', id));
        if (taskDoc.exists()) setTask({ id: taskDoc.id, ...taskDoc.data() });
      } catch (err) {
        console.error('Error loading task:', err);
      } finally {
        setLoading(false);
      }
    }
    loadTask();

    // Real-time submissions listener
    const unsubSubs = onSnapshot(
      query(collection(db, 'submissions'), where('taskId', '==', id), where('companyUid', '==', user.uid), orderBy('createdAt', 'desc')),
      async (snap) => {
        const list = [];
        for (const d of snap.docs) {
          const sub = { id: d.id, ...d.data() };
          const userDoc = await getDoc(doc(db, 'users', sub.candidateUid));
          sub.candidateName = userDoc.exists() ? userDoc.data().displayName : 'Anonymous';
          list.push(sub);
        }
        setSubmissions(list);
      },
      (err) => console.error('Submissions listener error:', err)
    );

    // Real-time Q&A listener
    const unsubQa = onSnapshot(
      query(collection(db, 'tasks', id, 'questions'), orderBy('createdAt', 'desc')),
      (snap) => setQuestions(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
      (err) => console.error('Q&A listener error:', err)
    );

    return () => { unsubSubs(); unsubQa(); };
  }, [user?.uid, id]);

  const formatPaise = (paise) => `₹${((paise || 0) / 100).toLocaleString('en-IN')}`;

  const getTimeLeft = (deadline) => {
    if (!deadline) return 'No deadline';
    const dl = deadline.toDate ? deadline.toDate() : new Date(deadline);
    const diff = dl - new Date();
    if (diff <= 0) return 'Closed';
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return d > 0 ? `${d}d ${h}h remaining` : `${h}h ${m}m remaining`;
  };

  const formatAgo = (ts) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const diff = Date.now() - d.getTime();
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  if (loading || !task) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-[#0623bb] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const progress = task.maxCandidates ? ((task.totalSubmissions || submissions.length) / task.maxCandidates) * 100 : 0;
  const timeLeft = getTimeLeft(task.deadline);
  const flaggedSubs = submissions.filter(s => s.integrityFlag);

  return (
    <>
      <header className="mb-8 flex justify-between items-start">
        <div>
          <Link href="/company/dashboard" className="text-sm text-[#0623bb] font-medium hover:underline mb-2 inline-flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">arrow_back</span> Back to Dashboard
          </Link>
          <h1 className="text-4xl font-bold text-[#131b2e] mt-2">{task.title}</h1>
          <div className="flex items-center gap-4 mt-2">
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${task.status === 'live' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{task.status === 'live' ? 'Active' : task.status}</span>
            <span className="text-sm text-[#454655]">{task.domain || task.taskType}</span>
            <span className="text-sm text-[#454655]">•</span>
            <span className="text-sm text-[#454655] capitalize">{task.difficulty}</span>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 border border-amber-300 text-amber-700 rounded-lg text-sm font-semibold hover:bg-amber-50 transition-all">
            <span className="material-symbols-outlined text-sm mr-1">schedule</span> Extend Deadline
          </button>
          <button className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-50 transition-all">
            Cancel Task
          </button>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-6">
        {/* Real-time stats */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white border border-[#c5c5d7] rounded-xl p-6">
              <p className="text-xs font-semibold text-[#454655] uppercase tracking-wider mb-2">Submissions</p>
              <p className="text-3xl font-bold text-[#131b2e]">{submissions.length}<span className="text-lg text-[#757686]">/{task.maxCandidates || '∞'}</span></p>
              <div className="mt-3 h-2 bg-[#eaedff] rounded-full overflow-hidden">
                <div className="h-full bg-[#0623bb] rounded-full transition-all" style={{ width: `${Math.min(progress, 100)}%` }} />
              </div>
            </div>
            <div className="bg-white border border-[#c5c5d7] rounded-xl p-6">
              <p className="text-xs font-semibold text-[#454655] uppercase tracking-wider mb-2">Time Remaining</p>
              <p className={`text-3xl font-bold ${timeLeft === 'Closed' ? 'text-red-600' : 'text-[#131b2e]'}`}>{timeLeft}</p>
              <p className="text-xs text-[#757686] mt-2">Deadline: {task.deadline ? (task.deadline.toDate ? task.deadline.toDate() : new Date(task.deadline)).toLocaleDateString() : '—'}</p>
            </div>
            <div className="bg-white border border-[#c5c5d7] rounded-xl p-6">
              <p className="text-xs font-semibold text-[#454655] uppercase tracking-wider mb-2">Prize Pool</p>
              <p className="text-3xl font-bold text-emerald-600">{formatPaise(task.prizePool)}</p>
              <p className="text-xs text-[#757686] mt-2">Locked in escrow</p>
            </div>
          </div>

          {/* Recent Submissions */}
          <section className="bg-white border border-[#c5c5d7] rounded-xl p-6">
            <h3 className="text-xl font-semibold text-[#131b2e] mb-4">Recent Submissions</h3>
            <table className="w-full text-left">
              <thead className="bg-[#f2f3ff] text-xs uppercase tracking-wider text-[#454655]">
                <tr>
                  <th className="px-4 py-3">Candidate</th>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3">AI Score</th>
                  <th className="px-4 py-3">Integrity</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c5c5d7]">
                {submissions.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-[#757686]">No submissions yet</td></tr>
                ) : (
                  submissions.map(s => (
                    <tr key={s.id} className="hover:bg-[#f2f3ff] transition-colors">
                      <td className="px-4 py-3 font-semibold">{s.candidateName}</td>
                      <td className="px-4 py-3 text-sm text-[#454655]">{formatAgo(s.createdAt)}</td>
                      <td className="px-4 py-3">
                        <span className={`font-bold ${(s.finalScore || 0) >= 90 ? 'text-emerald-600' : (s.finalScore || 0) >= 70 ? 'text-amber-600' : 'text-red-500'}`}>
                          {s.finalScore ? Math.round(s.finalScore) : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${s.integrityFlag ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {s.integrityFlag || 'Clean'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/company/tasks/${id}/review?sub=${s.id}`} className="text-[#0623bb] text-sm font-semibold hover:underline">Review</Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>
        </div>

        {/* Side panels */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          {/* Integrity Flags */}
          <section className="bg-white border border-[#c5c5d7] rounded-xl p-6">
            <h3 className="text-lg font-semibold text-[#131b2e] mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-500">flag</span> Integrity Flags
            </h3>
            <div className="space-y-3">
              {flaggedSubs.length === 0 ? (
                <p className="text-sm text-[#757686]">No integrity flags raised. All clear!</p>
              ) : (
                flaggedSubs.map(f => (
                  <div key={f.id} className="p-3 rounded-lg border border-red-200 bg-red-50">
                    <p className="text-sm font-semibold">{f.candidateName}</p>
                    <p className="text-xs text-[#454655] mt-1">{f.integrityFlag}</p>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Q&A Inbox */}
          <section className="bg-white border border-[#c5c5d7] rounded-xl p-6">
            <h3 className="text-lg font-semibold text-[#131b2e] mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#0623bb]">forum</span> Q&A Inbox
              {questions.length > 0 && <span className="ml-auto bg-[#0623bb] text-white text-xs px-2 py-0.5 rounded-full">{questions.length}</span>}
            </h3>
            <div className="space-y-3">
              {questions.length === 0 ? (
                <p className="text-sm text-[#757686]">No questions from candidates yet.</p>
              ) : (
                questions.map(qa => (
                  <div key={qa.id} className="p-3 bg-[#f2f3ff] rounded-lg">
                    <p className="text-sm font-medium text-[#131b2e]">{qa.question}</p>
                    <div className="flex justify-between items-center mt-2">
                      <p className="text-xs text-[#757686]">{qa.candidateName || 'Candidate'} • {formatAgo(qa.createdAt)}</p>
                      <button className="text-xs text-[#0623bb] font-semibold hover:underline">Reply</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
