import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Send, Wallet, History, LogOut } from 'lucide-react';
import { getCurrentUser } from '../../services/api';
import { clearAuth, formatVnd, getStoredUser, saveUser } from '../../services/auth';

export const UserSidebar = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => getStoredUser());

  useEffect(() => {
    let mounted = true;

    getCurrentUser()
      .then((freshUser) => {
        if (!mounted) return;
        saveUser(freshUser);
        setUser(freshUser);
      })
      .catch(() => {
        if (mounted) setUser(getStoredUser());
      });

    return () => {
      mounted = false;
    };
  }, []);

  const navItems = [
    { name: 'Dashboard', path: '/user/dashboard', icon: LayoutDashboard },
    { name: 'Transfer Money', path: '/user/transfer', icon: Send },
    { name: 'Cash Out', path: '/user/cashout', icon: Wallet },
    { name: 'Transaction History', path: '/user/history', icon: History },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 h-[calc(100vh-4rem)] sticky top-16 flex flex-col shadow-sm hidden lg:flex">
      <div className="flex-1 overflow-y-auto py-6 px-4">
        <div className="mb-6 px-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Personal Banking</p>
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
                      ? 'bg-indigo-50 text-indigo-700 font-semibold'
                      : 'text-slate-600 font-medium hover:bg-slate-50 hover:text-slate-900 hover:-translate-y-0.5'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`w-5 h-5 transition-colors duration-200 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                    {item.name}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-slate-200">
        <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
              {(user?.full_name || user?.username || 'U').slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{user?.full_name || 'Guest User'}</p>
              <p className="truncate text-xs text-slate-500">Account #{user?.account_id || '--'}</p>
            </div>
          </div>
          <div className="mt-3 rounded-lg bg-white px-3 py-2">
            <p className="text-xs font-medium text-slate-500">Balance</p>
            <p className="mt-0.5 text-sm font-bold text-slate-900">{formatVnd(user?.balance || 0)}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            clearAuth();
            navigate('/login');
          }}
          className="flex w-full items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:-translate-y-0.5 transition-all duration-200 ease-out"
        >
          <LogOut className="w-5 h-5 text-slate-400 group-hover:text-rose-500 transition-colors" />
          Sign Out
        </button>
      </div>
    </aside>
  );
};
