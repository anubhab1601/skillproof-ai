'use client';
import Link from 'next/link';
import Image from 'next/image';
import TopNav from '@/components/TopNav';

export default function LandingPage() {
  return (
    <>
      <TopNav variant="landing" />
      <main>
        {/* Hero Section */}
        <section className="max-w-[1280px] mx-auto px-6 py-20 md:py-32 grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#dfe0ff] text-[#1930c3] text-xs font-semibold uppercase tracking-wider">
              <span className="material-symbols-outlined text-[16px]">verified_user</span>
              Evidence-Based Hiring
            </div>
            <h1 className="text-5xl md:text-[48px] font-bold text-[#131b2e] leading-[1.1] tracking-[-0.02em]">
              The Evaluation Infrastructure for the Modern Workforce
            </h1>
            <p className="text-lg text-[#454655] max-w-lg leading-relaxed">
              Move beyond resumes. Prove your skills through real-work trials. Hire verified talent based on objective performance data.
            </p>
            <div className="flex flex-wrap gap-4 pt-4">
              <Link
                href="/company/tasks/new"
                className="bg-[#0623bb] text-white px-8 py-4 rounded-xl font-semibold hover:shadow-lg transition-shadow flex items-center gap-2"
              >
                Post a Task
                <span className="material-symbols-outlined">arrow_forward</span>
              </Link>
              <Link
                href="/tasks"
                className="bg-[#e2e7ff] text-[#131b2e] px-8 py-4 rounded-xl font-semibold hover:bg-[#dae2fd] transition-colors"
              >
                Find Work
              </Link>
            </div>
          </div>
          <div className="relative">
            <div className="aspect-square bg-gradient-to-tr from-[#2e42d1]/20 to-[#6063ee]/20 rounded-[2rem] overflow-hidden border border-[#c5c5d7]/30 flex items-center justify-center">
              <Image
                src="/screen_1.png"
                alt="SkillProof Performance Analytics Dashboard"
                width={600}
                height={600}
                className="w-full h-full object-cover"
                priority
              />
              {/* Score overlay card */}
              <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-2xl shadow-xl border border-slate-100 max-w-[240px]">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">SYSTEM DESIGN</p>
                    <p className="font-bold text-slate-900">Score: 98%</p>
                  </div>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full w-[98%] rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3-Step Explainer */}
        <section className="bg-[#f2f3ff] py-20">
          <div className="max-w-[1280px] mx-auto px-6">
            <div className="text-center mb-24">
              <h2 className="text-[30px] font-semibold text-[#131b2e] mb-4 leading-[1.3]">How SkillProof Works</h2>
              <p className="text-[#454655]">Three simple steps to transition from candidate to confirmed professional.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-12 relative">
              {[
                { icon: 'assignment', title: 'Claim Task', desc: 'Browse real-world engineering, design, or marketing tasks posted by companies looking for talent.', color: 'bg-[#0623bb]' },
                { icon: 'rocket_launch', title: 'Show Performance', desc: 'Submit your solution. Our automated and peer-review system verifies your technical proficiency.', color: 'bg-[#4648d4]' },
                { icon: 'payments', title: 'Instant Payout', desc: 'Get paid for your contribution and unlock permanent skill badges on your global talent profile.', color: 'bg-[#9a3100]' },
              ].map((step, i) => (
                <div key={i} className="relative z-10 space-y-6 text-center">
                  <div className={`w-20 h-20 ${step.color} text-white rounded-2xl mx-auto flex items-center justify-center shadow-lg`}>
                    <span className="material-symbols-outlined text-[32px]">{step.icon}</span>
                  </div>
                  <h3 className="text-2xl font-semibold">{step.title}</h3>
                  <p className="text-sm text-[#454655] px-4">{step.desc}</p>
                </div>
              ))}
              <div className="hidden md:block absolute top-10 left-[15%] right-[15%] h-[2px] border-t border-dashed border-[#c5c5d7]" />
            </div>
          </div>
        </section>

        {/* Active Marketplace Preview */}
        <section className="max-w-[1280px] mx-auto px-6 py-20">
          <div className="flex justify-between items-end mb-16">
            <div>
              <h2 className="text-[30px] font-semibold text-[#131b2e]">Active Marketplace</h2>
              <p className="text-[#454655] mt-2">Bounty tasks currently open for submission.</p>
            </div>
            <Link href="/tasks" className="text-[#0623bb] font-semibold flex items-center gap-1 hover:underline">
              View all tasks
              <span className="material-symbols-outlined text-[18px]">open_in_new</span>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Large Featured Task */}
            <div className="md:col-span-8 bg-white border border-slate-200 rounded-3xl p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex flex-col h-full">
                <div className="flex justify-between items-start mb-8">
                  <div className="flex gap-4">
                    <div className="w-16 h-16 rounded-xl bg-indigo-50 flex items-center justify-center border border-slate-100">
                      <span className="material-symbols-outlined text-indigo-600 text-3xl">code</span>
                    </div>
                    <div>
                      <h4 className="text-2xl font-semibold text-slate-900">React Component Library Migration</h4>
                      <p className="text-slate-500 text-sm">Published by TechScale Inc.</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">PRIZE POOL</p>
                    <p className="text-2xl font-bold text-emerald-600">₹2,400</p>
                  </div>
                </div>
                <p className="text-slate-600 mb-8 flex-grow">
                  Refactor a legacy UI kit to use Tailwind CSS and Headless UI. Ensure all components are accessible (WCAG 2.1) and support dark mode natively.
                </p>
                <div className="flex flex-wrap gap-2 mb-8">
                  {['REACT', 'TYPESCRIPT', 'TAILWIND'].map(tag => (
                    <span key={tag} className="bg-[#eaedff] px-3 py-1 rounded-full text-xs font-semibold text-[#0623bb] uppercase tracking-wider">{tag}</span>
                  ))}
                </div>
                <div className="flex items-center justify-between border-t border-slate-100 pt-6">
                  <div className="flex -space-x-2">
                    {[1,2,3].map(i => (
                      <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-bold">
                        {String.fromCharCode(64+i)}
                      </div>
                    ))}
                    <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-bold">+12</div>
                  </div>
                  <Link href="/tasks/1" className="bg-[#0623bb] text-white px-6 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity">
                    Accept Task
                  </Link>
                </div>
              </div>
            </div>
            {/* Side Tasks */}
            <div className="md:col-span-4 flex flex-col gap-6">
              {[
                { title: 'B2B Content Strategy', desc: 'Create a 3-month roadmap for a SaaS company targeting CTOs.', prize: '₹850', tag: 'MARKETING' },
                { title: 'Security Audit Trial', desc: 'Identify vulnerabilities in an open-source payment gateway.', prize: '₹1,200', tag: 'CYBERSECURITY' },
              ].map((task, i) => (
                <Link href={`/tasks/${i+2}`} key={i} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex-grow hover:shadow-md transition-shadow">
                  <div className="flex justify-between mb-4">
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                      <span className="material-symbols-outlined text-indigo-500">{i === 0 ? 'campaign' : 'shield'}</span>
                    </div>
                    <span className="text-emerald-600 font-bold">{task.prize}</span>
                  </div>
                  <h4 className="font-bold text-slate-900 mb-2">{task.title}</h4>
                  <p className="text-sm text-slate-500 mb-4">{task.desc}</p>
                  <span className="text-xs font-semibold bg-[#f2f3ff] text-[#454655] px-2 py-1 rounded uppercase tracking-wider">{task.tag}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Success Stories */}
        <section className="bg-slate-950 text-white py-20 overflow-hidden">
          <div className="max-w-[1280px] mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-20 items-center">
              <div className="relative">
                <div className="aspect-[4/5] rounded-[2rem] overflow-hidden bg-gradient-to-br from-indigo-900 to-slate-800 flex items-center justify-center">
                  <Image
                    src="/screen_2.png"
                    alt="SkillProof Success Story - Marcus V."
                    width={480}
                    height={600}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute top-12 -right-8 bg-white text-slate-900 p-6 rounded-2xl shadow-2xl max-w-[200px]">
                  <p className="text-sm italic font-medium">&quot;I landed a Senior Dev role at a top startup without a single interview. My SkillProof score did all the talking.&quot;</p>
                  <div className="mt-4 flex items-center gap-2">
                    <div className="w-6 h-6 bg-[#0623bb] rounded-full" />
                    <span className="font-bold text-xs uppercase">Marcus V.</span>
                  </div>
                </div>
              </div>
              <div className="space-y-10">
                <h2 className="text-4xl font-bold leading-tight">Verified by Data, <br/>Trusted by Giants</h2>
                <div className="space-y-8">
                  {[
                    { icon: 'hub', title: 'Global Skill Graph', desc: 'Our platform maps your performance against industry benchmarks, creating a dynamic proof-of-skill badge you can take anywhere.' },
                    { icon: 'speed', title: 'Accelerated Onboarding', desc: "Companies skip the 4-week interview loop for candidates with a SkillProof 'Verified' status." },
                  ].map((item, i) => (
                    <div key={i} className="flex gap-6">
                      <div className="shrink-0 w-12 h-12 rounded-full border border-slate-700 flex items-center justify-center text-[#dfe0ff]">
                        <span className="material-symbols-outlined">{item.icon}</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-xl mb-2">{item.title}</h4>
                        <p className="text-slate-400 text-sm">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="pt-8 flex gap-8 opacity-50 grayscale contrast-125">
                  <span className="font-black text-2xl">NETFLIX</span>
                  <span className="font-black text-2xl">STRIPE</span>
                  <span className="font-black text-2xl">AIRBNB</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="max-w-[1280px] mx-auto px-6 py-20">
          <div className="bg-[#0623bb] rounded-[3rem] p-12 md:p-24 text-center text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1)_0%,transparent_70%)]" />
            <div className="relative z-10 space-y-8">
              <h2 className="text-4xl md:text-5xl font-bold">Ready to Prove Your Value?</h2>
              <p className="text-[#dfe0ff] text-lg max-w-2xl mx-auto">
                Join 50,000+ experts earning through their output, not their origins.
              </p>
              <div className="flex justify-center gap-4">
                <Link href="/register" className="bg-white text-[#0623bb] px-10 py-4 rounded-xl font-bold hover:shadow-xl transition-all">
                  Get Started
                </Link>
                <button className="border border-white/30 hover:bg-white/10 px-10 py-4 rounded-xl font-bold transition-all">
                  Talk to Sales
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-20">
        <div className="max-w-[1280px] mx-auto px-6 grid md:grid-cols-4 gap-12">
          <div className="space-y-6">
            <span className="text-2xl font-black text-[#0623bb]">SkillProof</span>
            <p className="text-slate-500 text-sm leading-relaxed">
              The objective source of truth for professional skills. Building the future of permissionless work.
            </p>
          </div>
          {[
            { title: 'Marketplace', links: ['Find Tasks', 'Skill Categories', 'Leaderboards', 'Bounties'] },
            { title: 'Company', links: ['About Us', 'Success Stories', 'Privacy Policy', 'Terms of Service'] },
            { title: 'Resources', links: ['Documentation', 'API Reference', 'Community Forum', 'Help Center'] },
          ].map((col, i) => (
            <div key={i}>
              <h5 className="font-bold text-slate-900 mb-6">{col.title}</h5>
              <ul className="space-y-4 text-slate-500 text-sm">
                {col.links.map(link => (
                  <li key={link}><a className="hover:text-[#0623bb] transition-colors" href="#">{link}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="max-w-[1280px] mx-auto px-6 mt-20 pt-8 border-t border-slate-100 flex justify-between items-center text-slate-400 text-xs">
          <p>© 2024 SkillProof Infrastructure. All rights reserved.</p>
          <div className="flex gap-6">
            <span>Verified by SkillProof™</span>
          </div>
        </div>
      </footer>
    </>
  );
}
