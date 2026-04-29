'use client';
import { use } from 'react';
import Link from 'next/link';
import TopNav from '@/components/TopNav';

export default function PublicTaskPage({ params }) {
  const { id } = use(params);

  const task = {
    title: 'React Component Library Migration',
    company: 'TechScale Inc.',
    domain: 'Software Engineering',
    level: 'Intermediate',
    prize: '₹2,400',
    deadline: '3 days left',
    submissions: 42,
    maxSubmissions: 50,
    tags: ['React', 'TypeScript', 'Tailwind'],
    briefPreview: 'Refactor a legacy UI kit to use Tailwind CSS and Headless UI. Ensure all components are accessible (WCAG 2.1) and support dark mode natively. The library should include Button, Input, Modal, Dropdown, Toast, and Tabs components with full...',
  };

  return (
    <>
      <TopNav variant="landing" />
      <main className="max-w-[800px] mx-auto px-6 py-12">
        {/* Task Card */}
        <div className="bg-white border border-[#c5c5d7] rounded-2xl p-8 mb-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">Active</span>
                <span className="px-3 py-1 bg-[#eaedff] text-[#454655] rounded-full text-xs font-bold">{task.domain}</span>
                <span className="px-3 py-1 bg-[#eaedff] text-[#454655] rounded-full text-xs font-bold">{task.level}</span>
              </div>
              <h1 className="text-3xl font-bold text-[#131b2e] mb-2">{task.title}</h1>
              <p className="text-sm text-[#454655]">Posted by <strong>{task.company}</strong></p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs text-[#757686] uppercase font-bold tracking-wider">Prize Pool</p>
              <p className="text-3xl font-bold text-emerald-600">{task.prize}</p>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-[#f2f3ff] p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-[#131b2e]">{task.submissions}/{task.maxSubmissions}</p>
              <p className="text-xs text-[#757686] uppercase font-semibold mt-1">Submissions</p>
            </div>
            <div className="bg-[#f2f3ff] p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-[#131b2e]">{task.deadline}</p>
              <p className="text-xs text-[#757686] uppercase font-semibold mt-1">Remaining</p>
            </div>
            <div className="bg-[#f2f3ff] p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-[#131b2e]">{task.level}</p>
              <p className="text-xs text-[#757686] uppercase font-semibold mt-1">Difficulty</p>
            </div>
          </div>

          {/* Skills */}
          <div className="flex flex-wrap gap-2 mb-6">
            {task.tags.map(tag => (
              <span key={tag} className="bg-[#eaedff] text-[#0623bb] px-3 py-1 rounded-full text-sm font-medium">{tag}</span>
            ))}
          </div>

          {/* Truncated Brief */}
          <div className="relative">
            <p className="text-sm text-[#454655] leading-relaxed">{task.briefPreview}</p>
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent" />
          </div>
        </div>

        {/* Login wall */}
        <div className="bg-[#f2f3ff] border border-[#c5c5d7] rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-[#eaedff] rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-[#0623bb] text-3xl">lock</span>
          </div>
          <h2 className="text-xl font-bold text-[#131b2e] mb-2">Log in to see the full task brief</h2>
          <p className="text-sm text-[#454655] mb-6 max-w-md mx-auto">
            Create a free account or log in to view the complete brief, deliverables, and evaluation criteria. Then submit your solution to earn.
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/login" className="px-6 py-3 bg-[#0623bb] text-white rounded-xl font-semibold hover:opacity-90 transition-all">
              Login
            </Link>
            <Link href="/register" className="px-6 py-3 border border-[#c5c5d7] text-[#131b2e] rounded-xl font-semibold hover:bg-[#eaedff] transition-all">
              Register Free
            </Link>
          </div>
        </div>

        {/* Share buttons */}
        <div className="mt-6 flex items-center justify-center gap-4">
          <span className="text-sm text-[#757686]">Share this task:</span>
          {[
            { icon: 'share', label: 'Copy Link' },
            { icon: 'chat', label: 'WhatsApp' },
            { icon: 'badge', label: 'LinkedIn' },
          ].map(s => (
            <button key={s.label} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#c5c5d7] rounded-lg text-sm text-[#454655] hover:bg-[#f2f3ff] transition-colors">
              <span className="material-symbols-outlined text-sm">{s.icon}</span>
              {s.label}
            </button>
          ))}
        </div>
      </main>
    </>
  );
}
