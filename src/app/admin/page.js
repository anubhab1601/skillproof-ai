'use client';
import { useState } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';

const tabs = ['Overview', 'Users', 'Tasks', 'Escrow', 'Integrity', 'Disputes', 'Revenue'];

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('Overview');
  const { user } = useAuth();

  return (
    <ProtectedRoute role="admin">
    <div className="min-h-screen bg-[#0f1115] text-white">
      {/* Admin Header */}
      <header className="bg-[#161a1f] border-b border-[#2a2f36] sticky top-0 z-50">
        <div className="max-w-[1440px] mx-auto px-6 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-sm">shield</span>
            </div>
            <span className="text-lg font-black">SkillProof Admin</span>
            <span className="px-2 py-0.5 bg-red-600/20 text-red-400 rounded text-[10px] font-bold uppercase tracking-wider">Staff Only</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-[#8f9099]">{user?.email || 'admin@skillproof.com'}</span>
            <Link href="/" className="text-sm text-red-400 hover:text-red-300">Exit Admin</Link>
          </div>
        </div>
      </header>

      <div className="max-w-[1440px] mx-auto px-6 py-6">
        {/* Tabs */}
        <div className="flex gap-1 mb-8 bg-[#1d1f24] p-1 rounded-xl w-fit">
          {tabs.map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === t ? 'bg-white text-[#131b2e]' : 'text-[#8f9099] hover:text-white'}`}
            >
              {t}
            </button>
          ))}
        </div>

        {activeTab === 'Overview' && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Total Users', value: '12,847', change: '+342 this week', icon: 'people', color: 'from-blue-600 to-blue-400' },
                { label: 'Active Tasks', value: '156', change: '23 closing today', icon: 'assignment', color: 'from-emerald-600 to-emerald-400' },
                { label: 'Escrow Locked', value: '₹48.2L', change: 'Across 156 tasks', icon: 'lock', color: 'from-amber-600 to-amber-400' },
                { label: 'Revenue (MTD)', value: '₹2.41L', change: '+18% vs last month', icon: 'trending_up', color: 'from-purple-600 to-purple-400' },
              ].map(k => (
                <div key={k.label} className={`bg-gradient-to-br ${k.color} rounded-xl p-6 relative overflow-hidden`}>
                  <span className="material-symbols-outlined absolute top-3 right-3 text-[48px] opacity-10">{k.icon}</span>
                  <p className="text-xs font-semibold uppercase tracking-wider opacity-80 mb-2">{k.label}</p>
                  <p className="text-3xl font-bold">{k.value}</p>
                  <p className="text-xs opacity-70 mt-1">{k.change}</p>
                </div>
              ))}
            </div>

            {/* Quick Queues */}
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-12 lg:col-span-6 bg-[#1d1f24] rounded-xl p-6 border border-[#2a2f36]">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-400">flag</span> Integrity Flags Queue
                  <span className="ml-auto bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded text-xs font-bold">8 pending</span>
                </h3>
                {[
                  { user: 'user_482', task: 'ML Pipeline', flag: 'High similarity with public repo', severity: 'High' },
                  { user: 'user_1201', task: 'API Audit', flag: 'Submission time < 5 minutes', severity: 'Medium' },
                  { user: 'user_763', task: 'Design System', flag: 'AI-generated content detected', severity: 'High' },
                ].map((f, i) => (
                  <div key={i} className="flex justify-between items-center p-3 rounded-lg hover:bg-[#272a30] transition-colors mb-2">
                    <div>
                      <p className="text-sm font-semibold">{f.user} → {f.task}</p>
                      <p className="text-xs text-[#8f9099]">{f.flag}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-bold ${f.severity === 'High' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>{f.severity}</span>
                  </div>
                ))}
              </div>

              <div className="col-span-12 lg:col-span-6 bg-[#1d1f24] rounded-xl p-6 border border-[#2a2f36]">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-purple-400">gavel</span> Dispute Queue
                  <span className="ml-auto bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded text-xs font-bold">5 open</span>
                </h3>
                {[
                  { id: 'DSP-2041', from: 'alex_r', task: 'ML Pipeline', sla: '2d remaining', amount: '₹1,200' },
                  { id: 'DSP-2038', from: 'maya_c', task: 'Design Sprint', sla: '4d remaining', amount: '₹800' },
                  { id: 'DSP-2035', from: 'jordan_p', task: 'Security Audit', sla: 'SLA Breached!', amount: '₹2,400' },
                ].map((d, i) => (
                  <div key={i} className="flex justify-between items-center p-3 rounded-lg hover:bg-[#272a30] transition-colors mb-2">
                    <div>
                      <p className="text-sm font-semibold">#{d.id} — {d.from}</p>
                      <p className="text-xs text-[#8f9099]">{d.task} • {d.amount}</p>
                    </div>
                    <span className={`text-xs font-bold ${d.sla.includes('Breached') ? 'text-red-400' : 'text-[#8f9099]'}`}>{d.sla}</span>
                  </div>
                ))}
              </div>

              {/* Task Moderation */}
              <div className="col-span-12 bg-[#1d1f24] rounded-xl p-6 border border-[#2a2f36]">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-400">task</span> Task Moderation Queue
                  <span className="ml-auto bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded text-xs font-bold">3 pending</span>
                </h3>
                <table className="w-full text-left">
                  <thead className="text-xs uppercase tracking-wider text-[#8f9099] border-b border-[#2a2f36]">
                    <tr>
                      <th className="px-4 py-3">Task</th>
                      <th className="px-4 py-3">Company</th>
                      <th className="px-4 py-3">Prize</th>
                      <th className="px-4 py-3">Submitted</th>
                      <th className="px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2a2f36]">
                    {[
                      { task: 'Blockchain Smart Contract', company: 'CryptoLab', prize: '₹5,000', time: '2h ago' },
                      { task: 'Flutter E-commerce App', company: 'ShopNext', prize: '₹3,200', time: '5h ago' },
                      { task: 'Vulnerability Scan Tool', company: 'SecureStack', prize: '₹4,800', time: '8h ago' },
                    ].map((t, i) => (
                      <tr key={i} className="hover:bg-[#272a30]">
                        <td className="px-4 py-3 font-semibold text-sm">{t.task}</td>
                        <td className="px-4 py-3 text-sm text-[#8f9099]">{t.company}</td>
                        <td className="px-4 py-3 text-sm font-medium text-emerald-400">{t.prize}</td>
                        <td className="px-4 py-3 text-sm text-[#8f9099]">{t.time}</td>
                        <td className="px-4 py-3 flex gap-2">
                          <button className="px-3 py-1 bg-emerald-600 text-white rounded text-xs font-bold hover:bg-emerald-700">Approve</button>
                          <button className="px-3 py-1 bg-red-600/20 text-red-400 rounded text-xs font-bold hover:bg-red-600/30">Reject</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Platform Health */}
              <div className="col-span-12 lg:col-span-4 bg-[#1d1f24] rounded-xl p-6 border border-[#2a2f36]">
                <h3 className="text-lg font-semibold mb-4">Platform Health</h3>
                {[
                  { label: 'API Uptime', value: '99.97%', status: 'healthy' },
                  { label: 'Avg Response Time', value: '142ms', status: 'healthy' },
                  { label: 'Active Websockets', value: '2,847', status: 'healthy' },
                  { label: 'Queue Backlog', value: '12 jobs', status: 'warning' },
                ].map(h => (
                  <div key={h.label} className="flex justify-between items-center p-3 rounded-lg mb-2">
                    <span className="text-sm text-[#8f9099]">{h.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">{h.value}</span>
                      <div className={`w-2 h-2 rounded-full ${h.status === 'healthy' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Revenue */}
              <div className="col-span-12 lg:col-span-8 bg-[#1d1f24] rounded-xl p-6 border border-[#2a2f36]">
                <h3 className="text-lg font-semibold mb-4">Revenue Dashboard</h3>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {[
                    { label: 'Total GMV', value: '₹1.2Cr', sub: 'All time' },
                    { label: 'Platform Fees (5%)', value: '₹6.1L', sub: 'All time' },
                    { label: 'Avg Task Value', value: '₹3,100', sub: '156 active tasks' },
                  ].map(r => (
                    <div key={r.label} className="bg-[#272a30] p-4 rounded-lg">
                      <p className="text-xs text-[#8f9099] uppercase tracking-wider mb-1">{r.label}</p>
                      <p className="text-xl font-bold">{r.value}</p>
                      <p className="text-[10px] text-[#8f9099] mt-1">{r.sub}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'Users' && (
          <div className="bg-[#1d1f24] rounded-xl p-6 border border-[#2a2f36]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold">User Management</h3>
              <div className="flex gap-3">
                <input className="px-4 py-2 bg-[#272a30] border border-[#2a2f36] rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 text-white" placeholder="Search users..." />
                <select className="px-3 py-2 bg-[#272a30] border border-[#2a2f36] rounded-lg text-sm text-white">
                  <option>All Roles</option><option>Candidate</option><option>Company</option><option>Admin</option>
                </select>
              </div>
            </div>
            <table className="w-full text-left">
              <thead className="text-xs uppercase tracking-wider text-[#8f9099] border-b border-[#2a2f36]">
                <tr><th className="px-4 py-3">User</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Tasks</th><th className="px-4 py-3">Joined</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Action</th></tr>
              </thead>
              <tbody className="divide-y divide-[#2a2f36]">
                {[
                  { name: 'Alex Rivers', email: 'alex@mail.com', role: 'Candidate', tasks: 42, joined: 'Jan 2024', status: 'Active' },
                  { name: 'TechScale Inc.', email: 'hr@techscale.com', role: 'Company', tasks: 8, joined: 'Feb 2024', status: 'Active' },
                  { name: 'Jordan Park', email: 'jordan@mail.com', role: 'Candidate', tasks: 31, joined: 'Mar 2024', status: 'Suspended' },
                ].map((u, i) => (
                  <tr key={i} className="hover:bg-[#272a30]">
                    <td className="px-4 py-3"><p className="font-semibold text-sm">{u.name}</p><p className="text-xs text-[#8f9099]">{u.email}</p></td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-bold ${u.role === 'Company' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'}`}>{u.role}</span></td>
                    <td className="px-4 py-3 text-sm">{u.tasks}</td>
                    <td className="px-4 py-3 text-sm text-[#8f9099]">{u.joined}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-bold ${u.status === 'Active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>{u.status}</span></td>
                    <td className="px-4 py-3"><button className="text-blue-400 text-sm font-semibold hover:underline">Manage</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!['Overview', 'Users'].includes(activeTab) && (
          <div className="bg-[#1d1f24] rounded-xl p-12 border border-[#2a2f36] text-center">
            <span className="material-symbols-outlined text-[#8f9099] text-[64px] mb-4">construction</span>
            <h3 className="text-xl font-semibold mb-2">{activeTab} Module</h3>
            <p className="text-[#8f9099]">This admin module is under development. Core functionality coming soon.</p>
          </div>
        )}
      </div>
    </div>
    </ProtectedRoute>
  );
}
