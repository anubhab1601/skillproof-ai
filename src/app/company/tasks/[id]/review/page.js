'use client';
import { use, useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, orderBy, getDocs, addDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';

export default function ReviewDashboardPage({ params }) {
  const { id } = use(params);
  const { user, userProfile } = useAuth();
  const [task, setTask] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [offerModal, setOfferModal] = useState(false);
  const [offerForm, setOfferForm] = useState({ role: '', salary: '', message: '' });
  const [sendingOffer, setSendingOffer] = useState(false);
  const [activeTab, setActiveTab] = useState('code');
  const unsubRef = useRef(null);

  // Load submissions
  const loadData = useCallback(async () => {
    if (!user?.uid || !id) return;
    try {
      const taskDoc = await getDoc(doc(db, 'tasks', id));
      if (taskDoc.exists()) setTask({ id: taskDoc.id, ...taskDoc.data() });

      // Try query with orderBy first, fallback without orderBy if index not ready
      let subSnap;
      try {
        subSnap = await getDocs(
          query(collection(db, 'submissions'), where('taskId', '==', id), where('companyUid', '==', user.uid), orderBy('createdAt', 'desc'))
        );
      } catch (queryErr) {
        console.warn('Query with orderBy failed, trying without:', queryErr.message);
        subSnap = await getDocs(
          query(collection(db, 'submissions'), where('taskId', '==', id), where('companyUid', '==', user.uid))
        );
      }

      const list = [];
      for (const d of subSnap.docs) {
        const sub = { id: d.id, ...d.data() };
        try {
          const userDoc = await getDoc(doc(db, 'users', sub.candidateUid));
          if (userDoc.exists()) {
            const u = userDoc.data();
            sub.candidateName = u.displayName || 'Anonymous';
            sub.candidateEmail = u.email || '';
          } else {
            sub.candidateName = 'Anonymous';
            sub.candidateEmail = '';
          }
        } catch {
          sub.candidateName = 'Anonymous';
          sub.candidateEmail = '';
        }
        list.push(sub);
      }
      setSubmissions(list);
      if (list.length > 0 && !selected) setSelected(list[0]);
    } catch (err) {
      console.error('Error loading review data:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.uid, id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time listener: when `selected` changes, listen for updates on that submission doc
  useEffect(() => {
    // Clean up previous listener
    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }

    if (!selected?.id) return;

    const unsub = onSnapshot(
      doc(db, 'submissions', selected.id),
      (snap) => {
        if (snap.exists()) {
          const updated = { ...selected, ...snap.data(), id: snap.id };
          setSelected(updated);
          setSubmissions(prev => prev.map(s => s.id === snap.id ? updated : s));
        }
      },
      (err) => {
        // If permissions error on snapshot, fall back to polling
        console.warn('Snapshot listener error (will use polling):', err.message);
      }
    );

    unsubRef.current = unsub;
    return () => unsub();
  }, [selected?.id]);


  const statusOf = (sub) => {
    if (sub.qualificationStatus === 'qualified') return 'Shortlisted';
    if (sub.qualificationStatus === 'disqualified') return 'Rejected';
    return 'Pending';
  };

  const formatAgo = (ts) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const diff = Date.now() - d.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  const handleSendOffer = async () => {
    if (!selected || sendingOffer) return;
    setSendingOffer(true);
    try {
      await addDoc(collection(db, 'jobOffers'), {
        companyUid: user.uid,
        companyName: userProfile?.companyName || userProfile?.displayName || '',
        candidateUid: selected.candidateUid,
        candidateName: selected.candidateName,
        taskId: id,
        taskTitle: task?.title || '',
        role: offerForm.role,
        salary: offerForm.salary,
        message: offerForm.message,
        status: 'pending',
        submissionId: selected.id,
        submissionScore: selected.finalScore || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Send notification to candidate
      await addDoc(collection(db, 'notifications'), {
        recipientUid: selected.candidateUid,
        type: 'job_offer',
        title: 'New Job Offer!',
        body: `${userProfile?.companyName || 'A company'} sent you an offer for "${task?.title}"`,
        deepLink: '/offers',
        isRead: false,
        createdAt: serverTimestamp(),
        readAt: null,
      });

      setOfferModal(false);
      setOfferForm({ role: '', salary: '', message: '' });
      alert('Offer sent successfully!');
    } catch (err) {
      console.error('Error sending offer:', err);
      alert('Failed to send offer. Please try again.');
    } finally {
      setSendingOffer(false);
    }
  };

  const filtered = filter === 'All' ? submissions : submissions.filter(s => statusOf(s) === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-[#0623bb] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!selected) {
    return (
      <div className="text-center py-16">
        <span className="material-symbols-outlined text-[48px] text-[#c5c5d7] mb-3 block">inbox</span>
        <p className="font-semibold text-[#131b2e] mb-1">No submissions to review</p>
        <p className="text-sm text-[#454655]">Wait for candidates to submit their work.</p>
        <Link href={`/company/tasks/${id}/live`} className="inline-block mt-4 text-[#0623bb] font-semibold hover:underline text-sm">← Back to Live Task</Link>
      </div>
    );
  }

  const rubric = task?.rubric || {};
  const codeFiles = selected?.codeFiles || [];
  const writeup = selected?.writeup || '';
  const integrityMeta = selected?.integrityMeta || {};

  return (
    <>
      <div className="flex gap-0 -m-8 lg:-m-12 min-h-screen">
        {/* Left Sidebar — Submission List */}
        <div className="w-80 shrink-0 border-r border-[#c5c5d7] bg-[#faf8ff] overflow-y-auto" style={{ height: 'calc(100vh)' }}>
          <div className="p-4 border-b border-[#c5c5d7] sticky top-0 bg-[#faf8ff] z-10">
            <Link href={`/company/tasks/${id}/live`} className="text-xs text-[#0623bb] font-medium hover:underline flex items-center gap-1 mb-3">
              <span className="material-symbols-outlined text-xs">arrow_back</span> Back to Live Task
            </Link>
            <h2 className="text-lg font-bold text-[#131b2e]">Submissions</h2>
            <p className="text-xs text-[#454655] mb-3">{submissions.length} total • {submissions.filter(s => statusOf(s) === 'Pending').length} pending</p>
            <div className="flex gap-1 flex-wrap">
              {['All', 'Pending', 'Shortlisted', 'Rejected'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${filter === f ? 'bg-[#0623bb] text-white' : 'bg-[#eaedff] text-[#454655] hover:bg-[#dfe0ff]'}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="divide-y divide-[#c5c5d7]">
            {filtered.map(s => {
              const status = statusOf(s);
              return (
                <button
                  key={s.id}
                  onClick={() => { setSelected(s); setActiveTab('code'); }}
                  className={`w-full text-left p-4 transition-colors ${selected.id === s.id ? 'bg-[#eaedff] border-l-3 border-l-[#0623bb]' : 'hover:bg-[#f2f3ff]'}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-sm text-[#131b2e]">{s.candidateName}</p>
                      <p className="text-[10px] text-[#757686] mt-0.5">{formatAgo(s.createdAt)}</p>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                        status === 'Shortlisted' ? 'bg-emerald-100 text-emerald-700' :
                        status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                      }`}>{status}</span>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${(s.finalScore || 0) >= 90 ? 'text-emerald-600' : (s.finalScore || 0) >= 80 ? 'text-amber-600' : 'text-[#757686]'}`}>
                        {s.finalScore ? Math.round(s.finalScore) : '—'}
                      </p>
                      <p className="text-[10px] text-[#757686]">Score</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Panel */}
        <div className="flex-1 overflow-y-auto p-8" style={{ height: 'calc(100vh)' }}>
          <div className="max-w-4xl">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-3xl font-bold text-[#131b2e]">{selected.candidateName}</h1>
                <p className="text-[#454655] mt-1">Submission for <span className="font-semibold">{task?.title || 'Task'}</span> • {formatAgo(selected.createdAt)}</p>
              </div>
              <div className="flex gap-2">
                <Link href={`/u/${selected.candidateUid}`} className="px-3 py-2 border border-[#c5c5d7] rounded-lg text-sm font-semibold text-[#454655] hover:bg-[#f2f3ff] transition-all flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">person</span> Profile
                </Link>
                <button onClick={() => setOfferModal(true)} className="px-4 py-2 bg-[#0623bb] text-white rounded-lg text-sm font-semibold hover:bg-[#2e42d1] transition-all flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">send</span> Send Offer
                </button>
              </div>
            </div>

            {/* Content Tabs */}
            <div className="flex gap-1 mb-6 bg-[#f2f3ff] p-1 rounded-xl">
              {[
                { key: 'code', icon: 'code', label: 'Code' },
                { key: 'writeup', icon: 'edit_note', label: 'Write-up' },
                { key: 'scores', icon: 'assessment', label: 'Scores' },
                { key: 'integrity', icon: 'verified_user', label: 'Integrity' },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${activeTab === tab.key ? 'bg-white text-[#0623bb] shadow-sm' : 'text-[#454655] hover:text-[#131b2e]'}`}
                >
                  <span className="material-symbols-outlined text-sm">{tab.icon}</span> {tab.label}
                </button>
              ))}
            </div>

            {/* Code Tab */}
            {activeTab === 'code' && (
              <section className="space-y-4">
                {codeFiles.length > 0 ? (
                  codeFiles.map((file, i) => (
                    <div key={i} className="bg-[#1e1e1e] rounded-xl overflow-hidden border border-[#333]">
                      <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-[#333]">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-sm text-yellow-400">description</span>
                          <span className="text-sm text-slate-300 font-medium">{file.fileName || file.name || `file_${i + 1}`}</span>
                          {file.language && <span className="text-[10px] text-slate-500 ml-1">({file.language})</span>}
                        </div>
                        <button
                          onClick={() => navigator.clipboard.writeText(file.content || '')}
                          className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm">content_copy</span> Copy
                        </button>
                      </div>
                      <div className="p-4 overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar">
                        <pre className="text-sm font-mono text-green-400 leading-relaxed whitespace-pre-wrap">{file.content || '(empty)'}</pre>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-[#f2f3ff] border border-[#c5c5d7] rounded-xl p-8 text-center">
                    <span className="material-symbols-outlined text-[48px] text-[#c5c5d7] block mb-2">code_off</span>
                    <p className="text-[#454655]">No code files submitted.</p>
                  </div>
                )}
              </section>
            )}

            {/* Write-up Tab */}
            {activeTab === 'writeup' && (
              <section className="bg-white border border-[#c5c5d7] rounded-xl p-6">
                <h3 className="text-lg font-semibold text-[#131b2e] mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#0623bb]">edit_note</span> Candidate Write-up
                </h3>
                {writeup ? (
                  <div className="prose prose-sm max-w-none">
                    <div className="bg-[#faf8ff] rounded-lg p-6 border border-[#eaedff] text-[#131b2e] leading-relaxed whitespace-pre-wrap">
                      {writeup}
                    </div>
                  </div>
                ) : (
                  <p className="text-[#757686] text-center py-8">No write-up provided.</p>
                )}
              </section>
            )}

            {/* Scores Tab */}
            {activeTab === 'scores' && (
              <section className="space-y-6">
                {/* AI Summary */}
                <div className="bg-gradient-to-br from-[#eaedff] to-[#f2f3ff] border border-[#c5c5d7] rounded-xl p-6">
                  <h3 className="text-sm font-bold text-[#0623bb] uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">auto_awesome</span> AI Evaluation Summary
                    {selected.aiEvaluation?.status && (
                      <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full ${
                        selected.aiEvaluation.status === 'complete' ? 'bg-emerald-100 text-emerald-700' :
                        selected.aiEvaluation.status === 'processing' ? 'bg-amber-100 text-amber-700' :
                        selected.aiEvaluation.status === 'failed' ? 'bg-red-100 text-red-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>{selected.aiEvaluation.status}</span>
                    )}
                  </h3>
                  <p className="text-sm text-[#131b2e] leading-relaxed">
                    {selected.aiEvaluation?.summary || selected.aiSummary || 'AI evaluation pending. Summary will appear once the submission is processed by Gemma 4.'}
                  </p>
                  {(selected.aiEvaluation?.status === 'failed' || selected.aiEvaluation?.status === 'pending' || selected.aiEvaluation?.status === 'processing') && selected.aiEvaluation?.status !== 'complete' && (
                    <button
                      disabled={selected.aiEvaluation?.status === 'processing'}
                      onClick={async () => {
                        try {
                          const token = await user.getIdToken();
                          const res = await fetch(
                            `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/submissions/${selected.id}/retry-evaluation`,
                            {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                            }
                          );
                          if (res.ok) {
                            setSubmissions(prev => prev.map(s =>
                              s.id === selected.id ? { ...s, aiEvaluation: { ...s.aiEvaluation, status: 'processing' } } : s
                            ));
                            setSelected(prev => ({ ...prev, aiEvaluation: { ...prev.aiEvaluation, status: 'processing' } }));

                            // Start polling every 5s for up to 2 minutes
                            const subId = selected.id;
                            let attempts = 0;
                            const poll = setInterval(async () => {
                              attempts++;
                              if (attempts > 24) { clearInterval(poll); return; }
                              try {
                                const t = await user.getIdToken();
                                const statusRes = await fetch(
                                  `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/submissions/${subId}/evaluation-status`,
                                  { headers: { 'Authorization': `Bearer ${t}` } }
                                );
                                if (statusRes.ok) {
                                  const data = await statusRes.json();
                                  if (data.aiEvaluation?.status === 'complete' || data.aiEvaluation?.status === 'failed') {
                                    clearInterval(poll);
                                    // Refresh the full submission data
                                    try {
                                      const subDoc = await getDoc(doc(db, 'submissions', subId));
                                      if (subDoc.exists()) {
                                        const refreshed = { ...selected, ...subDoc.data(), id: subId };
                                        setSelected(refreshed);
                                        setSubmissions(prev => prev.map(s => s.id === subId ? refreshed : s));
                                      }
                                    } catch {
                                      // If Firestore read fails, use the API data directly
                                      setSelected(prev => ({
                                        ...prev,
                                        aiEvaluation: data.aiEvaluation,
                                        finalScore: data.finalScore,
                                        qualificationStatus: data.qualificationStatus,
                                      }));
                                      setSubmissions(prev => prev.map(s => s.id === subId ? {
                                        ...s,
                                        aiEvaluation: data.aiEvaluation,
                                        finalScore: data.finalScore,
                                        qualificationStatus: data.qualificationStatus,
                                      } : s));
                                    }
                                  }
                                }
                              } catch (pollErr) {
                                console.warn('Poll error:', pollErr.message);
                              }
                            }, 5000);
                          }
                        } catch (err) {
                          console.error('Retry failed:', err);
                        }
                      }}
                      className={`mt-3 px-4 py-2 text-white text-sm font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                        selected.aiEvaluation?.status === 'processing'
                          ? 'bg-amber-500 cursor-wait'
                          : 'bg-[#0623bb] hover:bg-[#2e42d1]'
                      }`}
                    >
                      {selected.aiEvaluation?.status === 'processing' ? (
                        <><span className="material-symbols-outlined text-sm animate-spin">progress_activity</span> Evaluating...</>
                      ) : (
                        <><span className="material-symbols-outlined text-sm">refresh</span> Retry AI Evaluation</>
                      )}
                    </button>
                  )}
                </div>

                {/* Score Breakdown */}
                <div className="bg-white border border-[#c5c5d7] rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-[#131b2e] mb-4">Score Breakdown</h3>
                  <div className="space-y-5">
                    {(() => {
                      const entries = Object.entries(rubric);
                      const critScores = selected.aiEvaluation?.criterionScores || [];
                      let runningTotal = 0;

                      return entries.map(([label, weight]) => {
                        const criterion = critScores.find(c => (c.criterionName || c.name) === label);
                        const maxScore = weight; // max is always the rubric weight
                        let rawScore = criterion?.score || 0;

                        // Normalize: if score > maxScore, it was scored on old 0-100 scale
                        let displayScore;
                        if (rawScore > maxScore) {
                          displayScore = Math.round((rawScore / 100) * maxScore);
                        } else {
                          displayScore = Math.round(rawScore);
                        }
                        displayScore = Math.min(displayScore, maxScore); // clamp

                        runningTotal += displayScore;
                        const pct = maxScore > 0 ? Math.round((displayScore / maxScore) * 100) : 0;

                        return (
                          <div key={label} className="space-y-1.5">
                            <div className="flex justify-between text-sm">
                              <span className="font-medium text-[#131b2e]">{label} <span className="text-[#757686]">({weight}%)</span></span>
                              <span className="font-bold text-[#0623bb]">{displayScore}<span className="text-[#757686] font-medium">/{maxScore}</span></span>
                            </div>
                            <div className="h-2.5 bg-[#eaedff] rounded-full overflow-hidden">
                              <div className={`h-full rounded-full transition-all duration-500 ${pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
                            </div>
                            {criterion?.feedback && (
                              <p className="text-xs text-[#454655] leading-relaxed mt-1 pl-1">{criterion.feedback}</p>
                            )}
                          </div>
                        );
                      });
                    })()}
                    {Object.keys(rubric).length === 0 && (
                      <p className="text-sm text-[#757686]">No rubric defined for this task.</p>
                    )}
                  </div>
                  <div className="mt-6 pt-4 border-t border-[#c5c5d7] flex justify-between items-center">
                    <span className="font-semibold text-[#131b2e]">Final Score</span>
                    <div className="text-right">
                      <span className="text-3xl font-bold text-[#0623bb]">
                        {(() => {
                          // Recalculate total from normalized criterion scores
                          const critScores = selected.aiEvaluation?.criterionScores || [];
                          const entries = Object.entries(rubric);
                          if (critScores.length === 0) return selected.finalScore != null ? Math.round(selected.finalScore) : '—';
                          let total = 0;
                          entries.forEach(([label, weight]) => {
                            const crit = critScores.find(c => (c.criterionName || c.name) === label);
                            const raw = crit?.score || 0;
                            total += raw > weight ? Math.round((raw / 100) * weight) : Math.round(raw);
                          });
                          return Math.min(total, 100);
                        })()}
                      </span>
                      <span className="text-lg text-[#757686] font-medium">/100</span>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Integrity Tab */}
            {activeTab === 'integrity' && (
              <section className="bg-white border border-[#c5c5d7] rounded-xl p-6">
                <h3 className="text-lg font-semibold text-[#131b2e] mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600">verified_user</span> Integrity Report
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Time on Task', value: integrityMeta.timeOnTaskSeconds ? `${Math.floor(integrityMeta.timeOnTaskSeconds / 60)}m ${integrityMeta.timeOnTaskSeconds % 60}s` : '—', icon: 'timer' },
                    { label: 'Edit Count', value: integrityMeta.editCount || '—', icon: 'edit' },
                    { label: 'Paste Events', value: integrityMeta.pasteEventCount || 0, icon: 'content_paste', warn: (integrityMeta.pasteEventCount || 0) > 5 },
                    { label: 'Focus Loss', value: integrityMeta.focusLossCount || 0, icon: 'visibility_off', warn: (integrityMeta.focusLossCount || 0) > 3 },
                  ].map(m => (
                    <div key={m.label} className={`p-4 rounded-xl border ${m.warn ? 'border-amber-200 bg-amber-50' : 'border-[#eaedff] bg-[#faf8ff]'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`material-symbols-outlined text-sm ${m.warn ? 'text-amber-600' : 'text-[#0623bb]'}`}>{m.icon}</span>
                        <span className="text-xs font-semibold text-[#454655] uppercase tracking-wider">{m.label}</span>
                      </div>
                      <p className="text-2xl font-bold text-[#131b2e]">{m.value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-4 rounded-xl border border-emerald-200 bg-emerald-50 flex items-center gap-3">
                  <span className="material-symbols-outlined text-emerald-600" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  <div>
                    <p className="font-semibold text-emerald-800 text-sm">Integrity Status: {selected.aiEvaluation?.integrityFlag ? 'Flagged' : 'Clean'}</p>
                    <p className="text-xs text-emerald-600">{selected.aiEvaluation?.integrityFlagReason || 'No anomalies detected in submission behavior.'}</p>
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>
      </div>

      {/* Send Offer Modal */}
      {offerModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setOfferModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-[#eaedff]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#eaedff] rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#0623bb]">send</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-[#131b2e]">Send Offer</h2>
                    <p className="text-sm text-[#454655]">to {selected.candidateName}</p>
                  </div>
                </div>
                <button onClick={() => setOfferModal(false)} className="text-[#757686] hover:text-[#131b2e]">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-5">
              <div className="bg-[#f2f3ff] rounded-xl p-4 border border-[#eaedff]">
                <p className="text-xs text-[#454655] mb-1">Based on submission for</p>
                <p className="font-semibold text-[#131b2e]">{task?.title}</p>
                {selected.finalScore && (
                  <p className="text-xs text-[#0623bb] font-bold mt-1">Score: {Math.round(selected.finalScore)}/100</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#131b2e] mb-1.5">Role / Position *</label>
                <input
                  type="text"
                  value={offerForm.role}
                  onChange={e => setOfferForm({ ...offerForm, role: e.target.value })}
                  placeholder="e.g. Senior React Developer"
                  className="w-full px-4 py-3 border border-[#c5c5d7] rounded-xl text-sm focus:ring-2 focus:ring-[#0623bb] focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#131b2e] mb-1.5">Salary / Compensation</label>
                <input
                  type="text"
                  value={offerForm.salary}
                  onChange={e => setOfferForm({ ...offerForm, salary: e.target.value })}
                  placeholder="e.g. ₹12,00,000/year or Negotiable"
                  className="w-full px-4 py-3 border border-[#c5c5d7] rounded-xl text-sm focus:ring-2 focus:ring-[#0623bb] focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#131b2e] mb-1.5">Message to Candidate</label>
                <textarea
                  value={offerForm.message}
                  onChange={e => setOfferForm({ ...offerForm, message: e.target.value })}
                  placeholder="Write a personalized message..."
                  rows={3}
                  className="w-full px-4 py-3 border border-[#c5c5d7] rounded-xl text-sm focus:ring-2 focus:ring-[#0623bb] focus:border-transparent outline-none resize-none"
                />
              </div>
            </div>
            <div className="p-6 border-t border-[#eaedff] flex gap-3 justify-end">
              <button onClick={() => setOfferModal(false)} className="px-5 py-2.5 border border-[#c5c5d7] rounded-xl text-sm font-semibold text-[#454655] hover:bg-[#f2f3ff] transition-all">
                Cancel
              </button>
              <button
                onClick={handleSendOffer}
                disabled={!offerForm.role || sendingOffer}
                className="px-6 py-2.5 bg-[#0623bb] text-white rounded-xl text-sm font-semibold hover:bg-[#2e42d1] transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {sendingOffer ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Sending...</>
                ) : (
                  <><span className="material-symbols-outlined text-sm">send</span> Send Offer</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
