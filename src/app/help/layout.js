'use client';
import CandidateSidebar from '@/components/CandidateSidebar';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function HelpLayout({ children }) {
  return (
    <ProtectedRoute role="candidate">
      <div className="flex min-h-screen">
        <CandidateSidebar />
        <main className="flex-1 max-w-[1280px] mx-auto p-8 lg:p-12 overflow-y-auto">{children}</main>
      </div>
    </ProtectedRoute>
  );
}
