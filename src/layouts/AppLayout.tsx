// ============================================================
// PlacementOS — App Layout (Sidebar + Main)
// ============================================================

import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import AICoachDrawer from '../components/AICoachDrawer';
import {
  LayoutDashboard,
  User,
  FileText,
  Briefcase,
  GitCompareArrows,
  ClipboardCheck,
  BookOpen,
  TrendingUp,
  Settings,
  LogOut,
  Menu,
  X,
  Brain,
  ChevronLeft,
  Sparkles,
  Crosshair,
  Sliders,
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/simulation', icon: Sparkles, label: 'AI Simulator', badge: 'New' },
  { to: '/weaknesses', icon: Crosshair, label: 'Weakness Hunter', badge: 'AI' },
  { to: '/what-if', icon: Sliders, label: 'What-If Engine' },
  { to: '/profile', icon: User, label: 'Profile' },
  { to: '/resume', icon: FileText, label: 'Resume' },
  { to: '/jobs', icon: Briefcase, label: 'Jobs' },
  { to: '/skill-gap', icon: GitCompareArrows, label: 'Skill Gap' },
  { to: '/assessment', icon: ClipboardCheck, label: 'Assessment' },
  { to: '/plan', icon: BookOpen, label: 'Prep Plan' },
  { to: '/progress', icon: TrendingUp, label: 'Progress' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function AppLayout() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50 flex flex-col
          bg-bg-secondary border-r border-border
          transition-all duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${collapsed ? 'w-[72px]' : 'w-64'}
        `}
      >
        {/* Logo */}
        <div className={`flex items-center gap-3 p-4 border-b border-border h-16 ${collapsed ? 'justify-center' : ''}`}>
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-accent text-white flex-shrink-0">
            <Brain size={20} />
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-text-primary tracking-tight">PlacementOS</span>
              <span className="text-[10px] text-text-muted tracking-wider uppercase">AI Command Center</span>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(false)}
            className="btn-icon btn-ghost ml-auto lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 mb-0.5
                ${collapsed ? 'justify-center' : ''}
                ${isActive
                  ? 'bg-accent-muted text-accent-light'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-card'
                }`
              }
              title={collapsed ? label : undefined}
            >
              <Icon size={18} className="flex-shrink-0" />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Collapse toggle (desktop only) */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex items-center justify-center p-3 border-t border-border text-text-muted hover:text-text-primary transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeft
            size={16}
            className={`transition-transform ${collapsed ? 'rotate-180' : ''}`}
          />
        </button>

        {/* User section */}
        <div className={`border-t border-border p-3 ${collapsed ? 'flex justify-center' : ''}`}>
          {collapsed ? (
            <button
              onClick={handleSignOut}
              className="btn-icon btn-ghost text-text-muted hover:text-error"
              title="Sign out"
            >
              <LogOut size={18} />
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-accent-muted flex items-center justify-center text-accent-light text-sm font-semibold flex-shrink-0">
                {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {profile?.full_name || 'Student'}
                </p>
                <p className="text-xs text-text-muted truncate">
                  {profile?.target_role || 'Set target role'}
                </p>
              </div>
              <button
                onClick={handleSignOut}
                className="btn-icon btn-ghost text-text-muted hover:text-error flex-shrink-0"
                title="Sign out"
              >
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center h-16 px-4 lg:px-6 border-b border-border bg-bg-secondary flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="btn-icon btn-ghost lg:hidden mr-3"
          >
            <Menu size={20} />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="hidden sm:inline">AI Connected</span>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6">
            <Outlet />
          </div>
        </div>
      </main>

      {/* Global AI Coach Floating Assistant */}
      <AICoachDrawer />
    </div>
  );
}
