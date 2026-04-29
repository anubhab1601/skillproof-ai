'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import CandidateSidebar from '@/components/CandidateSidebar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { db, auth } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential, signOut, deleteUser } from 'firebase/auth';
import { uploadToCloudinary } from '@/lib/api';

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('profile');
  const { theme, toggleTheme } = useTheme();
  const { user, userProfile } = useAuth();

  const TABS = ['profile', 'account', 'theme', 'notifications', 'payment', 'privacy'];

  return (
    <ProtectedRoute role="candidate">
      <div className="flex min-h-screen">
        <CandidateSidebar />
        <main className="flex-1 max-w-[1280px] mx-auto p-8 lg:p-12">
          <h1 className="text-4xl font-bold text-[#131b2e] mb-8">Settings</h1>

          <div className="flex gap-2 mb-8 border-b border-[#c5c5d7] pb-4 overflow-x-auto">
            {TABS.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all capitalize whitespace-nowrap ${activeTab === tab ? 'bg-[#0623bb] text-white' : 'text-[#454655] hover:bg-[#eaedff]'}`}>
                {tab}
              </button>
            ))}
          </div>

          {activeTab === 'profile' && <ProfileTab user={user} userProfile={userProfile} />}
          {activeTab === 'account' && <AccountTab user={user} />}
          {activeTab === 'theme' && <ThemeTab theme={theme} toggleTheme={toggleTheme} />}
          {activeTab === 'notifications' && <NotificationsTab user={user} />}
          {activeTab === 'payment' && <PaymentTab user={user} />}
          {activeTab === 'privacy' && <PrivacyTab user={user} router={router} />}
        </main>
      </div>
    </ProtectedRoute>
  );
}

/* ─── PROFILE TAB ───────────────────────────────────────── */
function ProfileTab({ user, userProfile }) {
  const fileRef = useRef(null);
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!userProfile) return;
    setDisplayName(userProfile.displayName || '');
    setUsername(userProfile.username || '');
    setBio(userProfile.bio || '');
    setPhotoURL(userProfile.photoURL || user?.photoURL || '');
  }, [userProfile, user]);

  // Load candidate-specific bio from subcollection
  useEffect(() => {
    if (!user?.uid) return;
    (async () => {
      const snap = await getDoc(doc(db, 'users', user.uid, 'candidateProfile', 'profile'));
      if (snap.exists()) {
        const d = snap.data();
        if (d.bio) setBio(d.bio);
        if (d.publicUsername) setUsername(d.publicUsername);
      }
    })();
  }, [user?.uid]);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setMsg('Max 2MB allowed'); return; }
    try {
      setUploading(true);
      const result = await uploadToCloudinary(file, `profile-photos/${user.uid}`);
      const url = result.secure_url;
      setPhotoURL(url);
      await updateDoc(doc(db, 'users', user.uid), { photoURL: url, updatedAt: serverTimestamp() });
      setMsg('Photo updated!');
    } catch (err) {
      setMsg('Photo upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.uid) return;
    setSaving(true);
    setMsg('');
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName,
        updatedAt: serverTimestamp(),
      });
      // Update candidate profile subcollection
      const profileRef = doc(db, 'users', user.uid, 'candidateProfile', 'profile');
      const snap = await getDoc(profileRef);
      if (snap.exists()) {
        await updateDoc(profileRef, {
          bio,
          publicUsername: username,
          updatedAt: serverTimestamp(),
        });
      }
      setMsg('Profile saved successfully!');
    } catch (err) {
      setMsg('Save failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-[#c5c5d7] rounded-xl p-8 space-y-6 max-w-2xl">
      <h3 className="text-xl font-semibold text-[#131b2e]">Profile Information</h3>
      <div className="flex items-center gap-6 mb-6">
        <div className="relative">
          {photoURL ? (
            <img src={photoURL} alt="avatar" className="w-20 h-20 rounded-full object-cover" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-3xl font-bold">
              {displayName?.charAt(0) || '?'}
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 bg-white/60 rounded-full flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-[#0623bb] border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
        <div>
          <input type="file" ref={fileRef} accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="px-4 py-2 border border-[#0623bb] text-[#0623bb] rounded-lg text-sm font-semibold hover:bg-[#0623bb]/5 disabled:opacity-50">
            {uploading ? 'Uploading...' : 'Change Photo'}
          </button>
          <p className="text-xs text-[#757686] mt-1">JPG, PNG. Max 2MB.</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-semibold text-[#131b2e] block mb-1">Display Name</label>
          <input className="w-full px-4 py-3 bg-[#eaedff] border border-[#c5c5d7] rounded-lg outline-none focus:ring-2 focus:ring-[#0623bb]"
            value={displayName} onChange={e => setDisplayName(e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-semibold text-[#131b2e] block mb-1">Username</label>
          <input className="w-full px-4 py-3 bg-[#eaedff] border border-[#c5c5d7] rounded-lg outline-none focus:ring-2 focus:ring-[#0623bb]"
            value={username} onChange={e => setUsername(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="text-sm font-semibold text-[#131b2e] block mb-1">Bio</label>
        <textarea className="w-full px-4 py-3 bg-[#eaedff] border border-[#c5c5d7] rounded-lg outline-none focus:ring-2 focus:ring-[#0623bb] h-24"
          value={bio} onChange={e => setBio(e.target.value)} />
      </div>
      {msg && <p className={`text-sm font-medium ${msg.includes('failed') || msg.includes('Max') ? 'text-red-600' : 'text-emerald-600'}`}>{msg}</p>}
      <button onClick={handleSave} disabled={saving}
        className="px-6 py-3 bg-[#0623bb] text-white rounded-lg font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2">
        {saving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  );
}

/* ─── ACCOUNT TAB ───────────────────────────────────────── */
function AccountTab({ user }) {
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [changingPwd, setChangingPwd] = useState(false);
  const [showPwdForm, setShowPwdForm] = useState(false);
  const [msg, setMsg] = useState('');

  const handleChangePassword = async () => {
    if (!currentPwd || !newPwd) { setMsg('Please fill both fields'); return; }
    if (newPwd.length < 8) { setMsg('New password must be at least 8 characters'); return; }
    setChangingPwd(true);
    setMsg('');
    try {
      const firebaseUser = auth.currentUser;
      const credential = EmailAuthProvider.credential(firebaseUser.email, currentPwd);
      await reauthenticateWithCredential(firebaseUser, credential);
      await updatePassword(firebaseUser, newPwd);
      setMsg('Password updated successfully!');
      setShowPwdForm(false);
      setCurrentPwd('');
      setNewPwd('');
    } catch (err) {
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setMsg('Current password is incorrect');
      } else if (err.code === 'auth/requires-recent-login') {
        setMsg('Session expired. Please log out and log in again.');
      } else {
        setMsg('Failed: ' + err.message);
      }
    } finally {
      setChangingPwd(false);
    }
  };

  return (
    <div className="bg-white border border-[#c5c5d7] rounded-xl p-8 space-y-6 max-w-2xl">
      <h3 className="text-xl font-semibold text-[#131b2e]">Account & Security</h3>
      <div className="space-y-4">
        <div>
          <label className="text-sm font-semibold text-[#131b2e] block mb-1">Email</label>
          <input className="w-full px-4 py-3 bg-slate-100 border border-[#c5c5d7] rounded-lg outline-none cursor-not-allowed"
            value={user?.email || ''} readOnly />
          <p className="text-xs text-[#757686] mt-1">Contact support to change your email</p>
        </div>
        <div>
          <label className="text-sm font-semibold text-[#131b2e] block mb-1">Phone</label>
          <input className="w-full px-4 py-3 bg-slate-100 border border-[#c5c5d7] rounded-lg outline-none cursor-not-allowed"
            value={user?.phoneNumber || 'Not set'} readOnly />
        </div>
        <div className="flex justify-between items-center p-4 border border-[#c5c5d7] rounded-lg">
          <div>
            <h4 className="font-semibold">Change Password</h4>
            <p className="text-sm text-[#454655]">Update your account password</p>
          </div>
          <button onClick={() => setShowPwdForm(!showPwdForm)}
            className="px-4 py-2 border border-[#0623bb] text-[#0623bb] rounded-lg text-sm font-bold hover:bg-[#0623bb]/5">
            {showPwdForm ? 'Cancel' : 'Update'}
          </button>
        </div>
        {showPwdForm && (
          <div className="space-y-3 p-4 bg-[#f2f3ff] rounded-lg">
            <input type="password" placeholder="Current password" value={currentPwd} onChange={e => setCurrentPwd(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-[#c5c5d7] rounded-lg outline-none focus:ring-2 focus:ring-[#0623bb]" />
            <input type="password" placeholder="New password (min 8 chars)" value={newPwd} onChange={e => setNewPwd(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-[#c5c5d7] rounded-lg outline-none focus:ring-2 focus:ring-[#0623bb]" />
            <button onClick={handleChangePassword} disabled={changingPwd}
              className="px-4 py-2 bg-[#0623bb] text-white rounded-lg text-sm font-bold hover:opacity-90 disabled:opacity-50">
              {changingPwd ? 'Updating...' : 'Change Password'}
            </button>
          </div>
        )}
        {msg && <p className={`text-sm font-medium ${msg.includes('successfully') ? 'text-emerald-600' : 'text-red-600'}`}>{msg}</p>}
      </div>
    </div>
  );
}

/* ─── THEME TAB ─────────────────────────────────────────── */
function ThemeTab({ theme, toggleTheme }) {
  return (
    <div className="bg-white border border-[#c5c5d7] rounded-xl p-8 space-y-6 max-w-2xl">
      <h3 className="text-xl font-semibold text-[#131b2e]">Appearance</h3>
      <p className="text-sm text-[#454655]">Choose your preferred color theme for the interface.</p>
      <div className="grid grid-cols-3 gap-4">
        {[
          { key: 'light', icon: 'light_mode', label: 'Light', desc: 'Clean white background', preview: 'bg-white border-[#c5c5d7]' },
          { key: 'dark', icon: 'dark_mode', label: 'Dark', desc: 'Easy on the eyes', preview: 'bg-[#131b2e] border-[#2a2f36]' },
          { key: 'system', icon: 'contrast', label: 'System', desc: 'Follows your OS setting', preview: 'bg-gradient-to-br from-white to-[#131b2e] border-[#c5c5d7]' },
        ].map(t => (
          <button key={t.key} onClick={() => toggleTheme(t.key)}
            className={`flex flex-col items-center p-6 rounded-xl border-2 transition-all ${theme === t.key ? 'border-[#0623bb] bg-[#f2f3ff]' : 'border-[#eaedff] hover:border-[#0623bb]/30'}`}>
            <div className={`w-16 h-16 rounded-xl ${t.preview} border mb-4`} />
            <span className="material-symbols-outlined text-2xl mb-2">{t.icon}</span>
            <span className="font-bold text-sm">{t.label}</span>
            <span className="text-xs text-[#757686] mt-1">{t.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── NOTIFICATIONS TAB ─────────────────────────────────── */
function NotificationsTab({ user }) {
  const prefs = ['Task Recommendations', 'Payout Notifications', 'New Messages', 'Job Offers', 'Weekly Performance Reports', 'Platform Updates', 'Security Alerts'];
  const prefKeys = ['taskRecommendations', 'payoutNotifications', 'newMessages', 'jobOffers', 'weeklyReports', 'platformUpdates', 'securityAlerts'];
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    (async () => {
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) setValues(snap.data().notificationPrefs || {});
    })();
  }, [user?.uid]);

  const togglePref = async (key) => {
    if (!user?.uid) return;
    const newVal = !values[key];
    setValues(prev => ({ ...prev, [key]: newVal }));
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        [`notificationPrefs.${key}`]: newVal,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      setValues(prev => ({ ...prev, [key]: !newVal }));
    }
  };

  return (
    <div className="bg-white border border-[#c5c5d7] rounded-xl p-8 space-y-4 max-w-2xl">
      <h3 className="text-xl font-semibold text-[#131b2e] mb-4">Notification Preferences</h3>
      {prefs.map((n, i) => (
        <label key={n} className="flex justify-between items-center p-4 border border-[#c5c5d7] rounded-lg cursor-pointer hover:bg-[#f2f3ff] transition-colors">
          <span className="font-medium">{n}</span>
          <input type="checkbox" checked={values[prefKeys[i]] !== false}
            onChange={() => togglePref(prefKeys[i])}
            className="w-5 h-5 rounded text-[#0623bb] focus:ring-[#0623bb]" />
        </label>
      ))}
    </div>
  );
}

/* ─── PAYMENT TAB ───────────────────────────────────────── */
function PaymentTab({ user }) {
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'users', user.uid, 'wallet', 'balance'));
        if (snap.exists()) {
          const w = snap.data();
          const methods = [];
          if (w.bankAccount) methods.push({ type: 'bank', ...w.bankAccount, isPrimary: true });
          if (w.upiId) methods.push({ type: 'upi', id: w.upiId, isPrimary: !w.bankAccount });
          setPaymentMethods(methods);
        }
      } catch (err) {
        console.warn('Payment load error:', err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.uid]);

  return (
    <div className="bg-white border border-[#c5c5d7] rounded-xl p-8 space-y-6 max-w-2xl">
      <h3 className="text-xl font-semibold text-[#131b2e]">Payment Details</h3>
      {loading ? (
        <div className="flex items-center gap-3 text-[#757686]">
          <div className="w-5 h-5 border-2 border-[#0623bb] border-t-transparent rounded-full animate-spin" />
          Loading payment methods...
        </div>
      ) : paymentMethods.length === 0 ? (
        <div className="text-center py-8">
          <span className="material-symbols-outlined text-[48px] text-[#c5c5d7] block mb-2">account_balance_wallet</span>
          <p className="text-[#454655] font-medium">No payment methods added yet</p>
          <p className="text-xs text-[#757686] mt-1">Add a bank account or UPI ID in the Wallet page to receive payouts.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {paymentMethods.map((m, i) => (
            <div key={i} className="p-4 border border-[#c5c5d7] rounded-lg flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#0623bb]">{m.type === 'bank' ? 'account_balance' : 'credit_card'}</span>
                <div>
                  <p className="font-semibold">{m.type === 'bank' ? 'Bank Account' : 'UPI'}</p>
                  <p className="text-sm text-[#454655]">{m.type === 'bank' ? `${m.bankName || 'Bank'} •••• ${(m.accountNumber || '').slice(-4)}` : m.id}</p>
                </div>
              </div>
              {m.isPrimary && <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-bold">Primary</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── PRIVACY TAB ───────────────────────────────────────── */
function PrivacyTab({ user, router }) {
  const [privacyPrefs, setPrivacyPrefs] = useState({});
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const privacyOptions = [
    { key: 'publicProfile', label: 'Make profile public on leaderboard' },
    { key: 'showTaskHistory', label: 'Allow companies to view my task history' },
    { key: 'anonymizedData', label: 'Share anonymized data for platform improvements' },
    { key: 'showEarnings', label: 'Show earnings on public profile' },
  ];

  useEffect(() => {
    if (!user?.uid) return;
    (async () => {
      const snap = await getDoc(doc(db, 'users', user.uid, 'candidateProfile', 'profile'));
      if (snap.exists()) {
        const d = snap.data();
        setPrivacyPrefs({
          publicProfile: d.isPublic !== false,
          showTaskHistory: d.showTaskHistory !== false,
          anonymizedData: d.anonymizedData !== false,
          showEarnings: d.showEarnings !== false,
        });
      }
    })();
  }, [user?.uid]);

  const togglePrivacy = async (key) => {
    if (!user?.uid) return;
    const newVal = !privacyPrefs[key];
    setPrivacyPrefs(prev => ({ ...prev, [key]: newVal }));
    try {
      const profileRef = doc(db, 'users', user.uid, 'candidateProfile', 'profile');
      const fieldMap = { publicProfile: 'isPublic', showTaskHistory: 'showTaskHistory', anonymizedData: 'anonymizedData', showEarnings: 'showEarnings' };
      await updateDoc(profileRef, { [fieldMap[key]]: newVal, updatedAt: serverTimestamp() });
    } catch (err) {
      setPrivacyPrefs(prev => ({ ...prev, [key]: !newVal }));
    }
  };

  const handleDeleteAccount = async () => {
    if (confirmText !== 'DELETE') return;
    setDeleting(true);
    try {
      const idToken = await auth.currentUser.getIdToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/delete-account`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Delete failed');
      await signOut(auth);
      router.push('/login');
    } catch (err) {
      alert('Account deletion failed: ' + err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="bg-white border border-[#c5c5d7] rounded-xl p-8 space-y-4 max-w-2xl">
      <h3 className="text-xl font-semibold text-[#131b2e] mb-4">Privacy & Data</h3>
      {privacyOptions.map(opt => (
        <label key={opt.key} className="flex justify-between items-center p-4 border border-[#c5c5d7] rounded-lg cursor-pointer hover:bg-[#f2f3ff] transition-colors">
          <span className="font-medium">{opt.label}</span>
          <input type="checkbox" checked={privacyPrefs[opt.key] !== false}
            onChange={() => togglePrivacy(opt.key)}
            className="w-5 h-5 rounded text-[#0623bb] focus:ring-[#0623bb]" />
        </label>
      ))}
      <div className="pt-6 border-t border-[#c5c5d7] space-y-4">
        {!showDeleteConfirm ? (
          <button onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-bold hover:bg-red-50">
            Delete Account
          </button>
        ) : (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-3">
            <p className="text-sm text-red-700 font-semibold">⚠️ This action is permanent and cannot be undone.</p>
            <p className="text-sm text-red-600">Type <span className="font-bold">DELETE</span> to confirm:</p>
            <input type="text" value={confirmText} onChange={e => setConfirmText(e.target.value)}
              className="w-full px-4 py-2 border border-red-300 rounded-lg outline-none focus:ring-2 focus:ring-red-500" placeholder="Type DELETE" />
            <div className="flex gap-3">
              <button onClick={handleDeleteAccount} disabled={confirmText !== 'DELETE' || deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 disabled:opacity-50">
                {deleting ? 'Deleting...' : 'Permanently Delete My Account'}
              </button>
              <button onClick={() => { setShowDeleteConfirm(false); setConfirmText(''); }}
                className="px-4 py-2 border border-[#c5c5d7] text-[#454655] rounded-lg text-sm font-bold hover:bg-slate-50">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
