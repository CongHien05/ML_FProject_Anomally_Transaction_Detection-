import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ShieldAlert, List, LogOut } from 'lucide-react';

export const AdminSidebar = () => {
  const navItems = [
    { name: 'Overview', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Fraud Alerts', path: '/admin/alerts', icon: ShieldAlert },
    { name: 'All Transactions', path: '/admin/transactions', icon: List },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 h-[calc(100vh-4rem)] sticky top-16 flex flex-col shadow-lg hidden lg:flex">
      <div className="flex-1 overflow-y-auto py-6 px-4">
        <div className="mb-6 px-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Backoffice System</p>
        </div>
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all duration-200 ease-out ${
                    isActive
                      ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                      : 'text-slate-300 font-medium hover:bg-slate-800 hover:text-white hover:-translate-y-0.5'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`w-5 h-5 transition-colors duration-200 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    {item.name}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-slate-800">
        <NavLink
          to="/login"
          className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 hover:-translate-y-0.5 transition-all duration-200 ease-out group"
        >
          <LogOut className="w-5 h-5 text-slate-500 group-hover:text-rose-400 transition-colors" />
          Sign Out
        </NavLink>
      </div>
    </aside>
  );
};
