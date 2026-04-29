'use client';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

const LANG_MAP = {
  js: 'JavaScript', jsx: 'JavaScript', ts: 'TypeScript', tsx: 'TypeScript',
  py: 'Python', java: 'Java', cpp: 'C++', c: 'C', go: 'Go', rs: 'Rust',
  rb: 'Ruby', php: 'PHP', cs: 'C#', swift: 'Swift', kt: 'Kotlin',
  html: 'HTML', css: 'CSS', json: 'JSON', md: 'Markdown', sql: 'SQL',
  sh: 'Shell', yaml: 'YAML', yml: 'YAML', xml: 'XML', txt: 'Text',
};

function getLang(filename) {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return LANG_MAP[ext] || 'Text';
}

function getFileIcon(filename) {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (['js', 'jsx', 'ts', 'tsx'].includes(ext)) return { icon: 'javascript', color: 'text-yellow-400' };
  if (['py'].includes(ext)) return { icon: 'text_snippet', color: 'text-emerald-400' };
  if (['json', 'yaml', 'yml', 'xml'].includes(ext)) return { icon: 'data_object', color: 'text-blue-400' };
  if (['html'].includes(ext)) return { icon: 'html', color: 'text-orange-400' };
  if (['css'].includes(ext)) return { icon: 'css', color: 'text-blue-300' };
  if (['md', 'txt'].includes(ext)) return { icon: 'description', color: 'text-slate-400' };
  return { icon: 'code', color: 'text-purple-400' };
}

export default function SubmissionWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [task, setTask] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeView, setActiveView] = useState('code'); // 'code', 'writeup'
  const [writeup, setWriteup] = useState('');
  const [briefCollapsed, setBriefCollapsed] = useState(false);
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  // File management
  const [files, setFiles] = useState([
    { name: 'main.js', content: '', language: 'JavaScript' },
  ]);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [showNewFileModal, setShowNewFileModal] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [renameIndex, setRenameIndex] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const textareaRef = useRef(null);

  // Timer
  const [elapsed, setElapsed] = useState(0);
  const startTime = useRef(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - startTime.current) / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (s) => {
    const h = Math.floor(s / 3600).toString().padStart(2, '0');
    const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${h}:${m}:${sec}`;
  };

  // Load task
  useEffect(() => {
    if (!params.id || !user?.uid) return;
    async function loadTask() {
      try {
        const taskDoc = await getDoc(doc(db, 'tasks', params.id));
        if (taskDoc.exists()) setTask({ id: taskDoc.id, ...taskDoc.data() });

        // Check for existing submission
        const subSnap = await getDocs(
          query(collection(db, 'submissions'), where('taskId', '==', params.id), where('candidateUid', '==', user.uid))
        );
        if (!subSnap.empty) {
          alert('You have already submitted for this task.');
          router.push(`/tasks/${params.id}`);
        }
      } catch (err) { console.error('Error loading task:', err); }
    }
    loadTask();
  }, [params.id, user?.uid, router]);

  // Auto-focus textarea
  useEffect(() => {
    if (activeView === 'code' && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [activeFileIndex, activeView]);

  // File operations
  const addFile = () => {
    if (!newFileName.trim()) return;
    const name = newFileName.trim();
    if (files.some(f => f.name === name)) {
      alert('A file with this name already exists.');
      return;
    }
    setFiles(prev => [...prev, { name, content: '', language: getLang(name) }]);
    setActiveFileIndex(files.length);
    setNewFileName('');
    setShowNewFileModal(false);
  };

  const deleteFile = (index) => {
    if (files.length <= 1) { alert('You must have at least one file.'); return; }
    if (!confirm(`Delete "${files[index].name}"?`)) return;
    setFiles(prev => prev.filter((_, i) => i !== index));
    if (activeFileIndex >= index && activeFileIndex > 0) {
      setActiveFileIndex(prev => prev - 1);
    }
  };

  const renameFile = (index) => {
    if (!renameValue.trim()) return;
    const name = renameValue.trim();
    if (files.some((f, i) => i !== index && f.name === name)) {
      alert('A file with this name already exists.');
      return;
    }
    setFiles(prev => prev.map((f, i) => i === index ? { ...f, name, language: getLang(name) } : f));
    setRenameIndex(null);
    setRenameValue('');
  };

  const updateFileContent = useCallback((content) => {
    setFiles(prev => prev.map((f, i) => i === activeFileIndex ? { ...f, content } : f));
  }, [activeFileIndex]);

  // Handle tab key in textarea
  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.target;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      updateFileContent(newValue);
      // Restore cursor position after React re-render
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      });
    }
  };

  // Submit
  const handleSubmit = async () => {
    if (submitting || !user) return;

    // Validate at least one file has content
    const hasContent = files.some(f => f.content.trim().length > 0) || writeup.trim().length > 0;
    if (!hasContent) {
      alert('Please write some code or a write-up before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      const token = await user.getIdToken();
      const codeFiles = files.map(f => ({
        name: f.name,
        fileName: f.name,
        language: f.language || getLang(f.name),
        content: f.content,
      }));

      const res = await fetch(`${API_URL}/api/submissions/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ taskId: params.id, writeup, codeFiles }),
      });
      if (res.ok) {
        router.push('/dashboard');
      } else {
        const err = await res.json();
        alert(err.error || 'Submission failed');
      }
    } catch (err) {
      console.error('Submit error:', err);
      alert('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const activeFile = files[activeFileIndex] || files[0];

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top Bar */}
      <div className="bg-white border-b border-slate-200 px-5 py-2.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-5">
          <button onClick={() => {
            if (files.some(f => f.content.trim()) || writeup.trim()) {
              if (window.confirm('You have unsaved work. Leave anyway?')) router.push(`/tasks/${params.id}`);
            } else router.push(`/tasks/${params.id}`);
          }} className="flex items-center gap-1.5 text-slate-500 hover:text-[#0623bb] transition-colors text-sm font-medium">
            <span className="material-symbols-outlined text-base">arrow_back</span> Back to Task
          </button>
          <div className="h-5 w-px bg-slate-200" />
          <div className="flex bg-slate-100 p-0.5 rounded-lg">
            <button
              onClick={() => setActiveView('code')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${activeView === 'code' ? 'bg-white text-[#0623bb] shadow-sm' : 'text-slate-500'}`}
            >
              <span className="material-symbols-outlined text-sm">code</span> Code Editor
            </button>
            <button
              onClick={() => setActiveView('writeup')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${activeView === 'writeup' ? 'bg-white text-[#0623bb] shadow-sm' : 'text-slate-500'}`}
            >
              <span className="material-symbols-outlined text-sm">edit_note</span> Write-up
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
            <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>cloud_done</span>
            <span className="text-xs font-medium">Auto-saved</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">Time</span>
            <span className="font-mono text-[#0623bb] font-bold text-sm">{formatTime(elapsed)}</span>
          </div>
          <div className="h-6 w-px bg-slate-200" />
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-1.5 px-5 py-1.5 bg-[#0623bb] text-white font-bold text-xs rounded-lg hover:bg-[#2e42d1] transition-all active:scale-95 shadow-lg shadow-[#0623bb]/20 disabled:opacity-50"
          >
            {submitting ? (
              <><span className="material-symbols-outlined text-sm animate-spin">progress_activity</span> Submitting...</>
            ) : (
              <><span className="material-symbols-outlined text-sm">upload</span> Submit Final Work</>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Task Brief — Collapsible */}
        <div className="relative flex shrink-0">
          <aside
            className="bg-white border-r border-slate-200 flex flex-col overflow-hidden transition-all duration-300"
            style={{ width: briefCollapsed ? '0px' : '260px' }}
          >
            <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 min-w-[260px]">
              <h2 className="text-sm font-bold text-slate-900">Task Brief</h2>
              {task?.difficulty && (
                <span className="px-1.5 py-0.5 bg-[#e2e7ff] text-[#0623bb] text-[9px] font-bold rounded uppercase tracking-wider">
                  {task.difficulty}
                </span>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-5 min-w-[260px]">
              <section>
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Overview</h3>
                <p className="text-xs text-[#131b2e] leading-relaxed">{task?.description || 'Loading task brief...'}</p>
              </section>
              {task?.deliverables && (
                <section>
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Deliverables</h3>
                  <p className="text-xs text-[#131b2e] leading-relaxed whitespace-pre-wrap">{task.deliverables}</p>
                </section>
              )}
              <section className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Assessment Rubric</h3>
                <div className="space-y-2">
                  {task?.rubric ? (
                    typeof task.rubric === 'object' && !Array.isArray(task.rubric) ? (
                      Object.entries(task.rubric).map(([name, weight]) => (
                        <div key={name} className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-emerald-500 text-base">check_circle</span>
                          <p className="text-xs font-semibold flex-1">{name}</p>
                          <span className="text-[10px] text-slate-400 font-medium">{weight}%</span>
                        </div>
                      ))
                    ) : Array.isArray(task.rubric) ? (
                      task.rubric.map((r, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-emerald-500 text-base">check_circle</span>
                          <p className="text-xs font-semibold flex-1">{r.criterionName || r.name}</p>
                          <span className="text-[10px] text-slate-400 font-medium">{r.weight}%</span>
                        </div>
                      ))
                    ) : null
                  ) : (
                    <p className="text-xs text-slate-400">Loading rubric...</p>
                  )}
                </div>
              </section>
            </div>
          </aside>

          {/* Collapse Toggle — centered arrow on the border */}
          <button
            onClick={() => setBriefCollapsed(prev => !prev)}
            className="absolute top-1/2 -translate-y-1/2 -right-3 z-20 w-6 h-10 bg-white border border-slate-200 rounded-r-lg flex items-center justify-center hover:bg-[#eaedff] hover:border-[#0623bb] transition-all shadow-sm group"
            title={briefCollapsed ? 'Show Task Brief' : 'Hide Task Brief'}
          >
            <span className={`material-symbols-outlined text-sm text-slate-400 group-hover:text-[#0623bb] transition-transform duration-300 ${briefCollapsed ? '' : 'rotate-180'}`}>
              chevron_right
            </span>
          </button>
        </div>

        {/* Right: Editor Area */}
        {activeView === 'code' ? (
          <section className="flex-1 flex flex-col bg-[#1e1e1e] overflow-hidden">
            <div className="flex-1 flex overflow-hidden">
              {/* File Explorer */}
              <div className="w-48 bg-[#252526] text-slate-400 text-xs border-r border-[#1e1e1e] shrink-0 flex flex-col">
                <div className="p-2.5 uppercase font-bold tracking-widest text-slate-500 flex items-center justify-between text-[10px]">
                  <span>Explorer</span>
                  <button
                    onClick={() => setShowNewFileModal(true)}
                    className="material-symbols-outlined text-sm cursor-pointer hover:text-white transition-colors"
                    title="Add new file"
                  >add_box</button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {files.map((file, i) => (
                    <div
                      key={i}
                      className={`group px-3 py-1.5 flex items-center gap-2 cursor-pointer transition-colors ${
                        i === activeFileIndex ? 'bg-[#37373d] text-white' : 'hover:bg-[#2a2d2e] hover:text-white'
                      }`}
                      onClick={() => setActiveFileIndex(i)}
                      onDoubleClick={() => {
                        setRenameIndex(i);
                        setRenameValue(file.name);
                      }}
                    >
                      <span className={`material-symbols-outlined text-sm ${getFileIcon(file.name).color}`}>
                        {getFileIcon(file.name).icon}
                      </span>
                      {renameIndex === i ? (
                        <input
                          autoFocus
                          className="bg-[#3c3c3c] text-white text-xs px-1 py-0.5 rounded border border-[#0623bb] outline-none flex-1 min-w-0"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') renameFile(i);
                            if (e.key === 'Escape') { setRenameIndex(null); setRenameValue(''); }
                          }}
                          onBlur={() => { setRenameIndex(null); setRenameValue(''); }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span className="flex-1 truncate">{file.name}</span>
                      )}
                      {files.length > 1 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteFile(i); }}
                          className="material-symbols-outlined text-sm opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all"
                        >close</button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="p-2 border-t border-[#333] text-[10px] text-slate-500">
                  {files.length} file{files.length !== 1 ? 's' : ''}
                </div>
              </div>

              {/* Code Editor */}
              <div className="flex-1 flex flex-col min-w-0">
                {/* Tabs */}
                <div className="flex bg-[#252526] border-b border-[#1e1e1e] overflow-x-auto">
                  {files.map((file, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveFileIndex(i)}
                      className={`px-4 py-2 text-xs flex items-center gap-2 border-r border-[#1e1e1e] whitespace-nowrap transition-colors ${
                        i === activeFileIndex
                          ? 'bg-[#1e1e1e] text-white border-t-2 border-t-[#0623bb]'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <span className={`material-symbols-outlined text-sm ${getFileIcon(file.name).color}`}>
                        {getFileIcon(file.name).icon}
                      </span>
                      {file.name}
                      {file.content.length > 0 && <span className="w-1.5 h-1.5 bg-white rounded-full opacity-60" />}
                    </button>
                  ))}
                </div>

                {/* Textarea Editor */}
                <div className="flex-1 relative overflow-hidden">
                  <textarea
                    ref={textareaRef}
                    className="absolute inset-0 w-full h-full bg-[#1e1e1e] text-[#d4d4d4] font-mono text-sm p-5 resize-none outline-none leading-7 border-none"
                    style={{ tabSize: 2, caretColor: '#fff' }}
                    value={activeFile?.content || ''}
                    onChange={(e) => updateFileContent(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={`// Start writing your ${activeFile?.language || 'code'} here...\n// Use Tab for indentation`}
                    spellCheck={false}
                  />
                </div>

                {/* Status Bar */}
                <div className="h-6 bg-[#0623bb] text-white text-[10px] flex items-center justify-between px-3 font-medium shrink-0">
                  <div className="flex items-center gap-4">
                    <span>{activeFile?.name}</span>
                    <span>{activeFile?.content?.split('\n').length || 0} lines</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span>UTF-8</span>
                    <span>{activeFile?.language || 'Text'}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : (
          /* Write-up View */
          <section className="flex-1 flex flex-col bg-[#faf8ff] overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-white">
              <h3 className="text-sm font-bold text-[#131b2e]">Submission Write-up</h3>
              <p className="text-xs text-slate-500 mt-0.5">Describe your approach, design decisions, and any notes for the reviewer.</p>
            </div>
            <div className="flex-1 p-6 overflow-y-auto">
              <textarea
                className="w-full h-full min-h-[400px] bg-white border border-slate-200 rounded-xl p-6 text-sm text-[#131b2e] leading-relaxed resize-none outline-none focus:ring-2 focus:ring-[#0623bb] focus:border-transparent"
                value={writeup}
                onChange={(e) => setWriteup(e.target.value)}
                placeholder="Explain your approach, trade-offs, and key design decisions..."
                spellCheck={true}
              />
            </div>
          </section>
        )}
      </div>

      {/* New File Modal */}
      {showNewFileModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowNewFileModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[#131b2e] mb-1">New File</h3>
            <p className="text-xs text-slate-500 mb-4">Enter a filename with extension (e.g. utils.py, styles.css)</p>
            <input
              autoFocus
              className="w-full px-4 py-3 bg-[#f2f3ff] border border-[#c5c5d7] rounded-lg outline-none focus:ring-2 focus:ring-[#0623bb] text-sm"
              placeholder="filename.ext"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addFile();
                if (e.key === 'Escape') { setShowNewFileModal(false); setNewFileName(''); }
              }}
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => { setShowNewFileModal(false); setNewFileName(''); }}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >Cancel</button>
              <button
                onClick={addFile}
                disabled={!newFileName.trim()}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-[#0623bb] rounded-lg hover:bg-[#2e42d1] transition-colors disabled:opacity-50"
              >Create File</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
