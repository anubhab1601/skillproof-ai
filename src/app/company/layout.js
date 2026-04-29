'use client';
import CompanySidebar from '@/components/CompanySidebar';
import ProtectedRoute from '@/components/ProtectedRoute';

export default function CompanyLayout({ children }) {
  return (
    <ProtectedRoute role="company">
      <div className="flex min-h-screen">
        <CompanySidebar />
        <main className="flex-1 max-w-[1280px] mx-auto p-8 lg:p-12 overflow-y-auto">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}
