'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import CandidateSidebar from '@/components/CandidateSidebar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import {
  collection, query, where, orderBy, getDocs, addDoc,
  serverTimestamp
} from 'firebase/firestore';

export default function DisputesPage() {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [disputes, setDisputes] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({ submissionId: '', criterion: '', reason: '' });

  useEffect(() => {
    if (!user?.uid) return;

    async function loadData() {
      try {
        // Fetch disputes
        const disSnap = await getDocs(
          query(collection(db, 'disputes'), where('candidateUid', '==', user.uid), orderBy('createdAt', 'desc'))
        );
        setDisputes(disSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        // Fetch submissions for the form dropdown
        const subSnap = await getDocs(
          query(collection(db, 'submissions'), where('candidateUid', '==', user.uid))
        );
        setSubmissions(subSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error('Error loading disputes:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user?.uid]);

  const handleSubmit = async () => {
    if (!formData.submissionId || !formData.reason) return;
    setSubmitting(true);
    try {
      const sub = submissions.find(s => s.id === formData.submissionId);
      await addDoc(collection(db, 'disputes'), {
        candidateUid: user.uid,
        companyUid: sub?.companyUid || '',
        submissionId: formData.submissionId,
        taskId: sub?.taskId || '',
        taskTitle: sub?.taskTitle || '',
        criterion: formData.criterion || 'General',
        reason: formData.reason,
        status: 'under_review',
        resolution: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        slaDeadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      });

      // Refresh disputes
      const disSnap = await getDocs(
        query(collection(db, 'disputes'), where('candidateUid', '==', user.uid), orderBy('createdAt', 'desc'))
      );
      setDisputes(disSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setShowForm(false);
      setFormData({ submissionId: '', criterion: '', reason: '' });
    } catch (err) {
      console.error('Error filing dispute:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const statusLabel = (s) => {
    const map = { under_review: 'Under Review', resolved_favor: 'Resolved — In Your Favor', resolved_denied: 'Closed — Denied', resolved_partial: 'Partially Resolved' };
    return map[s] || s;
  };
  const statusColor = (s) => {
    if (s === 'under_review') return 'bg-amber-100 text-amber-800';
    if (s === 'resolved_favor') return 'bg-emerald-100 text-emerald-700';
    return 'bg-red-100 text-red-700';
  };

  const timeAgo = (ts) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  };

  return (
    <ProtectedRoute role="candidate">
      <div className="flex min-h-screen">
        <CandidateSidebar />
        <main className="flex-1 max-w-[1280px] mx-auto p-8 lg:p-12">
          <header className="mb-8 flex justify-between items-end">
            <div>
              <h1 className="text-4xl font-bold text-[#131b2e] mb-1">Dispute Resolution</h1>
              <p className="text-[#454655]">File score appeals and track resolution status. 5 business day SLA.</p>
            </div>
            <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-[#0623bb] text-white rounded-lg font-semibold text-sm hover:opacity-90 transition-all flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">{showForm ? 'close' : 'add'}</span>
              {showForm ? 'Cancel' : 'File New Dispute'}
            </button>
          </header>

          {/* New Dispute Form */}
          {showForm && (
            <div className="bg-white border border-[#0623bb]/20 rounded-xl p-6 mb-6 space-y-4">
              <h3 className="text-lg font-semibold text-[#131b2e]">File a Score Appeal</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-[#131b2e] block mb-1">Select Submission *</label>
                  <select
                    className="w-full px-4 py-3 bg-[#eaedff] border border-[#c5c5d7] rounded-lg outline-none focus:ring-2 focus:ring-[#0623bb]"
                    value={formData.submissionId}
                    onChange={(e) => setFormData({ ...formData, submissionId: e.target.value })}
                  >
                    <option value="">Choose a submission...</option>
                    {submissions.map(s => (
                      <option key={s.id} value={s.id}>{s.taskTitle} — Score: {s.finalScore || 'Pending'}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-[#131b2e] block mb-1">Disputed Criterion</label>
                  <input
                    className="w-full px-4 py-3 bg-[#eaedff] border border-[#c5c5d7] rounded-lg outline-none focus:ring-2 focus:ring-[#0623bb]"
                    placeholder="e.g. Code Quality"
                    value={formData.criterion}
                    onChange={(e) => setFormData({ ...formData, criterion: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-[#131b2e] block mb-1">Reason for Appeal *</label>
                <textarea
                  className="w-full px-4 py-3 bg-[#eaedff] border border-[#c5c5d7] rounded-lg outline-none focus:ring-2 focus:ring-[#0623bb] resize-none h-24"
                  placeholder="Explain why you believe the evaluation was incorrect..."
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                />
              </div>
              <button
                onClick={handleSubmit}
                disabled={submitting || !formData.submissionId || !formData.reason}
                className="px-6 py-3 bg-[#0623bb] text-white rounded-lg font-semibold text-sm hover:opacity-90 transition-all disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Dispute'}
              </button>
            </div>
          )}

          {/* Disputes List */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-10 h-10 border-4 border-[#0623bb] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : disputes.length === 0 ? (
            <div className="text-center py-16 bg-white border border-[#c5c5d7] rounded-xl">
              <span className="material-symbols-outlined text-[48px] text-[#c5c5d7] mb-3 block">gavel</span>
              <p className="font-semibold text-[#131b2e] mb-1">No disputes filed</p>
              <p className="text-sm text-[#454655]">Your evaluations are looking good!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {disputes.map(d => (
                <div key={d.id} className="bg-white border border-[#c5c5d7] rounded-xl p-5">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-bold text-[#131b2e]">{d.taskTitle || 'Unknown Task'}</h4>
                      <p className="text-sm text-[#454655]">Criterion: {d.criterion}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${statusColor(d.status)}`}>{statusLabel(d.status)}</span>
                      <span className="text-xs text-[#757686]">{timeAgo(d.createdAt)}</span>
                    </div>
                  </div>
                  <p className="text-sm text-[#454655] bg-[#f2f3ff] p-3 rounded-lg">{d.reason}</p>
                  {d.resolution && (
                    <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <p className="text-xs font-semibold text-emerald-700 mb-1">Resolution:</p>
                      <p className="text-sm text-emerald-800">{d.resolution}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
