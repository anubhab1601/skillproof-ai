'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

export default function CompanySettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const { theme, toggleTheme } = useTheme();
  const { user, userProfile } = useAuth();
  const [companyProfile, setCompanyProfile] = useState(null);
  const [escrowBalance, setEscrowBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;

    async function loadCompanyData() {
      try {
        const profileDoc = await getDoc(doc(db, 'users', user.uid, 'companyProfile', 'profile'));
        if (profileDoc.exists()) setCompanyProfile(profileDoc.data());

        const escrowSnap = await getDocs(
          query(collection(db, 'escrowAccounts'), where('companyUid', '==', user.uid), where('status', '==', 'locked'))
        );
        let total = 0;
        escrowSnap.forEach(d => { total += (d.data().amountPaise || 0); });
        setEscrowBalance(total);
      } catch (err) {
        console.error('Error loading company settings:', err);
      } finally {
        setLoading(false);
      }
    }
    loadCompanyData();
  }, [user?.uid]);

  const formatPaise = (paise) => `₹${((paise || 0) / 100).toLocaleString('en-IN')}`;

  const TABS = ['profile', 'account', 'theme', 'notifications', 'payment', 'privacy'];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-[#0623bb] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <h1 className="text-4xl font-bold text-[#131b2e] mb-8">Settings</h1>

      <div className="flex gap-2 mb-8 border-b border-[#c5c5d7] pb-4 overflow-x-auto">
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all capitalize whitespace-nowrap ${activeTab === tab ? 'bg-[#0623bb] text-white' : 'text-[#454655] hover:bg-[#eaedff]'}`}>
            {tab}
          </button>
        ))}
        <Link href="/company/settings/team" className="px-4 py-2 rounded-lg text-sm font-semibold text-[#454655] hover:bg-[#eaedff] transition-all whitespace-nowrap">
          Team
        </Link>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="bg-white border border-[#c5c5d7] rounded-xl p-8 space-y-6 max-w-2xl">
          <h3 className="text-xl font-semibold text-[#131b2e]">Company Profile</h3>
          <div className="flex items-center gap-6 mb-6">
            <div className="w-20 h-20 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-3xl font-bold">
              {(companyProfile?.companyName || userProfile?.displayName || 'C').charAt(0)}
            </div>
            <div>
              <button className="px-4 py-2 border border-[#0623bb] text-[#0623bb] rounded-lg text-sm font-semibold hover:bg-[#0623bb]/5">Change Logo</button>
              <p className="text-xs text-[#757686] mt-1">PNG or SVG. Max 2MB.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-semibold text-[#131b2e] block mb-1">Company Name</label><input className="w-full px-4 py-3 bg-[#eaedff] border border-[#c5c5d7] rounded-lg outline-none focus:ring-2 focus:ring-[#0623bb]" defaultValue={companyProfile?.companyName || userProfile?.displayName || ''} /></div>
            <div><label className="text-sm font-semibold text-[#131b2e] block mb-1">Website</label><input className="w-full px-4 py-3 bg-[#eaedff] border border-[#c5c5d7] rounded-lg outline-none focus:ring-2 focus:ring-[#0623bb]" defaultValue={companyProfile?.website || ''} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-semibold text-[#131b2e] block mb-1">Industry</label>
              <select className="w-full px-4 py-3 bg-[#eaedff] border border-[#c5c5d7] rounded-lg outline-none focus:ring-2 focus:ring-[#0623bb]" defaultValue={companyProfile?.industry || 'Technology'}>
                <option>Technology</option><option>Finance</option><option>Healthcare</option><option>E-commerce</option>
              </select>
            </div>
            <div><label className="text-sm font-semibold text-[#131b2e] block mb-1">Company Size</label>
              <select className="w-full px-4 py-3 bg-[#eaedff] border border-[#c5c5d7] rounded-lg outline-none focus:ring-2 focus:ring-[#0623bb]" defaultValue={companyProfile?.size || '11-50'}>
                <option>1-10</option><option>11-50</option><option>51-200</option><option>201-500</option><option>500+</option>
              </select>
            </div>
          </div>
          <div><label className="text-sm font-semibold text-[#131b2e] block mb-1">Company Description</label><textarea className="w-full px-4 py-3 bg-[#eaedff] border border-[#c5c5d7] rounded-lg outline-none focus:ring-2 focus:ring-[#0623bb] h-24" defaultValue={companyProfile?.description || ''} /></div>
          <button className="px-6 py-3 bg-[#0623bb] text-white rounded-lg font-semibold hover:opacity-90 transition-all">Save Changes</button>
        </div>
      )}

      {/* Account Tab */}
      {activeTab === 'account' && (
        <div className="bg-white border border-[#c5c5d7] rounded-xl p-8 space-y-6 max-w-2xl">
          <h3 className="text-xl font-semibold text-[#131b2e]">Account & Security</h3>
          <div className="space-y-4">
            <div><label className="text-sm font-semibold text-[#131b2e] block mb-1">Admin Email</label><input className="w-full px-4 py-3 bg-[#eaedff] border border-[#c5c5d7] rounded-lg outline-none focus:ring-2 focus:ring-[#0623bb]" defaultValue={user?.email || ''} type="email" /></div>
            <div><label className="text-sm font-semibold text-[#131b2e] block mb-1">Phone</label><input className="w-full px-4 py-3 bg-[#eaedff] border border-[#c5c5d7] rounded-lg outline-none focus:ring-2 focus:ring-[#0623bb]" defaultValue={user?.phoneNumber || ''} type="tel" /></div>
            <div className="flex justify-between items-center p-4 border border-[#c5c5d7] rounded-lg">
              <div><h4 className="font-semibold">Two-Factor Authentication</h4><p className="text-sm text-[#454655]">Add an extra layer of security</p></div>
              <button className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-bold">Enabled ✓</button>
            </div>
            <div className="flex justify-between items-center p-4 border border-[#c5c5d7] rounded-lg">
              <div><h4 className="font-semibold">Change Password</h4><p className="text-sm text-[#454655]">Keep your account secure</p></div>
              <button className="px-4 py-2 border border-[#0623bb] text-[#0623bb] rounded-lg text-sm font-bold hover:bg-[#0623bb]/5">Update</button>
            </div>
          </div>
          <button className="px-6 py-3 bg-[#0623bb] text-white rounded-lg font-semibold hover:opacity-90 transition-all">Save Changes</button>
        </div>
      )}

      {/* Theme Tab */}
      {activeTab === 'theme' && (
        <div className="bg-white border border-[#c5c5d7] rounded-xl p-8 space-y-6 max-w-2xl">
          <h3 className="text-xl font-semibold text-[#131b2e]">Appearance</h3>
          <p className="text-sm text-[#454655]">Choose your preferred color theme for the interface.</p>
          <div className="grid grid-cols-3 gap-4">
            {[
              { key: 'light', icon: 'light_mode', label: 'Light', desc: 'Clean white background', preview: 'bg-white border-[#c5c5d7]' },
              { key: 'dark', icon: 'dark_mode', label: 'Dark', desc: 'Easy on the eyes', preview: 'bg-[#131b2e] border-[#2a2f36]' },
              { key: 'system', icon: 'contrast', label: 'System', desc: 'Follows your OS setting', preview: 'bg-gradient-to-br from-white to-[#131b2e] border-[#c5c5d7]' },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => toggleTheme(t.key)}
                className={`flex flex-col items-center p-6 rounded-xl border-2 transition-all ${
                  theme === t.key ? 'border-[#0623bb] bg-[#f2f3ff]' : 'border-[#eaedff] hover:border-[#0623bb]/30'
                }`}
              >
                <div className={`w-16 h-16 rounded-xl ${t.preview} border mb-4`} />
                <span className="material-symbols-outlined text-2xl mb-2">{t.icon}</span>
                <span className="font-bold text-sm">{t.label}</span>
                <span className="text-xs text-[#757686] mt-1">{t.desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="bg-white border border-[#c5c5d7] rounded-xl p-8 space-y-4 max-w-2xl">
          <h3 className="text-xl font-semibold text-[#131b2e] mb-4">Notification Preferences</h3>
          {['New Submissions', 'Escrow Deposits & Payouts', 'Integrity Flags', 'Offer Responses', 'Dispute Updates', 'Task Deadlines', 'Weekly Hiring Reports', 'Platform Updates'].map(n => (
            <label key={n} className="flex justify-between items-center p-4 border border-[#c5c5d7] rounded-lg cursor-pointer hover:bg-[#f2f3ff] transition-colors">
              <span className="font-medium">{n}</span>
              <input type="checkbox" defaultChecked className="w-5 h-5 rounded text-[#0623bb] focus:ring-[#0623bb]" />
            </label>
          ))}
        </div>
      )}

      {/* Payment Tab */}
      {activeTab === 'payment' && (
        <div className="bg-white border border-[#c5c5d7] rounded-xl p-8 space-y-6 max-w-2xl">
          <h3 className="text-xl font-semibold text-[#131b2e]">Payment & Billing</h3>
          <div className="space-y-4">
            <div className="p-4 border border-[#c5c5d7] rounded-lg flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-blue-600">account_balance</span>
                <div><p className="font-semibold">Razorpay Business</p><p className="text-sm text-[#454655]">{companyProfile?.razorpayConnected ? 'Connected' : 'Not connected'}</p></div>
              </div>
              {companyProfile?.razorpayConnected ? (
                <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-bold">Primary</span>
              ) : (
                <button className="text-sm text-[#0623bb] font-semibold hover:underline">Connect</button>
              )}
            </div>
            <div className="p-4 border border-[#c5c5d7] rounded-lg flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-purple-600">credit_card</span>
                <div><p className="font-semibold">Stripe</p><p className="text-sm text-[#454655]">Not connected</p></div>
              </div>
              <button className="text-sm text-[#0623bb] font-semibold hover:underline">Connect</button>
            </div>
            <div className="p-4 bg-[#f2f3ff] rounded-lg border border-[#c5c5d7]">
              <div className="flex justify-between items-center">
                <div><p className="font-semibold">Escrow Balance</p><p className="text-sm text-[#454655]">Currently locked across active tasks</p></div>
                <p className="text-2xl font-bold text-[#0623bb]">{formatPaise(escrowBalance)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Tab */}
      {activeTab === 'privacy' && (
        <div className="bg-white border border-[#c5c5d7] rounded-xl p-8 space-y-4 max-w-2xl">
          <h3 className="text-xl font-semibold text-[#131b2e] mb-4">Privacy & Data</h3>
          {['Show company on public task listings', 'Allow candidates to see company name before applying', 'Share anonymized hiring data for platform insights'].map(n => (
            <label key={n} className="flex justify-between items-center p-4 border border-[#c5c5d7] rounded-lg cursor-pointer hover:bg-[#f2f3ff] transition-colors">
              <span className="font-medium">{n}</span>
              <input type="checkbox" defaultChecked className="w-5 h-5 rounded text-[#0623bb] focus:ring-[#0623bb]" />
            </label>
          ))}
          <div className="pt-6 border-t border-[#c5c5d7] space-y-3">
            <button className="px-4 py-2 border border-[#c5c5d7] text-[#454655] rounded-lg text-sm font-bold hover:bg-[#f2f3ff]">Export Company Data</button>
            <button className="ml-3 px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-bold hover:bg-red-50">Delete Company Account</button>
          </div>
        </div>
      )}
    </>
  );
}
