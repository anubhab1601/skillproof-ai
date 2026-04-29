'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';

export default function CompanyDisputesPage() {
  const { user } = useAuth();
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;

    async function loadDisputes() {
      try {
        const disSnap = await getDocs(
          query(collection(db, 'disputes'), where('companyUid', '==', user.uid), orderBy('createdAt', 'desc'))
        );

        const list = [];
        for (const disDoc of disSnap.docs) {
          const d = disDoc.data();
          // Get candidate name
          const candidateDoc = await getDoc(doc(db, 'users', d.candidateUid));
          const candidateName = candidateDoc.exists() ? candidateDoc.data().displayName : 'Unknown';
          list.push({ id: disDoc.id, ...d, candidateName });
        }
        setDisputes(list);
      } catch (err) {
        console.error('Error loading disputes:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDisputes();
  }, [user?.uid]);

  const openCount = disputes.filter(d => d.status === 'under_review').length;
  const resolvedFavor = disputes.filter(d => d.status === 'resolved_favor').length;
  const resolvedDenied = disputes.filter(d => d.status === 'resolved_denied').length;

  const statusLabel = (s) => {
    const map = { under_review: 'Under Review', resolved_favor: 'Resolved — Candidate Favor', resolved_denied: 'Closed — Denied', resolved_partial: 'Partially Resolved' };
    return map[s] || s;
  };
  const statusColor = (s) => {
    if (s === 'under_review') return 'bg-amber-100 text-amber-700';
    if (s === 'resolved_favor') return 'bg-emerald-100 text-emerald-700';
    return 'bg-red-100 text-red-700';
  };

  const formatDate = (ts) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  };

  const getSlaText = (d) => {
    if (d.status !== 'under_review') return 'Resolved';
    if (!d.slaDeadline) return '—';
    const deadline = d.slaDeadline.toDate ? d.slaDeadline.toDate() : new Date(d.slaDeadline);
    const diff = deadline - new Date();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days <= 0) return 'SLA expired';
    return `${days} day${days !== 1 ? 's' : ''} remaining`;
  };

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
          <h1 className="text-4xl font-bold text-[#131b2e] mb-1">Dispute Resolution</h1>
          <p className="text-[#454655]">View and respond to candidate score appeals. 5 business day SLA.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-sm font-bold">{openCount} open dispute{openCount !== 1 ? 's' : ''}</span>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Open', value: openCount, icon: 'hourglass_top', color: 'bg-amber-100 text-amber-700' },
          { label: 'Resolved (Candidate)', value: resolvedFavor, icon: 'check_circle', color: 'bg-emerald-100 text-emerald-700' },
          { label: 'Resolved (Company)', value: resolvedDenied, icon: 'cancel', color: 'bg-red-100 text-red-700' },
          { label: 'Total Disputes', value: disputes.length, icon: 'gavel', color: 'bg-[#eaedff] text-[#0623bb]' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-[#c5c5d7] rounded-xl p-5">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${s.color}`}>
                <span className="material-symbols-outlined text-sm">{s.icon}</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-[#131b2e]">{s.value}</p>
                <p className="text-xs text-[#757686] font-semibold uppercase">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Dispute List */}
      <div className="bg-white border border-[#c5c5d7] rounded-xl overflow-hidden">
        <div className="divide-y divide-[#c5c5d7]">
          {disputes.length === 0 ? (
            <div className="p-12 text-center text-[#757686]">
              <span className="material-symbols-outlined text-[48px] text-[#c5c5d7] mb-3 block">gavel</span>
              <p className="font-semibold text-[#131b2e] mb-1">No disputes</p>
              <p className="text-sm">All evaluations are running smoothly.</p>
            </div>
          ) : (
            disputes.map(d => (
              <div key={d.id} className="p-6 hover:bg-[#f2f3ff] transition-colors">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${statusColor(d.status)}`}>{statusLabel(d.status)}</span>
                      <span className="px-2 py-0.5 bg-[#eaedff] text-[#454655] rounded text-xs font-semibold">{d.criterion}</span>
                    </div>
                    <h4 className="font-semibold text-[#131b2e] mb-1">{d.taskTitle || 'Unknown Task'}</h4>
                    <p className="text-sm text-[#454655]">Filed by <strong>{d.candidateName}</strong>: {d.reason}</p>
                    <div className="flex gap-4 mt-2">
                      <p className="text-xs text-[#757686]">Filed on {formatDate(d.createdAt)}</p>
                      <p className="text-xs text-[#757686]">•</p>
                      <p className={`text-xs font-semibold ${d.status === 'under_review' ? 'text-amber-600' : 'text-emerald-600'}`}>{getSlaText(d)}</p>
                    </div>
                  </div>
                  <div className="text-right pl-6 shrink-0 space-y-2">
                    {d.status === 'under_review' && (
                      <button className="px-4 py-2 bg-[#0623bb] text-white rounded-lg text-xs font-semibold hover:opacity-90 transition-all">
                        Respond
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-6 text-center">
        <Link href="/help" className="text-sm text-[#0623bb] font-semibold hover:underline">
          Learn about the dispute resolution process →
        </Link>
      </div>
    </>
  );
}
