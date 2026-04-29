'use client';
import { use, useState } from 'react';
import Link from 'next/link';

export default function CandidateProfilePage({ params }) {
  const { id } = use(params);
  const [notes, setNotes] = useState('');
  const [bookmarked, setBookmarked] = useState(false);

  const candidate = {
    name: 'Alex Rivers',
    title: 'Senior Full-Stack Engineer',
    skillScore: 94,
    pei: 98,
    tasks: 24,
    rank: 'Top 1%',
    bio: 'Passionate about building scalable systems. 6+ years in React, Node, and cloud architecture. Open to challenging roles in fintech and AI.',
    skills: ['React', 'TypeScript', 'Node.js', 'AWS', 'PostgreSQL', 'Redis', 'Docker', 'GraphQL'],
    radar: { quality: 95, perf: 92, docs: 88, testing: 93, design: 85, speed: 90 },
    github: 'github.com/alexrivers',
    portfolio: 'alexrivers.dev',
    submissions: [
      { task: 'React Component Library', company: 'Company A', score: 94, date: 'Apr 26' },
      { task: 'API Security Audit', company: 'Company B', score: 91, date: 'Apr 20' },
      { task: 'Distributed Cache System', company: 'Company C', score: 89, date: 'Apr 12' },
      { task: 'Real-time Dashboard', company: 'Company A', score: 96, date: 'Mar 28' },
    ],
  };

  return (
    <>
      <div className="mb-4">
        <button onClick={() => window.history.back()} className="text-sm text-[#0623bb] font-medium hover:underline flex items-center gap-1">
          <span className="material-symbols-outlined text-sm">arrow_back</span> Back
        </button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Profile Header */}
        <div className="col-span-12 bg-white border border-[#c5c5d7] rounded-xl p-8">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-3xl">
                {candidate.name.charAt(0)}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-[#131b2e]">{candidate.name}</h1>
                <p className="text-[#454655] mt-1">{candidate.title}</p>
                <div className="flex items-center gap-4 mt-3">
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">{candidate.rank}</span>
                  <span className="text-sm text-[#454655]">{candidate.tasks} tasks completed</span>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setBookmarked(!bookmarked)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
                  bookmarked ? 'bg-amber-50 border-amber-300 text-amber-700' : 'border-[#c5c5d7] text-[#454655] hover:bg-[#f2f3ff]'
                }`}
              >
                <span className="material-symbols-outlined text-sm mr-1" style={bookmarked ? { fontVariationSettings: "'FILL' 1" } : {}}>bookmark</span>
                {bookmarked ? 'Saved' : 'Save to Pool'}
              </button>
              <button className="px-6 py-2 bg-[#0623bb] text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-all">
                Send Job Offer
              </button>
            </div>
          </div>
          <p className="mt-6 text-sm text-[#454655] max-w-2xl">{candidate.bio}</p>
        </div>

        {/* Left column */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {/* Radar / Skill Scores */}
          <section className="bg-white border border-[#c5c5d7] rounded-xl p-6">
            <h3 className="text-lg font-semibold text-[#131b2e] mb-6">Performance Radar</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(candidate.radar).map(([key, val]) => (
                <div key={key} className="p-4 bg-[#f2f3ff] rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium capitalize text-[#131b2e]">{key}</span>
                    <span className={`text-sm font-bold ${val >= 90 ? 'text-emerald-600' : 'text-amber-600'}`}>{val}</span>
                  </div>
                  <div className="h-2 bg-[#eaedff] rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${val >= 90 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${val}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Submission History */}
          <section className="bg-white border border-[#c5c5d7] rounded-xl p-6">
            <h3 className="text-lg font-semibold text-[#131b2e] mb-4">Submission History</h3>
            <table className="w-full text-left">
              <thead className="bg-[#f2f3ff] text-xs uppercase tracking-wider text-[#454655]">
                <tr>
                  <th className="px-4 py-3">Task</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c5c5d7]">
                {candidate.submissions.map((s, i) => (
                  <tr key={i} className="hover:bg-[#f2f3ff] transition-colors">
                    <td className="px-4 py-3 font-semibold text-sm">{s.task}</td>
                    <td className="px-4 py-3 text-sm text-[#454655]">{s.company}</td>
                    <td className="px-4 py-3"><span className={`font-bold ${s.score >= 90 ? 'text-emerald-600' : 'text-amber-600'}`}>{s.score}</span></td>
                    <td className="px-4 py-3 text-sm text-[#454655]">{s.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>

        {/* Right column */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          {/* Score Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#0623bb] text-white rounded-xl p-5 text-center">
              <p className="text-3xl font-bold">{candidate.skillScore}</p>
              <p className="text-xs uppercase tracking-wider opacity-80 mt-1">SkillScore</p>
            </div>
            <div className="bg-[#131b2e] text-white rounded-xl p-5 text-center">
              <p className="text-3xl font-bold">{candidate.pei}</p>
              <p className="text-xs uppercase tracking-wider opacity-80 mt-1">PEI Score</p>
            </div>
          </div>

          {/* Skills */}
          <section className="bg-white border border-[#c5c5d7] rounded-xl p-6">
            <h3 className="text-lg font-semibold text-[#131b2e] mb-4">Skills</h3>
            <div className="flex flex-wrap gap-2">
              {candidate.skills.map(s => (
                <span key={s} className="bg-[#eaedff] text-[#454655] px-3 py-1 rounded-full text-xs font-medium">{s}</span>
              ))}
            </div>
          </section>

          {/* Links */}
          <section className="bg-white border border-[#c5c5d7] rounded-xl p-6">
            <h3 className="text-lg font-semibold text-[#131b2e] mb-4">Links</h3>
            <div className="space-y-3">
              <a href="#" className="flex items-center gap-3 p-3 bg-[#f2f3ff] rounded-lg hover:bg-[#eaedff] transition-colors">
                <span className="material-symbols-outlined text-[#454655]">code</span>
                <span className="text-sm font-medium">{candidate.github}</span>
              </a>
              <a href="#" className="flex items-center gap-3 p-3 bg-[#f2f3ff] rounded-lg hover:bg-[#eaedff] transition-colors">
                <span className="material-symbols-outlined text-[#454655]">language</span>
                <span className="text-sm font-medium">{candidate.portfolio}</span>
              </a>
            </div>
          </section>

          {/* Recruiter Notes */}
          <section className="bg-white border border-[#c5c5d7] rounded-xl p-6">
            <h3 className="text-lg font-semibold text-[#131b2e] mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#0623bb] text-sm">lock</span> Internal Notes
            </h3>
            <p className="text-xs text-[#757686] mb-3">Private — only visible to your team.</p>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-[#eaedff] border border-[#c5c5d7] rounded-lg outline-none focus:ring-2 focus:ring-[#0623bb] text-sm h-24"
              placeholder="Add recruiter notes about this candidate..."
            />
            <button className="mt-2 px-4 py-2 bg-[#0623bb] text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-all">
              Save Notes
            </button>
          </section>
        </div>
      </div>
    </>
  );
}
