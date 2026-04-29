'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';

const companyNav = [
  { label: 'Dashboard', path: '/company/dashboard', icon: 'dashboard' },
  { label: 'Post a Task', path: '/company/tasks/new', icon: 'add_task' },
  { label: 'Talent Pool', path: '/company/talent', icon: 'groups' },
  { label: 'Offers Sent', path: '/company/offers', icon: 'send' },
  { label: 'Billing', path: '/company/billing', icon: 'payments' },
  { label: 'Notifications', path: '/company/notifications', icon: 'notifications' },
  { label: 'Disputes', path: '/company/disputes', icon: 'gavel' },
  { label: 'Team', path: '/company/settings/team', icon: 'group' },
  { label: 'Settings', path: '/company/settings', icon: 'settings' },
];

export default function CompanySidebar() {
  const pathname = usePathname();
  const { userProfile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <aside className="h-screen w-64 border-r flex flex-col p-4 gap-2 sticky top-0 shrink-0 transition-colors duration-300"
      style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--sidebar-bg)' }}
    >
      <div className="flex items-center gap-3 px-4 py-6 mb-2">
        <div className="w-8 h-8 bg-[#0623bb] rounded-lg flex items-center justify-center text-white">
          <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
        </div>
        <div>
          <h1 className="text-lg font-black" style={{ color: 'var(--primary)' }}>SkillProof</h1>
          <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: 'var(--outline)' }}>Hiring Portal</p>
        </div>
      </div>

      <nav className="flex flex-col gap-1 flex-1">
        {companyNav.map((item) => {
          const isActive = pathname === item.path || (item.path !== '/company/dashboard' && item.path !== '/company/settings' && pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              href={item.path}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200"
              style={isActive ? {
                backgroundColor: 'var(--card-bg)',
                color: 'var(--primary)',
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: 'var(--card-border)',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              } : {
                color: 'var(--on-surface-variant)',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'var(--surface-container-low)';
                  e.currentTarget.style.color = 'var(--on-surface)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--on-surface-variant)';
                }
              }}
            >
              <span
                className="material-symbols-outlined text-[20px]"
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3">
        <div className="p-4 rounded-xl transition-colors duration-300"
          style={{ backgroundColor: 'var(--surface-container-low)', border: '1px solid var(--card-border)' }}
        >
          <div className="flex items-center gap-3 mb-3 min-w-0">
            <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
              style={{ backgroundColor: 'var(--surface-container)', color: 'var(--primary)' }}
            >
              {userProfile?.companyName?.charAt(0) || userProfile?.displayName?.charAt(0) || 'C'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold truncate" style={{ color: 'var(--on-surface)' }}>
                {userProfile?.companyName || userProfile?.displayName || 'Company'}
              </p>
              <p className="text-[11px] truncate" style={{ color: 'var(--outline)' }}>
                {userProfile?.email || ''}
              </p>
            </div>
          </div>
          <Link
            href="/company/tasks/new"
            className="w-full block text-center py-2 bg-[#0623bb] text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-all"
          >
            Post a New Task
          </Link>

          {/* Glass Theme Switcher */}
          <div
            className="mt-3 flex items-center p-1 rounded-xl backdrop-blur-md"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04))',
              border: '1px solid rgba(255,255,255,0.18)',
              boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.1), 0 1px 3px rgba(0,0,0,0.08)',
            }}
          >
            {[
              { id: 'light', icon: 'light_mode', title: 'Light' },
              { id: 'system', icon: 'contrast', title: 'System' },
              { id: 'dark', icon: 'dark_mode', title: 'Dark' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => toggleTheme(t.id)}
                title={t.title}
                className="flex-1 flex items-center justify-center py-1.5 rounded-lg transition-all duration-300"
                style={theme === t.id ? {
                  backgroundColor: 'var(--card-bg)',
                  color: 'var(--primary)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                  transform: 'scale(1.05)',
                } : {
                  color: 'var(--outline)',
                }}
              >
                <span className="material-symbols-outlined text-[18px]"
                  style={theme === t.id ? { fontVariationSettings: "'FILL' 1" } : {}}
                >
                  {t.icon}
                </span>
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
          style={{ color: 'var(--error)' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--error-container)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <span className="material-symbols-outlined text-sm">logout</span>
          Sign out
        </button>
      </div>
    </aside>
  );
}
