/**
 * Main application layout with collapsible sidebar navigation
 */

import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Calendar,
  GraduationCap,
  Users,
  BookOpen,
  FileSpreadsheet,
  Menu,
  PanelLeftClose,
  LogOut,
} from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { useAuthStore } from '../../stores/authStore';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  name: string;
  path: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { name: 'Schema', path: '/', icon: Calendar },
  { name: 'Elever', path: '/students', icon: GraduationCap },
  { name: 'Personal', path: '/staff', icon: Users },
  { name: 'Klasser', path: '/classes', icon: BookOpen },
  { name: 'Import/Export', path: '/import', icon: FileSpreadsheet },
];

const roleLabels: Record<string, string> = {
  admin: 'Admin',
  teacher: 'Pedagog',
  staff: 'Personal',
};

function getInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function MainLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { sidebarOpen, toggleSidebar } = useAppStore();
  const { user, logout } = useAuthStore();

  const collapsed = !sidebarOpen;

  return (
    <div className="min-h-screen bg-surface-50 flex">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 72 : 240 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="fixed left-0 top-0 bottom-0 z-30 bg-white border-r border-surface-100 flex flex-col no-print"
      >
        {/* Header */}
        <div className="h-16 flex items-center px-4 border-b border-surface-100">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3 flex-1 min-w-0"
            >
              <div className="w-8 h-8 rounded-xl bg-primary-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">K</span>
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-semibold text-surface-900 tracking-display truncate">
                  Kålgården
                </h1>
                <p className="text-xs text-surface-400 truncate">Schemaläggning</p>
              </div>
            </motion.div>
          )}
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-xl hover:bg-surface-100 text-surface-500 hover:text-surface-700 transition-colors flex-shrink-0"
          >
            {collapsed ? <Menu className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 px-2 space-y-0.5">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                title={collapsed ? item.name : undefined}
                className={`
                  group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150
                  ${isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-surface-600 hover:bg-surface-50 hover:text-surface-900'
                  }
                `}
              >
                {/* Active indicator bar */}
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary-600 rounded-r-full"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <Icon className={`h-5 w-5 flex-shrink-0 ${isActive ? 'text-primary-600' : 'text-surface-400 group-hover:text-surface-600'}`} />
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="truncate"
                  >
                    {item.name}
                  </motion.span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        {user && (
          <div className="border-t border-surface-100 p-3">
            <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
              <div className="w-8 h-8 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-semibold text-primary-700">
                  {getInitials(user.first_name, user.last_name)}
                </span>
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-surface-900 truncate">
                    {user.first_name} {user.last_name}
                  </p>
                  <p className="text-xs text-surface-400 truncate">
                    {roleLabels[user.role] || user.role}
                  </p>
                </div>
              )}
              {!collapsed && (
                <button
                  onClick={logout}
                  title="Logga ut"
                  className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-surface-600 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        )}
      </motion.aside>

      {/* Main content */}
      <motion.main
        initial={false}
        animate={{ marginLeft: collapsed ? 72 : 240 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="flex-1 min-h-screen"
      >
        {children}
      </motion.main>
    </div>
  );
}
