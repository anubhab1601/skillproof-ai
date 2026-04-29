'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';

export default function TaskMarketplace() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeDomain, setActiveDomain] = useState('All');
  const [activeDifficulty, setActiveDifficulty] = useState('All');
  const [search, setSearch] = useState('');

  const domains = ['All', 'Coding', 'Design', 'Data Science', 'Security'];
  const difficulties = ['All', 'Entry', 'Intermediate', 'Expert'];

  useEffect(() => {
    async function loadTasks() {
      try {
        const tasksSnap = await getDocs(
          query(collection(db, 'tasks'), where('status', '==', 'live'), orderBy('createdAt', 'desc'))
        );
        setTasks(tasksSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error('Error loading tasks:', err);
      } finally {
        setLoading(false);
      }
    }
    loadTasks();
  }, []);

  const formatPaise = (paise) => `₹${((paise || 0) / 100).toLocaleString('en-IN')}`;

  const getTimeLeft = (deadline) => {
    if (!deadline) return 'No deadline';
    const dl = deadline.toDate ? deadline.toDate() : new Date(deadline);
    const diff = dl - new Date();
    if (diff <= 0) return 'Expired';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h`;
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${String(hours).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m`;
  };

  const filtered = tasks.filter(t => {
    const matchesDomain = activeDomain === 'All' || t.taskType?.toLowerCase() === activeDomain.toLowerCase();
    const matchesDiff = activeDifficulty === 'All' || t.difficulty?.toLowerCase() === activeDifficulty.toLowerCase();
    const matchesSearch = !search || t.title?.toLowerCase().includes(search.toLowerCase()) || t.companyName?.toLowerCase().includes(search.toLowerCase());
    return matchesDomain && matchesDiff && matchesSearch;
  });

  const taskIcon = (type) => {
    const map = { coding: 'code', design: 'palette', 'data science': 'analytics', security: 'shield', writing: 'edit_note' };
    return map[type?.toLowerCase()] || 'task_alt';
  };

  return (
    <div className="max-w-[1280px] mx-auto p-8 lg:p-12">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-[#131b2e] mb-1">Verified Marketplace</h1>
        <p className="text-[#757686]">{loading ? 'Loading...' : `Showing ${filtered.length} active evidence-based hiring tasks`}</p>
      </header>

      {/* Filters Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 mb-8 flex flex-wrap items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
          <input
            className="w-full pl-9 pr-4 py-2.5 bg-[#f8f9fc] border border-[#e2e4ea] rounded-lg text-sm focus:outline-none focus:border-[#0623bb] focus:ring-1 focus:ring-[#0623bb]/20 transition-all"
            placeholder="Search tasks or companies..."
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Domain Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#757686] uppercase tracking-wider">Domain:</span>
          <div className="flex gap-1.5">
            {domains.map(d => (
              <button
                key={d}
                onClick={() => setActiveDomain(d)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  activeDomain === d
                    ? 'bg-[#0623bb] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#757686] uppercase tracking-wider">Level:</span>
          <select
            value={activeDifficulty}
            onChange={(e) => setActiveDifficulty(e.target.value)}
            className="text-sm border border-[#e2e4ea] rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:border-[#0623bb]"
          >
            {difficulties.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Task Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-[#0623bb] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-xl">
          <span className="material-symbols-outlined text-[48px] text-slate-300 mb-3 block">search_off</span>
          <p className="font-semibold text-[#131b2e] mb-1">{tasks.length === 0 ? 'No live tasks available' : 'No tasks match your filters'}</p>
          <p className="text-sm text-[#757686]">{tasks.length === 0 ? 'Check back soon for new opportunities.' : 'Try adjusting your search or filters.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filtered.map(task => {
            const timeLeft = getTimeLeft(task.deadline);
            const urgent = timeLeft.includes('h') && !timeLeft.includes('d');
            return (
              <Link href={`/tasks/${task.taskId || task.id}`} key={task.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-[#0623bb]/30 transition-all group">
                <div className="flex justify-between items-start mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-lg bg-indigo-50 flex items-center justify-center border border-slate-100">
                      <span className="material-symbols-outlined text-indigo-600">{taskIcon(task.taskType)}</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-[#131b2e] text-sm">{task.companyName || 'Unknown Company'}</h4>
                      <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase">
                        <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span> Verified
                      </div>
                    </div>
                  </div>
                  <span className="bg-indigo-50 text-[#2e42d1] text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">{task.taskType || 'Task'}</span>
                </div>
                <h2 className="text-lg font-semibold mb-2 group-hover:text-[#0623bb] transition-colors">{task.title}</h2>
                <p className="text-sm text-[#757686] mb-5 line-clamp-2">{task.description?.substring(0, 150)}</p>
                <div className="flex flex-col gap-3 mb-5">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-[#757686]">Prize Pool</span>
                    <span className="font-bold text-slate-900 text-lg">{formatPaise(task.prizePool)}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(((task.totalSubmissions || 0) / (task.maxCandidates || 50)) * 100, 100)}%` }} />
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="flex items-center gap-1 text-slate-500"><span className="material-symbols-outlined text-sm">groups</span> {task.totalSubmissions || 0} submissions</span>
                    <span className={`flex items-center gap-1 ${urgent ? 'text-[#ba1a1a] font-semibold' : 'text-slate-500'}`}><span className="material-symbols-outlined text-sm">schedule</span> {timeLeft} remaining</span>
                  </div>
                </div>
                <button className="w-full py-2.5 border-2 border-[#0623bb] text-[#0623bb] font-bold rounded-lg hover:bg-[#0623bb] hover:text-white transition-all text-sm">
                  View Task
                </button>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
