import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ShieldAlert, List, LogOut, UsersRound } from 'lucide-react';
import { getCurrentUser } from '../../services/api';
import { clearAuth, getStoredUser, saveUser } from '../../services/auth';

export const AdminSidebar = () => {
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
    { name: 'Tổng quan', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Cảnh báo gian lận', path: '/admin/alerts', icon: ShieldAlert },
    { name: 'Tất cả giao dịch', path: '/admin/transactions', icon: List },
    { name: 'Tài khoản', path: '/admin/accounts', icon: UsersRound },
  ];

 return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 h-[calc(100vh-4rem)] sticky top-16 flex-col shadow-lg hidden lg:flex">
      <div className="flex-1 overflow-y-auto py-5 px-3">
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest px-3 mb-4">
          Hệ thống quản trị
        </p>
        <nav className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 ${
                    isActive
                      ? 'bg-indigo-600 text-white font-semibold shadow-md'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                    {item.name}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="p-3 border-t border-slate-800 space-y-2">
        <div className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
            {(user?.full_name || user?.username || 'A').slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white leading-none">
              {user?.full_name || 'Admin User'}
            </p>
            <p className="truncate text-xs text-slate-500 mt-1">
              @{user?.username || 'admin'} · {user?.role || 'ADMIN'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => { clearAuth(); navigate('/login'); }}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-all duration-150 group"
        >
          <LogOut className="w-[18px] h-[18px] text-slate-500 group-hover:text-rose-400 transition-colors" />
          Đăng xuất
        </button>
      </div>
    </aside>
  );

};
