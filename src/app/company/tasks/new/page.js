'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';

const STEPS = ['Task Type', 'Details & Deliverables', 'Rubric Builder', 'Prize & Deadline', 'Escrow Deposit', 'Review & Publish'];
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function PostTaskPage() {
  const router = useRouter();
  const { user, userProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [publishing, setPublishing] = useState(false);
  const [devMode, setDevMode] = useState(true);
  const [form, setForm] = useState({
    taskType: 'coding',
    title: '',
    description: '',
    domain: 'Software Engineering',
    difficulty: 'intermediate',
    skills: [],
    deliverables: '',
    rubrics: [
      { name: 'Code Quality', weight: 30 },
      { name: 'Performance', weight: 25 },
      { name: 'Documentation', weight: 20 },
      { name: 'Test Coverage', weight: 25 },
    ],
    prizePool: '',
    deadline: '',
    maxCandidates: 50,
    payoutDistribution: 'winner_takes_all',
  });
  const [skillInput, setSkillInput] = useState('');

  const totalWeight = form.rubrics.reduce((sum, r) => sum + r.weight, 0);
  const prizeNum = parseInt(form.prizePool.replace(/,/g, '')) || 0;
  const platformFee = Math.round(prizeNum * 0.05);
  const totalDeposit = prizeNum + platformFee;

  const updateForm = (field, value) => setForm({ ...form, [field]: value });
  const addRubric = () => setForm({ ...form, rubrics: [...form.rubrics, { name: '', weight: 0 }] });
  const removeRubric = (i) => setForm({ ...form, rubrics: form.rubrics.filter((_, idx) => idx !== i) });
  const updateRubric = (i, field, value) => {
    const updated = [...form.rubrics];
    updated[i][field] = field === 'weight' ? parseInt(value) || 0 : value;
    setForm({ ...form, rubrics: updated });
  };
  const addSkill = () => {
    if (skillInput.trim() && !form.skills.includes(skillInput.trim())) {
      setForm({ ...form, skills: [...form.skills, skillInput.trim()] });
      setSkillInput('');
    }
  };
  const removeSkill = (s) => setForm({ ...form, skills: form.skills.filter(x => x !== s) });

  const handlePublish = async () => {
    if (publishing) return;

    // Validate deadline
    if (!form.deadline || isNaN(new Date(form.deadline).getTime())) {
      alert('Please set a valid submission deadline.');
      return;
    }

    // Validate required fields
    if (!form.title.trim()) { alert('Please enter a task title.'); return; }
    if (!form.description.trim()) { alert('Please enter a task description.'); return; }
    if (prizeNum <= 0) { alert('Please enter a valid prize pool amount.'); return; }
    if (totalWeight !== 100) { alert('Rubric weights must total 100%.'); return; }

    setPublishing(true);
    try {
      if (devMode) {
        // DEV MODE: Write directly to Firestore via client SDK
        const rubricObj = form.rubrics.reduce((acc, r) => ({ ...acc, [r.name]: r.weight }), {});
        const platformFeeVal = Math.ceil(prizeNum * 0.05);
        const totalDepositVal = prizeNum + platformFeeVal;
        const taskRef = doc(collection(db, 'tasks'));
        await setDoc(taskRef, {
          taskId: taskRef.id,
          companyUid: user.uid,
          companyName: userProfile?.companyName || userProfile?.displayName || '',
          companyLogoURL: userProfile?.companyLogoURL || null,
          isCompanyVerified: false,
          title: form.title.substring(0, 100),
          description: form.description,
          deliverables: form.deliverables || '',
          taskType: form.taskType,
          domain: form.domain || form.taskType,
          skillTags: form.skills || [],
          difficulty: form.difficulty,
          rubric: rubricObj,
          prizePool: prizeNum * 100, // paise
          platformFee: platformFeeVal * 100,
          totalDeposited: totalDepositVal * 100,
          currency: 'INR',
          status: 'live',
          escrowTransactionId: 'DEV_MODE_BYPASS',
          escrowConfirmedAt: serverTimestamp(),
          deadline: new Date(form.deadline),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          totalSubmissions: 0,
          qualifyingSubmissions: 0,
          maxCandidates: form.maxCandidates || null,
          payoutDistribution: form.payoutDistribution || 'winner_takes_all',
          isFeatured: false,
        });
        router.push('/company/dashboard');
      } else {
        // PRODUCTION: Use backend API
        const token = await user.getIdToken();
        const res = await fetch(`${API_URL}/api/tasks/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-User-Role': userProfile?.role || 'company' },
          body: JSON.stringify({
            title: form.title,
            description: form.description,
            taskType: form.taskType,
            domain: form.domain,
            difficulty: form.difficulty,
            requiredSkills: form.skills,
            deliverables: form.deliverables,
            rubric: form.rubrics.reduce((acc, r) => ({ ...acc, [r.name]: r.weight }), {}),
            prizePool: prizeNum * 100,
            deadline: form.deadline,
            maxCandidates: form.maxCandidates,
            payoutDistribution: form.payoutDistribution,
          }),
        });
        if (res.ok) {
          router.push('/company/dashboard');
        } else {
          const err = await res.json();
          alert(err.error || 'Failed to create task');
        }
      }
    } catch (err) {
      console.error('Task publish error:', err);
      alert('Failed to publish task: ' + (err.message || 'Unknown error'));
    } finally {
      setPublishing(false);
    }
  };

  return (
    <>
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-[#131b2e] mb-2">Post a New Task</h1>
        <p className="text-[#454655]">Create a hiring task with an escrow-backed bounty.</p>
      </header>

      {/* Step Progress */}
      <div className="flex gap-1 mb-8 overflow-x-auto pb-2">
        {STEPS.map((s, i) => (
          <button
            key={s}
            onClick={() => i + 1 <= step && setStep(i + 1)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              step === i + 1 ? 'bg-[#0623bb] text-white' : step > i + 1 ? 'bg-emerald-100 text-emerald-700' : 'bg-[#eaedff] text-[#454655]'
            }`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
              step === i + 1 ? 'bg-white text-[#0623bb]' : step > i + 1 ? 'bg-emerald-600 text-white' : 'bg-[#c5c5d7] text-white'
            }`}>
              {step > i + 1 ? '✓' : i + 1}
            </span>
            {s}
          </button>
        ))}
      </div>

      <div className="bg-white border border-[#c5c5d7] rounded-xl p-8 shadow-[0px_4px_20px_rgba(0,0,0,0.04)]">
        {/* Step 1: Task Type */}
        {step === 1 && (
          <div className="space-y-6 max-w-2xl">
            <h2 className="text-xl font-semibold text-[#131b2e]">What type of task do you want to post?</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { id: 'coding', icon: 'code', label: 'Coding Challenge', desc: 'Algorithm, system design, or implementation task' },
                { id: 'design', icon: 'palette', label: 'Design Task', desc: 'UI/UX design, visual assets, or prototypes' },
                { id: 'data', icon: 'analytics', label: 'Data / ML Task', desc: 'Data analysis, model building, or pipeline work' },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => updateForm('taskType', t.id)}
                  className={`flex flex-col p-6 rounded-xl border-2 transition-all text-left ${
                    form.taskType === t.id ? 'border-[#0623bb] bg-[#f2f3ff]' : 'border-[#eaedff] hover:border-[#0623bb]/30'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 ${
                    form.taskType === t.id ? 'bg-[#0623bb] text-white' : 'bg-[#eaedff] text-[#454655]'
                  }`}>
                    <span className="material-symbols-outlined">{t.icon}</span>
                  </div>
                  <span className="font-bold text-[#131b2e] mb-1">{t.label}</span>
                  <span className="text-xs text-[#454655]">{t.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Details */}
        {step === 2 && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <label className="text-sm font-semibold text-[#131b2e] block mb-2">Task Title *</label>
              <input className="w-full px-4 py-3 bg-[#eaedff] border border-[#c5c5d7] rounded-lg outline-none focus:ring-2 focus:ring-[#0623bb]" placeholder="e.g. React Component Library Migration" value={form.title} onChange={(e) => updateForm('title', e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-semibold text-[#131b2e] block mb-2">Description *</label>
              <textarea className="w-full px-4 py-3 bg-[#eaedff] border border-[#c5c5d7] rounded-lg outline-none focus:ring-2 focus:ring-[#0623bb] h-32" placeholder="Describe the task requirements, expected deliverables..." value={form.description} onChange={(e) => updateForm('description', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-[#131b2e] block mb-2">Domain</label>
                <select className="w-full px-4 py-3 bg-[#eaedff] border border-[#c5c5d7] rounded-lg outline-none focus:ring-2 focus:ring-[#0623bb]" value={form.domain} onChange={(e) => updateForm('domain', e.target.value)}>
                  <option>Software Engineering</option><option>Design</option><option>Data Science</option><option>Security</option><option>Marketing</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-[#131b2e] block mb-2">Difficulty</label>
                <select className="w-full px-4 py-3 bg-[#eaedff] border border-[#c5c5d7] rounded-lg outline-none focus:ring-2 focus:ring-[#0623bb]" value={form.difficulty} onChange={(e) => updateForm('difficulty', e.target.value)}>
                  <option value="entry">Entry Level</option><option value="intermediate">Intermediate</option><option value="expert">Expert</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-[#131b2e] block mb-2">Required Skills</label>
              <div className="flex flex-wrap gap-2 p-3 bg-[#eaedff] border border-[#c5c5d7] rounded-lg min-h-[48px]">
                {form.skills.map(tag => (
                  <span key={tag} className="bg-[#dfe0ff] text-[#0623bb] px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                    {tag} <button onClick={() => removeSkill(tag)} className="hover:text-red-500">×</button>
                  </span>
                ))}
                <input className="flex-1 bg-transparent outline-none min-w-[100px] text-sm" placeholder="Add skill..." value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())} />
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-[#131b2e] block mb-2">Expected Deliverables</label>
              <textarea className="w-full px-4 py-3 bg-[#eaedff] border border-[#c5c5d7] rounded-lg outline-none focus:ring-2 focus:ring-[#0623bb] h-24" placeholder="List what candidates should submit..." value={form.deliverables} onChange={(e) => updateForm('deliverables', e.target.value)} />
            </div>
          </div>
        )}

        {/* Step 3: Rubric Builder */}
        {step === 3 && (
          <div className="space-y-6 max-w-2xl">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-[#131b2e]">Evaluation Rubric</h2>
                <p className="text-sm text-[#454655] mt-1">Define criteria and weights (must sum to 100).</p>
              </div>
              <div className={`px-3 py-1.5 rounded-lg text-sm font-bold ${totalWeight === 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                {totalWeight}/100
              </div>
            </div>
            <div className="space-y-3">
              {form.rubrics.map((r, i) => (
                <div key={i} className="flex items-center gap-3 p-4 border border-[#c5c5d7] rounded-lg bg-[#f2f3ff]">
                  <span className="material-symbols-outlined text-[#757686] cursor-grab">drag_indicator</span>
                  <input className="flex-1 px-3 py-2 bg-white border border-[#c5c5d7] rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#0623bb]" value={r.name} onChange={(e) => updateRubric(i, 'name', e.target.value)} placeholder="Criterion name" />
                  <div className="flex items-center gap-2">
                    <input className="w-16 px-2 py-2 bg-white border border-[#c5c5d7] rounded-lg text-sm text-center outline-none focus:ring-2 focus:ring-[#0623bb]" type="number" value={r.weight} onChange={(e) => updateRubric(i, 'weight', e.target.value)} />
                    <span className="text-sm text-[#757686]">%</span>
                  </div>
                  <button onClick={() => removeRubric(i)} className="text-red-400 hover:text-red-600 transition-colors">
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>
              ))}
            </div>
            <button onClick={addRubric} className="flex items-center gap-2 text-[#0623bb] text-sm font-semibold hover:underline">
              <span className="material-symbols-outlined text-sm">add</span> Add Criterion
            </button>
            {totalWeight !== 100 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                ⚠ Weights must sum to 100%. Currently at {totalWeight}%.
              </div>
            )}
          </div>
        )}

        {/* Step 4: Prize Pool & Deadline */}
        {step === 4 && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <label className="text-sm font-semibold text-[#131b2e] block mb-2">Prize Pool (INR) *</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#454655] font-semibold">₹</span>
                <input className="w-full pl-8 pr-4 py-3 bg-[#eaedff] border border-[#c5c5d7] rounded-lg outline-none focus:ring-2 focus:ring-[#0623bb]" placeholder="2,500" type="text" value={form.prizePool} onChange={(e) => updateForm('prizePool', e.target.value)} />
              </div>
              {prizeNum > 0 && <p className="text-xs text-[#757686] mt-1">5% platform fee will be added. Total: ₹{totalDeposit.toLocaleString('en-IN')}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-[#131b2e] block mb-2">Submission Deadline</label>
                <input className="w-full px-4 py-3 bg-[#eaedff] border border-[#c5c5d7] rounded-lg outline-none focus:ring-2 focus:ring-[#0623bb]" type="datetime-local" value={form.deadline} onChange={(e) => updateForm('deadline', e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-semibold text-[#131b2e] block mb-2">Max Submissions</label>
                <input className="w-full px-4 py-3 bg-[#eaedff] border border-[#c5c5d7] rounded-lg outline-none focus:ring-2 focus:ring-[#0623bb]" placeholder="50" type="number" value={form.maxCandidates} onChange={(e) => updateForm('maxCandidates', parseInt(e.target.value) || 50)} />
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-[#131b2e] block mb-2">Payout Distribution</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { key: 'winner_takes_all', label: 'Winner Takes All', desc: '100% to #1' },
                  { key: 'top_3_split', label: 'Top 3 Split', desc: '50/30/20%' },
                  { key: 'custom', label: 'Custom Split', desc: 'Define your own' },
                ].map(d => (
                  <label key={d.key} className={`flex flex-col p-4 rounded-lg border-2 cursor-pointer text-center transition-all ${form.payoutDistribution === d.key ? 'border-[#0623bb] bg-[#f2f3ff]' : 'border-[#eaedff] hover:border-[#0623bb]'}`}>
                    <input type="radio" name="payout" className="sr-only" checked={form.payoutDistribution === d.key} onChange={() => updateForm('payoutDistribution', d.key)} />
                    <span className="font-semibold text-sm">{d.label}</span>
                    <span className="text-xs text-[#757686] mt-1">{d.desc}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 5: Escrow Deposit */}
        {step === 5 && (
          <div className="space-y-6 max-w-xl mx-auto text-center">
            <div className="w-20 h-20 bg-[#eaedff] rounded-full flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-[#0623bb] text-4xl">{devMode ? 'developer_mode' : 'lock'}</span>
            </div>
            <h2 className="text-2xl font-bold text-[#131b2e]">Secure Escrow Deposit</h2>
            <p className="text-[#454655]">Your prize pool will be locked in a secure escrow account. Funds are only released upon your review and approval.</p>

            {/* Dev Mode Toggle */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
              <div className="text-left">
                <p className="font-semibold text-amber-800 text-sm flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">developer_mode</span> Dev Mode
                </p>
                <p className="text-xs text-amber-700 mt-0.5">Skip real payment — task goes live instantly</p>
              </div>
              <button
                onClick={() => setDevMode(!devMode)}
                className={`relative w-12 h-6 rounded-full transition-colors ${devMode ? 'bg-emerald-500' : 'bg-[#c5c5d7]'}`}
              >
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${devMode ? 'left-[26px]' : 'left-0.5'}`} />
              </button>
            </div>

            <div className="bg-[#f2f3ff] rounded-xl p-6 border border-[#c5c5d7] text-left space-y-3">
              <div className="flex justify-between"><span className="text-[#454655]">Prize Pool</span><span className="font-bold">₹{prizeNum.toLocaleString('en-IN')}</span></div>
              <div className="flex justify-between"><span className="text-[#454655]">Platform Fee (5%)</span><span className="font-bold">₹{platformFee.toLocaleString('en-IN')}</span></div>
              <div className="border-t border-[#c5c5d7] pt-3 flex justify-between"><span className="font-semibold text-[#131b2e]">Total to Deposit</span><span className="font-bold text-xl text-[#0623bb]">₹{totalDeposit.toLocaleString('en-IN')}</span></div>
            </div>

            {!devMode && (
              <div className="grid grid-cols-2 gap-4">
                <button className="flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-[#eaedff] hover:border-[#0623bb] transition-all">
                  <span className="material-symbols-outlined text-blue-600">account_balance</span>
                  <span className="font-semibold text-sm">Razorpay</span>
                </button>
                <button className="flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-[#eaedff] hover:border-[#0623bb] transition-all">
                  <span className="material-symbols-outlined text-purple-600">credit_card</span>
                  <span className="font-semibold text-sm">Stripe</span>
                </button>
              </div>
            )}

            {devMode && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <p className="text-sm text-emerald-700 font-medium">✓ Payment will be skipped. Task will be created as <strong>live</strong> immediately.</p>
              </div>
            )}
          </div>
        )}

        {/* Step 6: Review & Publish */}
        {step === 6 && (
          <div className="space-y-6">
            <div className="bg-[#f2f3ff] border border-[#c5c5d7] rounded-xl p-6 space-y-4">
              <h3 className="text-xl font-semibold text-[#131b2e]">Task Summary</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-[#757686]">Type:</span> <span className="font-semibold capitalize">{form.taskType}</span></div>
                <div><span className="text-[#757686]">Title:</span> <span className="font-semibold">{form.title || '—'}</span></div>
                <div><span className="text-[#757686]">Domain:</span> <span className="font-semibold">{form.domain}</span></div>
                <div><span className="text-[#757686]">Difficulty:</span> <span className="font-semibold capitalize">{form.difficulty}</span></div>
                <div><span className="text-[#757686]">Prize Pool:</span> <span className="font-semibold text-emerald-600">₹{prizeNum.toLocaleString('en-IN')}</span></div>
                <div><span className="text-[#757686]">Platform Fee:</span> <span className="font-semibold">₹{platformFee.toLocaleString('en-IN')} (5%)</span></div>
              </div>
              <div className="border-t border-[#c5c5d7] pt-4">
                <h4 className="text-sm font-semibold text-[#131b2e] mb-2">Rubric</h4>
                <div className="space-y-2">
                  {form.rubrics.map(r => (
                    <div key={r.name} className="flex justify-between items-center p-2 bg-white rounded-lg border border-[#c5c5d7]">
                      <span className="text-sm">{r.name}</span>
                      <span className="text-sm font-bold text-[#0623bb]">{r.weight}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <span className="material-symbols-outlined text-amber-600">info</span>
              <div>
                <p className="font-semibold text-amber-800 text-sm">Escrow Notice</p>
                <p className="text-amber-700 text-sm">₹{totalDeposit.toLocaleString('en-IN')} will be locked in escrow upon posting. Task goes live only after payment is confirmed.</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center pt-8 mt-8 border-t border-[#c5c5d7]">
          <button onClick={() => step > 1 && setStep(step - 1)} className={`flex items-center gap-2 font-medium transition-colors ${step > 1 ? 'text-[#454655] hover:text-[#131b2e]' : 'opacity-0'}`}>
            <span className="material-symbols-outlined">arrow_back</span> Back
          </button>
          <div className="flex gap-3">
            {step < 6 && (
              <button onClick={() => router.push('/company/dashboard')} className="px-6 py-3 border border-[#c5c5d7] text-[#454655] rounded-lg text-sm font-semibold hover:bg-[#eaedff] transition-all">
                Save Draft
              </button>
            )}
            <button
              onClick={() => step < 6 ? setStep(step + 1) : handlePublish()}
              disabled={publishing}
              className="px-8 py-3 bg-[#0623bb] text-white font-semibold rounded-lg hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
            >
              {step === 6 ? (publishing ? 'Publishing...' : 'Post Task & Lock Escrow') : 'Continue'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
