/**
 * Main application layout with sidebar navigation
 */

import { Link, useLocation } from 'react-router-dom';
import { useAppStore } from '../../stores/appStore';

interface NavItem {
  name: string;
  path: string;
  icon: string;
}

const navItems: NavItem[] = [
  { name: 'Schema', path: '/', icon: '📅' },
  { name: 'Elever', path: '/students', icon: '👨‍🎓' },
  { name: 'Personal', path: '/staff', icon: '👤' },
  { name: 'Klasser', path: '/classes', icon: '📚' },
  { name: 'Import/Export', path: '/import', icon: '📥' },
];

export function MainLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { sidebarOpen, toggleSidebar } = useAppStore();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={toggleSidebar}
                className="p-2 rounded-md hover:bg-gray-100"
              >
                <span className="text-xl">☰</span>
              </button>
              <h1 className="ml-4 text-xl font-bold text-gray-900">
                🏫 Kålgårdens Schema
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {import.meta.env.VITE_APP_VERSION}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        {sidebarOpen && (
          <div className="w-64 bg-white border-r border-gray-200 min-h-screen">
            <nav className="mt-5 px-2">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`
                      group flex items-center px-3 py-3 text-base font-medium rounded-md mb-1
                      ${
                        isActive
                          ? 'bg-primary-100 text-primary-900'
                          : 'text-gray-700 hover:bg-gray-100'
                      }
                    `}
                  >
                    <span className="mr-3 text-xl">{item.icon}</span>
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}

        {/* Main content */}
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
