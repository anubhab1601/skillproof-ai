'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';

export default function CompanyBillingPage() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [escrowTotal, setEscrowTotal] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;

    async function loadBilling() {
      try {
        // Company wallet
        const walletDoc = await getDoc(doc(db, 'users', user.uid, 'wallet', 'balance'));
        if (walletDoc.exists()) setWallet(walletDoc.data());

        // Escrow accounts
        const escrowSnap = await getDocs(
          query(collection(db, 'escrowAccounts'), where('companyUid', '==', user.uid))
        );
        let locked = 0, paid = 0;
        escrowSnap.forEach(d => {
          const e = d.data();
          if (e.status === 'locked') locked += (e.amountPaise || 0);
          if (e.status === 'released') paid += (e.amountPaise || 0);
        });
        setEscrowTotal(locked);
        setTotalPaid(paid);

        // Transactions
        const txSnap = await getDocs(
          query(collection(db, 'users', user.uid, 'transactions'), orderBy('createdAt', 'desc'))
        );
        setTransactions(txSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error('Error loading billing:', err);
      } finally {
        setLoading(false);
      }
    }

    loadBilling();
  }, [user?.uid]);

  const formatPaise = (paise) => `₹${((paise || 0) / 100).toLocaleString('en-IN')}`;

  const formatDate = (ts) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const filtered = filter === 'all' ? transactions :
    transactions.filter(t => t.type?.includes(filter));

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
        <h1 className="text-4xl font-bold text-[#131b2e] mb-1">Billing &amp; Escrow</h1>
        <p className="text-[#454655]">Manage your funds, escrow deposits, and payout history.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[
          { label: 'Wallet Balance', value: formatPaise(wallet?.availablePaise), icon: 'account_balance_wallet', color: 'bg-[#0623bb] text-white' },
          { label: 'Total Locked in Escrow', value: formatPaise(escrowTotal), icon: 'lock', color: 'bg-[#131b2e] text-white' },
          { label: 'Total Payouts Released', value: formatPaise(totalPaid), icon: 'payments', color: 'bg-emerald-600 text-white' },
        ].map(card => (
          <div key={card.label} className={`${card.color} rounded-xl p-6 relative overflow-hidden`}>
            <span className="material-symbols-outlined absolute top-4 right-4 text-[60px] opacity-10">{card.icon}</span>
            <p className="text-xs font-semibold uppercase tracking-widest opacity-80 mb-2">{card.label}</p>
            <p className="text-3xl font-bold">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-[#c5c5d7] rounded-xl overflow-hidden">
        <div className="p-6 border-b border-[#c5c5d7] flex justify-between items-center">
          <h3 className="text-xl font-semibold">Transaction History</h3>
          <select
            className="text-sm border border-[#c5c5d7] rounded-lg px-3 py-2 bg-white"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All Transactions</option>
            <option value="escrow">Escrow Deposits</option>
            <option value="payout">Payouts</option>
            <option value="topup">Top-ups</option>
          </select>
        </div>
        <table className="w-full text-left">
          <thead className="bg-[#f2f3ff] text-xs uppercase tracking-wider text-[#454655]">
            <tr><th className="px-6 py-3">Date</th><th className="px-6 py-3">Description</th><th className="px-6 py-3">Type</th><th className="px-6 py-3 text-right">Amount</th></tr>
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
                const isCredit = tx.type?.includes('topup') || tx.type?.includes('refund');
                return (
                  <tr key={tx.id} className="hover:bg-[#f2f3ff] transition-colors">
                    <td className="px-6 py-4 text-sm text-[#454655]">{formatDate(tx.createdAt)}</td>
                    <td className="px-6 py-4 text-sm font-medium text-[#131b2e]">{tx.taskTitle || tx.type?.replace(/_/g, ' ')}</td>
                    <td className="px-6 py-4"><span className="px-2 py-1 bg-[#eaedff] text-[#454655] rounded text-xs font-semibold capitalize">{tx.type?.replace(/_/g, ' ') || '—'}</span></td>
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
