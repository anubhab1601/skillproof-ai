'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';

export default function CompanyOffersPage() {
  const { user } = useAuth();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;

    async function loadOffers() {
      try {
        const offersSnap = await getDocs(
          query(collection(db, 'jobOffers'), where('companyUid', '==', user.uid), orderBy('createdAt', 'desc'))
        );

        const list = [];
        for (const offerDoc of offersSnap.docs) {
          const o = offerDoc.data();
          const candidateDoc = await getDoc(doc(db, 'users', o.candidateUid));
          const candidateName = candidateDoc.exists() ? candidateDoc.data().displayName : 'Unknown';
          list.push({ id: offerDoc.id, ...o, candidateName });
        }
        setOffers(list);
      } catch (err) {
        console.error('Error loading offers:', err);
      } finally {
        setLoading(false);
      }
    }

    loadOffers();
  }, [user?.uid]);

  const statusColor = (s) => {
    if (s === 'pending') return 'bg-amber-100 text-amber-700';
    if (s === 'accepted') return 'bg-emerald-100 text-emerald-700';
    if (s === 'declined') return 'bg-red-100 text-red-700';
    return 'bg-slate-100 text-slate-600';
  };
  const statusLabel = (s) => {
    const map = { pending: 'Pending', accepted: 'Accepted', declined: 'Declined', expired: 'Expired' };
    return map[s] || s;
  };

  const formatDate = (ts) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
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
        <div><h1 className="text-4xl font-bold text-[#131b2e] mb-1">Sent Offers</h1><p className="text-[#454655]">Track offers you&apos;ve extended to top-performing candidates.</p></div>
        <button className="px-4 py-2 bg-[#0623bb] text-white rounded-lg font-semibold text-sm">Send New Offer</button>
      </header>

      <div className="bg-white border border-[#c5c5d7] rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-[#f2f3ff] text-xs uppercase tracking-wider text-[#454655]">
            <tr><th className="px-6 py-3">Candidate</th><th className="px-6 py-3">Role</th><th className="px-6 py-3">Package</th><th className="px-6 py-3">Sent On</th><th className="px-6 py-3">Status</th><th className="px-6 py-3">Action</th></tr>
          </thead>
          <tbody className="divide-y divide-[#c5c5d7]">
            {offers.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-[#757686]">
                  <span className="material-symbols-outlined text-[48px] text-[#c5c5d7] mb-2 block">send</span>
                  No offers sent yet. Find candidates in the talent pool.
                </td>
              </tr>
            ) : (
              offers.map(o => (
                <tr key={o.id} className="hover:bg-[#f2f3ff] transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-xs">{o.candidateName.charAt(0)}</div>
                      <span className="font-medium text-sm">{o.candidateName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm">{o.role || '—'}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-emerald-600">{o.salary || '—'}</td>
                  <td className="px-6 py-4 text-sm text-[#454655]">{formatDate(o.createdAt)}</td>
                  <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-xs font-bold ${statusColor(o.status)}`}>{statusLabel(o.status)}</span></td>
                  <td className="px-6 py-4">
                    {o.status === 'pending' && (
                      <button className="text-xs text-red-600 font-semibold hover:underline">Withdraw</button>
                    )}
                    {o.status === 'accepted' && (
                      <button className="text-xs text-[#0623bb] font-semibold hover:underline">View Details</button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
