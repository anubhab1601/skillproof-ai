'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';

export default function OffersPage() {
  const { user } = useAuth();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;

    async function loadOffers() {
      try {
        const offersSnap = await getDocs(
          query(collection(db, 'jobOffers'), where('candidateUid', '==', user.uid), orderBy('createdAt', 'desc'))
        );
        setOffers(offersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error('Error loading offers:', err);
      } finally {
        setLoading(false);
      }
    }

    loadOffers();
  }, [user?.uid]);

  const statusLabel = (s) => {
    const map = { pending: 'New', accepted: 'Accepted', declined: 'Declined', expired: 'Expired' };
    return map[s] || s;
  };
  const statusColor = (s) => {
    if (s === 'pending') return 'bg-[#0623bb] text-white';
    if (s === 'accepted') return 'bg-emerald-100 text-emerald-700';
    if (s === 'declined') return 'bg-red-100 text-red-700';
    return 'bg-slate-100 text-slate-600';
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
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-[#131b2e] mb-1">Job Offers</h1>
        <p className="text-[#454655]">Offers from companies impressed by your task performance.</p>
      </header>

      <div className="space-y-6">
        {offers.length === 0 ? (
          <div className="text-center py-16 bg-white border border-[#c5c5d7] rounded-xl">
            <span className="material-symbols-outlined text-[48px] text-[#c5c5d7] mb-3 block">work</span>
            <p className="font-semibold text-[#131b2e] mb-1">No offers yet</p>
            <p className="text-sm text-[#454655]">Keep completing tasks to attract company attention!</p>
          </div>
        ) : (
          offers.map(offer => (
            <div key={offer.id} className={`bg-white border rounded-xl p-6 hover:shadow-md transition-all ${offer.status === 'pending' ? 'border-[#0623bb] shadow-sm' : 'border-[#c5c5d7]'}`}>
              <div className="flex justify-between items-start">
                <div className="flex gap-4">
                  <div className="w-14 h-14 rounded-xl bg-indigo-50 flex items-center justify-center text-[#0623bb] font-bold text-xl">
                    {(offer.companyName || 'C').charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#131b2e]">{offer.role || 'Role not specified'}</h3>
                    <p className="text-sm text-[#454655]">{offer.companyName || 'Unknown Company'}</p>
                    <div className="flex items-center gap-3 mt-2">
                      {offer.salary && <span className="text-sm font-semibold text-emerald-600">{offer.salary}</span>}
                      {offer.type && <span className="text-xs bg-[#eaedff] text-[#454655] px-2 py-0.5 rounded">{offer.type}</span>}
                    </div>
                    {offer.message && <p className="text-sm text-[#757686] mt-2">{offer.message}</p>}
                    {offer.status === 'accepted' && offer.contact && (
                      <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <p className="text-xs font-semibold text-emerald-700 mb-1">Contact Unlocked</p>
                        <p className="text-sm text-emerald-800">{offer.contact.email} {offer.contact.phone && `• ${offer.contact.phone}`}</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right space-y-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusColor(offer.status)}`}>{statusLabel(offer.status)}</span>
                  <p className="text-xs text-[#757686]">{formatDate(offer.createdAt)}</p>
                  {offer.status === 'pending' && (
                    <div className="flex gap-2 mt-3">
                      <button className="px-4 py-2 bg-[#0623bb] text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-all">Accept</button>
                      <button className="px-4 py-2 border border-[#c5c5d7] text-[#454655] rounded-lg text-sm font-semibold hover:bg-slate-50 transition-all">Decline</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}
