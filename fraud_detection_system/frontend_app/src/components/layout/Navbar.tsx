import React from 'react';
import { Bell, UserCircle, Menu } from 'lucide-react';

export const Navbar = () => {
  return (
    <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 sticky top-0 z-10 shadow-sm transition-all duration-200 ease-out">
      <div className="flex items-center gap-4">
        <button className="lg:hidden text-slate-500 hover:text-slate-900 transition-colors">
          <Menu className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-lg leading-none tracking-tight">F</span>
          </div>
          <span className="text-xl font-semibold text-slate-900 tracking-tight">FinGuard</span>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <button className="text-slate-400 hover:text-indigo-600 transition-colors relative group">
          <Bell className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
          <span className="absolute top-0 right-0 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
        </button>
        <div className="flex items-center gap-3 border-l pl-6 border-slate-200">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-slate-900 leading-none">Alex Morgan</p>
            <p className="text-xs text-slate-500 mt-1">alex@example.com</p>
          </div>
          <button className="text-slate-300 hover:text-slate-600 transition-colors active:scale-[0.98]">
            <UserCircle className="w-9 h-9" />
          </button>
        </div>
      </div>
    </header>
  );
};
