'use client';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';

export default function SubmissionResultPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [submission, setSubmission] = useState(null);
  const [task, setTask] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user?.uid || !params.id) return;

    async function loadData() {
      try {
        // Fetch submission
        const subSnap = await getDoc(doc(db, 'submissions', params.id));
        if (!subSnap.exists()) {
          router.push('/dashboard');
          return;
        }
        const sub = { id: subSnap.id, ...subSnap.data() };

        // Verify ownership
        if (sub.candidateUid !== user.uid) {
          router.push('/dashboard');
          return;
        }
        setSubmission(sub);

        // Fetch task for rubric info
        if (sub.taskId) {
          const taskSnap = await getDoc(doc(db, 'tasks', sub.taskId));
          if (taskSnap.exists()) setTask({ id: taskSnap.id, ...taskSnap.data() });
        }

        // Fetch candidate profile for skillScore context
        const profileSnap = await getDoc(doc(db, 'users', user.uid, 'candidateProfile', 'profile'));
        if (profileSnap.exists()) setProfile(profileSnap.data());
      } catch (err) {
        console.error('Error loading submission result:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();

    // Real-time listener for score updates
    const unsub = onSnapshot(doc(db, 'submissions', params.id), (snap) => {
      if (snap.exists()) {
        const updated = { id: snap.id, ...snap.data() };
        setSubmission(updated);
      }
    }, (err) => console.warn('Submission listener error:', err.message));

    return () => unsub();
  }, [user?.uid, params.id, router]);

  const formatDate = (ts) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatPaise = (paise) => `₹${((paise || 0) / 100).toLocaleString('en-IN')}`;

  const handleShare = () => {
    if (!submission?.taskId) return;
    const url = `${window.location.origin}/tasks/${submission.taskId}/public`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf8ff] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#0623bb] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="min-h-screen bg-[#faf8ff] flex items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined text-[64px] text-[#c5c5d7] block mb-4">search_off</span>
          <h1 className="text-2xl font-bold text-[#131b2e] mb-2">Submission Not Found</h1>
          <Link href="/dashboard" className="text-[#0623bb] font-semibold hover:underline">← Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  const aiEval = submission.aiEvaluation || {};
  const companyEval = submission.companyEvaluation || {};
  const rubric = task?.rubric || {};
  const criterionScores = aiEval.criterionScores || [];
  const payoutStatus = submission.payoutStatus || 'pending';

  const payoutMessages = {
    not_eligible: { text: 'Score below eligibility threshold', color: 'text-red-600', bg: 'bg-red-50', icon: 'block' },
    pending: { text: 'Payout pending — company is reviewing submissions', color: 'text-amber-700', bg: 'bg-amber-50', icon: 'hourglass_top' },
    processing: { text: 'Payout processing — expect within 2 business days', color: 'text-blue-700', bg: 'bg-blue-50', icon: 'sync' },
    credited: { text: `${formatPaise(submission.payoutAmount)} credited to your wallet`, color: 'text-emerald-700', bg: 'bg-emerald-50', icon: 'check_circle' },
    failed: { text: 'Payout failed — please contact support', color: 'text-red-600', bg: 'bg-red-50', icon: 'error' },
  };
  const payout = payoutMessages[payoutStatus] || payoutMessages.pending;

  return (
    <div className="min-h-screen bg-[#faf8ff]">
      <header className="bg-white/90 backdrop-blur-md sticky top-0 z-50 border-b border-slate-200 shadow-sm">
        <div className="max-w-[1280px] mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="text-xl font-bold text-[#0623bb]">SkillProof</Link>
          <Link href="/dashboard" className="text-sm text-[#0623bb] font-semibold hover:underline flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">arrow_back</span> Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16 space-y-8">
        {/* Success Header */}
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-emerald-600 text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
          </div>
          <h1 className="text-4xl font-bold text-[#131b2e]">Submission Received</h1>
          <p className="text-[#454655]">
            Your work for <span className="font-semibold">{task?.title || 'Task'}</span> has been submitted successfully.
          </p>
          <p className="text-xs text-[#757686]">Submitted {formatDate(submission.createdAt)}</p>
        </div>

        {/* AI Evaluation */}
        <div className="bg-white border border-[#c5c5d7] rounded-xl p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <span className="material-symbols-outlined text-[#0623bb]">auto_awesome</span> AI Evaluation
            </h3>
            {aiEval.status === 'complete' ? (
              <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">Complete</span>
            ) : (
              <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold flex items-center gap-1">
                <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" /> Processing
              </span>
            )}
          </div>

          {aiEval.status === 'complete' ? (
            <>
              {/* AI Summary */}
              {aiEval.summary && (
                <div className="bg-[#f2f3ff] rounded-lg p-4 border border-[#eaedff]">
                  <p className="text-sm text-[#131b2e] leading-relaxed">{aiEval.summary}</p>
                </div>
              )}

              {/* Score Breakdown */}
              <div className="space-y-4">
                {Object.entries(rubric).length > 0 ? (
                  Object.entries(rubric).map(([criteria, weight]) => {
                    const criterion = criterionScores.find(c => c.name === criteria);
                    const score = criterion?.score || 0;
                    return (
                      <div key={criteria}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium">{criteria}</span>
                          <span className="text-[#0623bb] font-bold">{score}/100 ({weight}%)</span>
                        </div>
                        <div className="w-full h-2.5 bg-[#eaedff] rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all duration-500 ${score >= 90 ? 'bg-emerald-500' : score >= 75 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${score}%` }} />
                        </div>
                        {criterion?.feedback && (
                          <p className="text-xs text-[#757686] mt-1">{criterion.feedback}</p>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-[#757686]">Rubric not available for this task.</p>
                )}
              </div>

              {/* AI Total */}
              <div className="pt-4 border-t border-[#eaedff] flex justify-between items-center">
                <span className="font-semibold text-[#131b2e]">AI Score</span>
                <span className="text-3xl font-bold text-[#0623bb]">{aiEval.totalScore ? Math.round(aiEval.totalScore) : '—'}</span>
              </div>

              {/* Integrity Flag */}
              {aiEval.integrityFlag && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
                  <span className="material-symbols-outlined text-amber-600">flag</span>
                  <div>
                    <p className="font-semibold text-amber-800 text-sm">Integrity Flag Raised</p>
                    <p className="text-xs text-amber-600">{aiEval.integrityFlagReason || 'An anomaly was detected in your submission pattern.'}</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <div className="w-12 h-12 border-4 border-[#0623bb] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-[#454655] font-medium">AI evaluation in progress...</p>
              <p className="text-xs text-[#757686] mt-1">This usually takes 2–5 minutes. This page updates automatically.</p>
            </div>
          )}
        </div>

        {/* Company Evaluation */}
        <div className="bg-white border border-[#c5c5d7] rounded-xl p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <span className="material-symbols-outlined text-[#454655]">business</span> Company Review
            </h3>
            {companyEval.status === 'complete' ? (
              <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">Complete</span>
            ) : (
              <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold">Pending</span>
            )}
          </div>

          {companyEval.status === 'complete' ? (
            <div className="space-y-4">
              {(companyEval.criterionScores || []).map((c, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{c.name || `Criterion ${i + 1}`}</span>
                    <span className="text-[#131b2e] font-bold">{c.score}/100</span>
                  </div>
                  <div className="w-full h-2 bg-[#eaedff] rounded-full overflow-hidden">
                    <div className="h-full bg-[#131b2e] rounded-full" style={{ width: `${c.score}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <span className="material-symbols-outlined text-[48px] text-[#c5c5d7] block mb-2">hourglass_top</span>
              <p className="text-[#454655] font-medium">Awaiting company review</p>
              <p className="text-xs text-[#757686] mt-1">The company will review your submission after the task deadline. Results will appear here automatically.</p>
            </div>
          )}
        </div>

        {/* Final Score */}
        {submission.finalScore && (
          <div className="bg-gradient-to-br from-[#0623bb] to-[#2e42d1] text-white rounded-xl p-8">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold opacity-90">Final Blended Score</h3>
                <p className="text-sm opacity-70 mt-1">AI ({task?.aiCompanySplit?.ai || 30}%) + Company ({task?.aiCompanySplit?.company || 70}%)</p>
              </div>
              <div className="text-right">
                <p className="text-5xl font-bold">{Math.round(submission.finalScore)}</p>
                <p className="text-sm opacity-70">/100</p>
              </div>
            </div>

            {/* Rank & Percentile */}
            {(submission.percentile || submission.rank) && (
              <div className="mt-6 pt-6 border-t border-white/20 grid grid-cols-2 gap-4">
                {submission.percentile && (
                  <div>
                    <p className="text-sm opacity-70">Percentile</p>
                    <p className="text-2xl font-bold">Top {Math.round(100 - submission.percentile)}%</p>
                  </div>
                )}
                {submission.rank && (
                  <div>
                    <p className="text-sm opacity-70">Rank</p>
                    <p className="text-2xl font-bold">#{submission.rank}</p>
                  </div>
                )}
              </div>
            )}

            {/* SkillScore Delta */}
            {profile?.skillScore !== undefined && (
              <div className="mt-6 pt-6 border-t border-white/20 flex justify-between items-center">
                <span className="text-sm opacity-70">SkillScore Impact</span>
                <span className="text-xl font-bold">
                  {submission.skillScoreDelta > 0 ? '+' : ''}{submission.skillScoreDelta || '—'}
                </span>
              </div>
            )}

            {/* Qualification */}
            <div className="mt-6 pt-6 border-t border-white/20">
              {submission.qualificationStatus === 'qualified' ? (
                <div className="flex items-center gap-2 text-emerald-300">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                  <span className="font-semibold">Qualified — Eligible for payout</span>
                </div>
              ) : submission.qualificationStatus === 'disqualified' ? (
                <div className="flex items-center gap-2 text-red-300">
                  <span className="material-symbols-outlined">cancel</span>
                  <span className="font-semibold">Did not qualify</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-amber-300">
                  <span className="material-symbols-outlined">pending</span>
                  <span className="font-semibold">Qualification pending</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Payout Status */}
        <div className={`${payout.bg} border rounded-xl p-6 flex items-center gap-4`}>
          <span className={`material-symbols-outlined text-2xl ${payout.color}`} style={{ fontVariationSettings: "'FILL' 1" }}>{payout.icon}</span>
          <div>
            <p className={`font-semibold ${payout.color}`}>{payout.text}</p>
            {payoutStatus === 'credited' && (
              <Link href="/wallet" className="text-sm text-[#0623bb] font-semibold hover:underline mt-1 inline-block">View Wallet →</Link>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4 justify-center flex-wrap">
          <Link href="/profile" className="px-6 py-3 bg-[#0623bb] text-white rounded-xl font-semibold hover:opacity-90 transition-all flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">person</span> View Profile
          </Link>
          <Link href="/wallet" className="px-6 py-3 border border-[#0623bb] text-[#0623bb] rounded-xl font-semibold hover:bg-[#0623bb]/5 transition-all flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">account_balance_wallet</span> Check Wallet
          </Link>
          <button onClick={handleShare} className="px-6 py-3 border border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-all flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">{copied ? 'check' : 'share'}</span> {copied ? 'Copied!' : 'Share'}
          </button>
          <Link href="/tasks" className="px-6 py-3 border border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-all flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">search</span> Find More Tasks
          </Link>
        </div>
      </main>
    </div>
  );
}
