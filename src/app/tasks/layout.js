'use client';
import { usePathname } from 'next/navigation';
import CandidateSidebar from '@/components/CandidateSidebar';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function TasksLayout({ children }) {
  const pathname = usePathname();

  // Auto-collapse sidebar on the submit/editor page
  const isEditorPage = pathname.includes('/submit');

  return (
    <ProtectedRoute role="candidate">
      <div className="flex min-h-screen">
        <CandidateSidebar collapsed={isEditorPage} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </ProtectedRoute>
  );
}
