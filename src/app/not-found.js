import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#faf8ff] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="material-symbols-outlined text-[#0623bb] text-5xl">search_off</span>
        </div>
        <h1 className="text-6xl font-black text-[#0623bb] mb-4">404</h1>
        <h2 className="text-2xl font-bold text-[#131b2e] mb-2">Page Not Found</h2>
        <p className="text-[#454655] mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/" className="px-6 py-3 bg-[#0623bb] text-white rounded-xl font-semibold hover:opacity-90 transition-all">
            Go Home
          </Link>
          <Link href="/tasks" className="px-6 py-3 border border-[#0623bb] text-[#0623bb] rounded-xl font-semibold hover:bg-[#0623bb]/5 transition-all">
            Browse Tasks
          </Link>
        </div>
      </div>
    </div>
  );
}
