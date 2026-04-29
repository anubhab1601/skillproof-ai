'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, orderBy, getDocs, where } from 'firebase/firestore';

export default function TaskDetailPage() {
  const params = useParams();
  const { user } = useAuth();
  const [task, setTask] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [submissionId, setSubmissionId] = useState(null);

  useEffect(() => {
    if (!params.id) return;

    async function loadTask() {
      try {
        const taskDoc = await getDoc(doc(db, 'tasks', params.id));
        if (taskDoc.exists()) {
          setTask({ id: taskDoc.id, ...taskDoc.data() });
        }

        // Load Q&A
        const qaSnap = await getDocs(
          query(collection(db, 'tasks', params.id, 'questions'), orderBy('createdAt', 'desc'))
        );
        setQuestions(qaSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        // Check if current user already submitted
        if (user?.uid) {
          const subSnap = await getDocs(
            query(collection(db, 'submissions'), where('taskId', '==', params.id), where('candidateUid', '==', user.uid))
          );
          if (!subSnap.empty) {
            setAlreadySubmitted(true);
            setSubmissionId(subSnap.docs[0].id);
          }
        }
      } catch (err) {
        console.error('Error loading task:', err);
      } finally {
        setLoading(false);
      }
    }

    loadTask();
  }, [params.id, user?.uid]);

  const formatPaise = (paise) => `₹${((paise || 0) / 100).toLocaleString('en-IN')}`;

  const getTimeLeft = (deadline) => {
    if (!deadline) return { text: 'No deadline', urgent: false };
    const dl = deadline.toDate ? deadline.toDate() : new Date(deadline);
    const diff = dl - new Date();
    if (diff <= 0) return { text: 'Closed', urgent: true };
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(hours / 24);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    if (days > 0) return { text: `${days}d ${hours % 24}h remaining`, urgent: false };
    return { text: `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`, urgent: true };
  };

  const formatAgo = (ts) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const diff = Date.now() - d.getTime();
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  const taskIcon = (type) => {
    const map = { coding: 'code', design: 'palette', data: 'analytics', security: 'shield' };
    return map[type?.toLowerCase()] || 'task_alt';
  };

  if (loading) {
    return (
      <div className="max-w-[1280px] mx-auto p-8 lg:p-12 flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-[#0623bb] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="max-w-[1280px] mx-auto p-8 lg:p-12 text-center py-16">
        <span className="material-symbols-outlined text-[64px] text-[#c5c5d7] mb-4 block">search_off</span>
        <h1 className="text-2xl font-bold text-[#131b2e] mb-2">Task Not Found</h1>
        <p className="text-[#454655]">This task doesn&apos;t exist or has been removed.</p>
        <Link href="/tasks" className="inline-block mt-6 text-[#0623bb] font-semibold hover:underline">← Back to Marketplace</Link>
      </div>
    );
  }

  const timeInfo = getTimeLeft(task.deadline);
  const rubric = task.rubric || {};
  const skills = task.skillTags || task.requiredSkills || [];

  return (
    <div className="max-w-[1280px] mx-auto p-8 lg:p-12">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-[#e2e7ff] flex items-center justify-center border border-[#c5c5d7]">
            <span className="material-symbols-outlined text-indigo-600 text-3xl">{taskIcon(task.taskType)}</span>
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-4xl font-bold text-[#131b2e]">{task.title}</h1>
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span> ESCROW SECURED
              </span>
            </div>
            <p className="text-[#454655]">by <span className="font-semibold text-[#0623bb]">{task.companyName || 'Anonymous Company'}</span></p>
          </div>
        </div>
        <div className={`${timeInfo.urgent ? 'bg-[#ffdad6] text-[#ba1a1a] border-[#ba1a1a]/20' : 'bg-[#eaedff] text-[#0623bb] border-[#0623bb]/20'} rounded-xl p-4 flex items-center gap-4 border`}>
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-widest opacity-80">Time Remaining</span>
            <div className="text-3xl font-extrabold tracking-tight">{timeInfo.text}</div>
          </div>
          <span className="material-symbols-outlined text-[40px] opacity-20">timer</span>
        </div>
      </header>

      {/* Metrics */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
        {[
          { label: 'PRIZE POOL', value: formatPaise(task.prizePool), color: 'text-[#0623bb]' },
          { label: 'DIFFICULTY', value: task.difficulty ? task.difficulty.charAt(0).toUpperCase() + task.difficulty.slice(1) : '—', color: 'text-[#131b2e]' },
          { label: 'MAX SUBMISSIONS', value: task.maxCandidates || '∞', color: 'text-[#131b2e]' },
          { label: 'SUBMISSIONS', value: task.totalSubmissions || 0, color: 'text-[#4648d4]' },
        ].map(m => (
          <div key={m.label} className="bg-white border border-[#c5c5d7] rounded-xl p-6 shadow-sm">
            <p className="text-xs font-semibold text-[#757686] mb-2 uppercase tracking-wider">{m.label}</p>
            <p className={`text-3xl font-bold ${m.color}`}>{m.value}</p>
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-12">
          {/* Brief */}
          <section className="bg-white border border-[#c5c5d7] rounded-xl p-8">
            {skills.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {skills.map(tag => (
                  <span key={tag} className="px-3 py-1 bg-[#dfe0ff] text-[#000b62] rounded-full text-xs font-semibold">{tag}</span>
                ))}
              </div>
            )}
            <h2 className="text-2xl font-semibold mb-4">The Objective</h2>
            <p className="text-[#454655] mb-4 leading-relaxed whitespace-pre-wrap">{task.description || 'No description provided.'}</p>
            {task.deliverables && (
              <>
                <h2 className="text-2xl font-semibold mb-4">Submission Requirements</h2>
                <p className="text-[#454655] leading-relaxed whitespace-pre-wrap">{task.deliverables}</p>
              </>
            )}
          </section>

          {/* Rubric */}
          {Object.keys(rubric).length > 0 && (
            <section>
              <h3 className="text-2xl font-semibold mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#0623bb]">assessment</span> Evaluation Rubric
              </h3>
              <div className="overflow-hidden border border-[#c5c5d7] rounded-xl bg-white">
                <table className="w-full text-left">
                  <thead className="bg-[#eaedff]">
                    <tr>
                      <th className="px-6 py-4 text-xs font-semibold text-[#757686] uppercase tracking-wider">Criteria</th>
                      <th className="px-6 py-4 text-xs font-semibold text-[#757686] uppercase tracking-wider text-right">Weight</th>
                      <th className="px-6 py-4 text-xs font-semibold text-[#757686] uppercase tracking-wider">Assessor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#c5c5d7]">
                    {Object.entries(rubric).map(([criteria, weight]) => (
                      <tr key={criteria}>
                        <td className="px-6 py-4 font-medium">{criteria}</td>
                        <td className="px-6 py-4 text-right">{weight}%</td>
                        <td className="px-6 py-4"><span className="px-2 py-1 text-xs font-bold rounded bg-indigo-50 text-indigo-700">AI + COMPANY REVIEW</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          <div className="sticky top-8 space-y-8">
            {/* Already Submitted Banner */}
            {alreadySubmitted ? (
              <div className="bg-emerald-50 rounded-2xl p-8 border border-emerald-200 shadow-lg">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-emerald-600 text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold text-emerald-800">Already Submitted</h4>
                    <p className="text-sm text-emerald-600">You have submitted your work for this task.</p>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-emerald-200">
                  <p className="text-sm text-[#454655] mb-3">Your submission is being reviewed. Results will appear on your dashboard once evaluation is complete.</p>
                  <Link href="/dashboard" className="w-full py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-all flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-sm">dashboard</span> Go to Dashboard
                  </Link>
                </div>
              </div>
            ) : (
              <div className="bg-[#dae2fd] rounded-2xl p-8 border border-[#0623bb]/10 shadow-lg">
                <h4 className="text-xl font-semibold text-[#131b2e] mb-4">Join this Task</h4>
                <p className="text-sm text-[#454655] mb-6">By joining, you agree to the NDA and Intellectual Property transfer upon prize payout.</p>
                <div className="space-y-4">
                  <Link href={`/tasks/${params.id}/submit`} className="w-full py-4 bg-[#0623bb] text-white rounded-xl font-bold text-lg hover:bg-[#2e42d1] transition-all active:scale-95 flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined">rocket_launch</span> Join Task
                  </Link>
                  <button className="w-full py-3 bg-transparent border border-[#0623bb] text-[#0623bb] rounded-xl font-semibold hover:bg-[#0623bb]/5 transition-all">
                    Bookmark for Later
                  </button>
                </div>
                <div className="mt-8 pt-8 border-t border-[#c5c5d7]/30">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-[#757686]">Task Trust Score</span>
                    <span className="text-sm font-bold text-emerald-600">98% High</span>
                  </div>
                  <div className="h-2 w-full bg-[#c5c5d7] rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: '98%' }} />
                  </div>
                </div>
              </div>
            )}

            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-[#131b2e]">Q&A</h3>
                <button className="text-[#0623bb] text-sm font-semibold hover:underline">Ask a Question</button>
              </div>
              <div className="space-y-4">
                {questions.length === 0 ? (
                  <p className="text-sm text-[#757686] bg-[#f2f3ff] p-4 rounded-lg border border-[#c5c5d7]">No questions yet. Be the first to ask!</p>
                ) : (
                  questions.map(qa => (
                    <div key={qa.id} className="bg-[#f2f3ff] border border-[#c5c5d7] p-4 rounded-lg">
                      <p className="text-sm font-semibold text-[#131b2e] mb-2">{qa.question}</p>
                      {qa.answer && (
                        <div className="pl-4 border-l-2 border-[#2e42d1]">
                          <p className="text-sm text-[#454655]">{qa.answer}</p>
                          <p className="text-[10px] text-[#757686] mt-2 uppercase">{qa.answeredBy || 'Company'} • {formatAgo(qa.answeredAt)}</p>
                        </div>
                      )}
                      {!qa.answer && <p className="text-xs text-[#757686] mt-1">Awaiting response...</p>}
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
