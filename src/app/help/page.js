'use client';

export default function HelpPage() {
  return (
    <>
      <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-[#131b2e] mb-4">Help Center</h1>
          <p className="text-lg text-[#454655] max-w-lg mx-auto">Find answers to common questions about SkillProof&apos;s marketplace.</p>
          <div className="relative max-w-md mx-auto mt-8">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
            <input className="w-full pl-12 pr-4 py-3 bg-white border border-[#c5c5d7] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0623bb] shadow-sm" placeholder="Search for help..." />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {[
            { icon: 'school', title: 'Getting Started', desc: 'Learn how to set up your account and complete your first task.' },
            { icon: 'payments', title: 'Payments & Wallet', desc: 'Everything about earnings, withdrawals, and escrow.' },
            { icon: 'gavel', title: 'Disputes & Reviews', desc: 'How to file a dispute and understand the review process.' },
            { icon: 'code', title: 'Task Workspace', desc: 'Guide to the submission workspace and code editor.' },
            { icon: 'shield', title: 'Account Security', desc: 'Protect your account with 2FA and security best practices.' },
            { icon: 'group', title: 'For Companies', desc: 'Guide to posting tasks, managing escrow, and hiring.' },
          ].map(c => (
            <div key={c.title} className="bg-white border border-[#c5c5d7] rounded-xl p-6 hover:border-[#0623bb] hover:shadow-md transition-all cursor-pointer group">
              <div className="w-12 h-12 bg-[#eaedff] text-[#0623bb] rounded-xl flex items-center justify-center mb-4 group-hover:bg-[#0623bb] group-hover:text-white transition-all">
                <span className="material-symbols-outlined">{c.icon}</span>
              </div>
              <h3 className="font-semibold text-lg text-[#131b2e] mb-2">{c.title}</h3>
              <p className="text-sm text-[#454655]">{c.desc}</p>
            </div>
          ))}
        </div>

        <section className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-[#131b2e] mb-8 text-center">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {[
              { q: 'How does the escrow system work?', a: 'When a company posts a task, the prize pool is locked in escrow. Funds are only released to candidates once the task is completed and reviewed. If a dispute arises, our resolution team handles the case within 72 hours.' },
              { q: 'What is the Performance Evidence Index (PEI)?', a: 'PEI is our proprietary scoring algorithm that aggregates your performance across all completed tasks. It factors in code quality, submission speed, review scores, and consistency to produce a single metric that companies use to evaluate talent.' },
              { q: 'Can I withdraw my earnings immediately?', a: 'Yes, once a payout is confirmed, you can withdraw to your linked bank account. Processing typically takes 1-3 business days depending on your bank.' },
              { q: 'How do I dispute a task evaluation?', a: 'Navigate to the Disputes page from your sidebar, click "File New Dispute", and provide details about why you believe the evaluation was unfair. Our team will review the case and respond within 72 hours.' },
            ].map((faq, i) => (
              <details key={i} className="bg-white border border-[#c5c5d7] rounded-xl group">
                <summary className="p-6 font-semibold cursor-pointer flex justify-between items-center hover:text-[#0623bb]">
                  {faq.q}
                  <span className="material-symbols-outlined text-[#757686] group-open:rotate-180 transition-transform">expand_more</span>
                </summary>
                <p className="px-6 pb-6 text-sm text-[#454655] leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </section>
    </>
  );
}
