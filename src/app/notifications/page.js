'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import CandidateSidebar from '@/components/CandidateSidebar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import {
  collection, query, where, orderBy, onSnapshot,
  doc, updateDoc, writeBatch, serverTimestamp
} from 'firebase/firestore';

const FILTER_OPTIONS = [
  { key: 'all', label: 'All', icon: 'notifications' },
  { key: 'payout_credited', label: 'Payouts', icon: 'payments' },
  { key: 'deadline_reminder', label: 'Tasks', icon: 'assignment' },
  { key: 'offer_accepted', label: 'Offers', icon: 'work' },
  { key: 'system', label: 'System', icon: 'settings' },
];

const NOTIF_ICON_MAP = {
  payout_credited: 'payments',
  new_submission: 'assignment',
  deadline_reminder: 'timer',
  offer_accepted: 'work',
  candidate_joined: 'person_add',
  task_closed: 'assignment_turned_in',
  offer_expired: 'work_off',
};

const NOTIF_COLOR_MAP = {
  payout_credited: 'bg-emerald-100 text-emerald-600',
  offer_accepted: 'bg-purple-100 text-purple-600',
  deadline_reminder: 'bg-amber-100 text-amber-600',
  task_closed: 'bg-blue-100 text-blue-600',
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  // Real-time listener for notifications
  useEffect(() => {
    if (!user?.uid) return;

    const unsub = onSnapshot(
      query(
        collection(db, 'notifications'),
        where('recipientUid', '==', user.uid),
        orderBy('createdAt', 'desc')
      ),
      (snap) => {
        setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error('Notification listener error:', err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user?.uid]);

  // Filter logic — map types to category
  const getCategory = (type) => {
    if (['payout_credited'].includes(type)) return 'payout_credited';
    if (['deadline_reminder', 'task_closed', 'new_submission', 'candidate_joined'].includes(type)) return 'deadline_reminder';
    if (['offer_accepted', 'offer_expired'].includes(type)) return 'offer_accepted';
    return 'system';
  };

  const filtered = filter === 'all' ? notifications : notifications.filter(n => getCategory(n.type) === filter);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.isRead);
    if (unread.length === 0) return;
    const batch = writeBatch(db);
    unread.forEach(n => {
      batch.update(doc(db, 'notifications', n.id), { isRead: true, readAt: serverTimestamp() });
    });
    await batch.commit();
  };

  const markRead = async (id) => {
    const n = notifications.find(n => n.id === id);
    if (n && !n.isRead) {
      await updateDoc(doc(db, 'notifications', id), { isRead: true, readAt: serverTimestamp() });
    }
  };

  const timeAgo = (ts) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <ProtectedRoute role="candidate">
      <div className="flex min-h-screen">
        <CandidateSidebar />
        <main className="flex-1 max-w-[1280px] mx-auto p-8 lg:p-12">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold text-[#131b2e]">Notifications</h1>
              <p className="text-sm text-[#454655] mt-1">{unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={markAllRead} className="px-4 py-2 border border-[#c5c5d7] rounded-lg text-sm font-semibold text-[#454655] hover:bg-[#f2f3ff] transition-colors flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">done_all</span> Mark all read
              </button>
              <Link href="/settings" className="px-4 py-2 border border-[#c5c5d7] rounded-lg text-sm font-semibold text-[#454655] hover:bg-[#f2f3ff] transition-colors flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">tune</span> Preferences
              </Link>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-2 mb-6">
            {FILTER_OPTIONS.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                  filter === f.key ? 'bg-[#0623bb] text-white' : 'bg-[#eaedff] text-[#454655] hover:bg-[#dfe0ff]'
                }`}
              >
                <span className="material-symbols-outlined text-sm">{f.icon}</span>
                {f.label}
              </button>
            ))}
          </div>

          {/* Notification List */}
          <div className="space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-10 h-10 border-4 border-[#0623bb] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-[#757686]">
                <span className="material-symbols-outlined text-[48px] opacity-30 mb-4 block">notifications_off</span>
                <p className="font-medium">No notifications{filter !== 'all' ? ' in this category' : ' yet'}</p>
              </div>
            ) : (
              filtered.map(n => (
                <div key={n.id} className={`bg-white border rounded-xl p-5 flex items-start gap-4 hover:shadow-sm transition-all group ${n.isRead ? 'border-[#c5c5d7]' : 'border-[#0623bb]/30 bg-[#f8f9ff]'}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${NOTIF_COLOR_MAP[n.type] || 'bg-[#eaedff] text-[#0623bb]'}`}>
                    <span className="material-symbols-outlined">{NOTIF_ICON_MAP[n.type] || 'notifications'}</span>
                  </div>
                  <Link href={n.deepLink || '#'} onClick={() => markRead(n.id)} className="flex-1 min-w-0">
                    <h4 className={`font-semibold text-[#131b2e] ${n.isRead ? 'opacity-70' : ''}`}>{n.title}</h4>
                    <p className="text-sm text-[#454655]">{n.body}</p>
                  </Link>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-[#757686] whitespace-nowrap">{timeAgo(n.createdAt)}</span>
                    {!n.isRead && <div className="w-2 h-2 bg-[#0623bb] rounded-full" />}
                  </div>
                </div>
              ))
            )}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}
