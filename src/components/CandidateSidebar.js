'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';

const candidateNav = [
  { label: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
  { label: 'Find Tasks', path: '/tasks', icon: 'assignment' },
  { label: 'My Profile', path: '/profile', icon: 'person' },
  { label: 'Wallet', path: '/wallet', icon: 'account_balance_wallet' },
  { label: 'Job Offers', path: '/offers', icon: 'work' },
  { label: 'Leaderboard', path: '/leaderboard', icon: 'leaderboard' },
  { label: 'Notifications', path: '/notifications', icon: 'notifications' },
  { label: 'Disputes', path: '/disputes', icon: 'gavel' },
  { label: 'Settings', path: '/settings', icon: 'settings' },
  { label: 'Resources', path: '/help', icon: 'menu_book' },
];

export default function CandidateSidebar({ collapsed = false, onToggle }) {
  const pathname = usePathname();
  const { userProfile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <aside
      className="h-screen border-r flex flex-col sticky top-0 shrink-0 transition-all duration-300 overflow-hidden"
      style={{
        width: collapsed ? '64px' : '256px',
        borderColor: 'var(--card-border)',
        backgroundColor: 'var(--sidebar-bg)',
      }}
    >
      {/* Logo */}
      <div className={`flex items-center gap-3 py-6 mb-2 ${collapsed ? 'px-3 justify-center' : 'px-4'}`}>
        <div className="w-8 h-8 bg-[#0623bb] rounded flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-white text-lg">terminal</span>
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <h1 className="text-lg font-black whitespace-nowrap" style={{ color: 'var(--primary)' }}>SkillProof</h1>
            <p className="text-[10px] uppercase tracking-widest font-bold whitespace-nowrap" style={{ color: 'var(--outline)' }}>Verified Marketplace</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className={`flex-1 space-y-1 ${collapsed ? 'px-2' : 'px-4'}`}>
        {candidateNav.map((item) => {
          const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              href={item.path}
              title={collapsed ? item.label : ''}
              className={`flex items-center gap-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${collapsed ? 'px-0 justify-center' : 'px-4'}`}
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
                className="material-symbols-outlined text-[20px] shrink-0"
                style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                {item.icon}
              </span>
              {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className={`mt-auto space-y-3 ${collapsed ? 'px-2 pb-3' : 'px-4 pb-4'}`}>
        {/* User Card */}
        <div className="rounded-xl transition-colors duration-300"
          style={{ backgroundColor: 'var(--surface-container-low)', border: '1px solid var(--card-border)' }}
        >
          {collapsed ? (
            /* Collapsed: just avatar */
            <div className="p-2 flex justify-center">
              <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
                style={{ backgroundColor: 'var(--surface-container)', color: 'var(--primary)' }}
                title={userProfile?.displayName || 'User'}
              >
                {userProfile?.displayName?.charAt(0) || 'U'}
              </div>
            </div>
          ) : (
            /* Expanded: full user card */
            <div className="p-4">
              <div className="flex items-center gap-3 mb-3 min-w-0">
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
                  style={{ backgroundColor: 'var(--surface-container)', color: 'var(--primary)' }}
                >
                  {userProfile?.displayName?.charAt(0) || 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold truncate" style={{ color: 'var(--on-surface)' }}>
                    {userProfile?.displayName || 'User'}
                  </p>
                  <p className="text-[11px] truncate" style={{ color: 'var(--outline)' }}>
                    {userProfile?.email || ''}
                  </p>
                </div>
              </div>
              <Link
                href="/tasks"
                className="w-full block text-center py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
              >
                Find Work
              </Link>

              {/* Theme Switcher */}
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
          )}
        </div>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          title={collapsed ? 'Sign out' : ''}
          className={`w-full flex items-center gap-2 rounded-lg text-sm font-medium transition-colors ${collapsed ? 'px-0 py-2.5 justify-center' : 'px-4 py-2.5'}`}
          style={{ color: 'var(--error)' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--error-container)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <span className="material-symbols-outlined text-sm">logout</span>
          {!collapsed && 'Sign out'}
        </button>
      </div>
    </aside>
  );
}
