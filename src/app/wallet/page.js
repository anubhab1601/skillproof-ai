'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';

export default function WalletPage() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;

    async function loadWallet() {
      try {
        // Wallet balance
        const walletDoc = await getDoc(doc(db, 'users', user.uid, 'wallet', 'balance'));
        if (walletDoc.exists()) setWallet(walletDoc.data());

        // All transactions
        const txSnap = await getDocs(
          query(collection(db, 'users', user.uid, 'transactions'), orderBy('createdAt', 'desc'))
        );
        setTransactions(txSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error('Error loading wallet:', err);
      } finally {
        setLoading(false);
      }
    }

    loadWallet();
  }, [user?.uid]);

  const formatPaise = (paise) => `₹${((paise || 0) / 100).toLocaleString('en-IN')}`;

  const filtered = filter === 'all' ? transactions :
    filter === 'payouts' ? transactions.filter(t => t.type?.includes('payout')) :
    transactions.filter(t => t.type?.includes('withdrawal'));

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
        <h1 className="text-4xl font-bold text-[#131b2e] mb-1">Earnings &amp; Wallet</h1>
        <p className="text-[#454655]">Track your earnings, pending payouts, and withdrawal history.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-[#2e42d1] text-white rounded-xl p-6 relative overflow-hidden">
          <span className="material-symbols-outlined absolute top-4 right-4 text-[60px] opacity-10">account_balance_wallet</span>
          <p className="text-xs font-semibold uppercase tracking-widest opacity-80 mb-2">Available</p>
          <p className="text-[42px] font-bold">{formatPaise(wallet?.availablePaise)}</p>
          <button className="mt-4 w-full py-2 bg-white text-[#0623bb] rounded-lg font-bold text-sm hover:bg-gray-50 transition-colors">Withdraw</button>
        </div>
        <div className="bg-white border border-[#c5c5d7] rounded-xl p-6">
          <p className="text-xs font-semibold text-[#454655] uppercase tracking-widest mb-2">Pending</p>
          <p className="text-3xl font-bold text-amber-600">{formatPaise(wallet?.pendingPaise)}</p>
          <p className="text-sm text-[#454655] mt-2">Under review payouts</p>
        </div>
        <div className="bg-white border border-[#c5c5d7] rounded-xl p-6">
          <p className="text-xs font-semibold text-[#454655] uppercase tracking-widest mb-2">Lifetime Earned</p>
          <p className="text-3xl font-bold text-emerald-600">{formatPaise(wallet?.totalEarnedPaise)}</p>
          <p className="text-sm text-[#454655] mt-2">Total platform earnings</p>
        </div>
      </div>

      <div className="bg-white border border-[#c5c5d7] rounded-xl overflow-hidden">
        <div className="p-6 border-b border-[#c5c5d7] flex justify-between items-center">
          <h3 className="text-xl font-semibold">Recent Transactions</h3>
          <select
            className="text-sm border border-[#c5c5d7] rounded-lg px-3 py-2 bg-white"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All</option>
            <option value="payouts">Payouts</option>
            <option value="withdrawals">Withdrawals</option>
          </select>
        </div>
        <table className="w-full text-left">
          <thead className="bg-[#f2f3ff] text-xs uppercase tracking-wider text-[#454655]">
            <tr><th className="px-6 py-3">Date</th><th className="px-6 py-3">Description</th><th className="px-6 py-3">Status</th><th className="px-6 py-3 text-right">Amount</th></tr>
          </thead>
          <tbody className="divide-y divide-[#c5c5d7]">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-[#757686]">
                  <span className="material-symbols-outlined text-[48px] text-[#c5c5d7] mb-2 block">receipt_long</span>
                  No transactions yet
                </td>
              </tr>
            ) : (
              filtered.map((tx) => {
                const isCredit = tx.type?.includes('payout') || tx.type?.includes('credit') || tx.type?.includes('bonus');
                return (
                  <tr key={tx.id} className="hover:bg-[#f2f3ff] transition-colors">
                    <td className="px-6 py-4 text-sm text-[#454655]">{formatDate(tx.createdAt)}</td>
                    <td className="px-6 py-4 text-sm font-medium">{tx.taskTitle || tx.type?.replace(/_/g, ' ')}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        tx.status === 'complete' ? 'bg-emerald-100 text-emerald-700' :
                        tx.status === 'processing' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>{tx.status?.charAt(0).toUpperCase() + tx.status?.slice(1) || 'Unknown'}</span>
                    </td>
                    <td className={`px-6 py-4 text-right font-bold ${isCredit ? 'text-emerald-600' : 'text-red-600'}`}>
                      {isCredit ? '+' : '-'}{formatPaise(tx.netAmountPaise)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
