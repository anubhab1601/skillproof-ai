'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp, orderBy, query } from 'firebase/firestore';

export default function CompanyTeamPage() {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Viewer');
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    loadMembers();
  }, [user?.uid]);

  const loadMembers = async () => {
    try {
      const snap = await getDocs(
        query(collection(db, 'users', user.uid, 'teamMembers'), orderBy('addedAt', 'desc'))
      );
      setMembers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      // Collection might not exist yet — that's ok
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setInviting(true);
    try {
      await addDoc(collection(db, 'users', user.uid, 'teamMembers'), {
        email: inviteEmail,
        role: inviteRole,
        status: 'Pending',
        addedAt: serverTimestamp(),
      });
      setInviteEmail('');
      setShowInvite(false);
      await loadMembers();
    } catch (err) {
      alert('Failed to invite: ' + err.message);
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (memberId) => {
    if (!confirm('Remove this team member?')) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'teamMembers', memberId));
      setMembers(prev => prev.filter(m => m.id !== memberId));
    } catch (err) {
      alert('Failed to remove: ' + err.message);
    }
  };

  return (
    <>
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-bold text-[#131b2e] mb-1">Team Management</h1>
          <p className="text-[#454655]">Manage team members and roles.</p>
        </div>
        <button onClick={() => setShowInvite(!showInvite)}
          className="px-4 py-2 bg-[#0623bb] text-white rounded-lg font-semibold text-sm hover:opacity-90 transition-all">
          {showInvite ? 'Cancel' : 'Invite Member'}
        </button>
      </header>

      {showInvite && (
        <div className="bg-[#f2f3ff] border border-[#eaedff] rounded-xl p-6 mb-6 flex items-end gap-4">
          <div className="flex-1">
            <label className="text-sm font-semibold text-[#131b2e] block mb-1">Email</label>
            <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-[#c5c5d7] rounded-lg outline-none focus:ring-2 focus:ring-[#0623bb]"
              placeholder="colleague@company.com" />
          </div>
          <div className="w-40">
            <label className="text-sm font-semibold text-[#131b2e] block mb-1">Role</label>
            <select value={inviteRole} onChange={e => setInviteRole(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-[#c5c5d7] rounded-lg outline-none focus:ring-2 focus:ring-[#0623bb]">
              <option>Admin</option>
              <option>Reviewer</option>
              <option>Viewer</option>
            </select>
          </div>
          <button onClick={handleInvite} disabled={inviting || !inviteEmail}
            className="px-6 py-3 bg-[#0623bb] text-white rounded-lg font-semibold text-sm hover:opacity-90 disabled:opacity-50 whitespace-nowrap">
            {inviting ? 'Sending...' : 'Send Invite'}
          </button>
        </div>
      )}

      <div className="bg-white border border-[#c5c5d7] rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-3 border-[#0623bb] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-[#757686]">Loading team members...</p>
          </div>
        ) : members.length === 0 ? (
          <div className="p-12 text-center">
            <span className="material-symbols-outlined text-[48px] text-[#c5c5d7] block mb-3">group</span>
            <p className="text-[#454655] font-medium">No team members yet</p>
            <p className="text-xs text-[#757686] mt-1">Invite team members to collaborate on task reviews.</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-[#f2f3ff] text-xs uppercase tracking-wider text-[#454655]">
              <tr>
                <th className="px-6 py-3">Member</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c5c5d7]">
              {members.map(m => (
                <tr key={m.id} className="hover:bg-[#f2f3ff]">
                  <td className="px-6 py-4">
                    <p className="font-semibold">{m.name || m.email}</p>
                    {m.name && <p className="text-xs text-[#757686]">{m.email}</p>}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-[#eaedff] text-[#454655] rounded text-xs font-bold">{m.role}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${m.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {m.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button onClick={() => handleRemove(m.id)}
                      className="text-red-600 text-sm font-semibold hover:underline">Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
