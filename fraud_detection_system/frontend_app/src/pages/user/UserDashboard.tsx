import React, { useEffect, useState } from 'react';
import { Download, History, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StatusBadge, StatusType } from '../../components/ui/StatusBadge';
import { getCurrentUser, getMyTransactions } from '../../services/api';
import { formatVnd, getStoredUser, saveUser } from '../../services/auth';

const formatTime = (value: string) =>
  new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));

export const UserDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(() => getStoredUser());
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    let mounted = true;

    Promise.allSettled([getCurrentUser(), getMyTransactions()]).then(([userResult, txResult]) => {
      if (!mounted) return;

      if (userResult.status === 'fulfilled') {
        saveUser(userResult.value);
        setUser(userResult.value);
      } else {
        setUser(getStoredUser());
      }

      if (txResult.status === 'fulfilled') {
        setTransactions(txResult.value.slice(0, 5));
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  const accountTail = String(user?.account_id || '0000').padStart(4, '0');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Welcome back, {user?.full_name || 'User'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            @{user?.username || 'guest'} - Account #{user?.account_id || '--'} - {user?.status || 'ACTIVE'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl p-6 text-white shadow-md relative overflow-hidden flex flex-col justify-between h-[220px] transition-transform duration-200 hover:-translate-y-0.5">
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <p className="text-indigo-200 text-sm font-medium mb-1">Available Balance</p>
              <h2 className="text-3xl font-bold tracking-tight">{formatVnd(user?.balance || 0)}</h2>
              <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-indigo-200">
                {user?.currency || 'VND'} Account
              </p>
            </div>
            <div className="w-14 h-8 bg-white/20 rounded-md flex items-center justify-center backdrop-blur-md">
              <span className="text-xs font-bold tracking-widest opacity-80">{user?.role || 'USER'}</span>
            </div>
          </div>
          <div className="relative z-10 flex justify-between items-end mt-8">
            <div>
              <p className="font-mono text-lg tracking-widest opacity-90">**** **** **** {accountTail}</p>
              <p className="mt-1 text-xs font-medium opacity-70">{user?.full_name || 'Account Holder'}</p>
            </div>
            <p className="text-sm font-medium opacity-80">{user?.status || 'ACTIVE'}</p>
          </div>
        </div>

        <div className="lg:col-span-2 grid grid-cols-3 gap-4">
          {[
            { title: 'Transfer', icon: Send, path: '/user/transfer', color: 'text-indigo-600', bg: 'bg-indigo-50', hover: 'hover:bg-indigo-100' },
            { title: 'Cash Out', icon: Download, path: '/user/cashout', color: 'text-emerald-600', bg: 'bg-emerald-50', hover: 'hover:bg-emerald-100' },
            { title: 'History', icon: History, path: '/user/history', color: 'text-slate-600', bg: 'bg-slate-100', hover: 'hover:bg-slate-200' },
          ].map((action) => (
            <button
              key={action.title}
              type="button"
              onClick={() => navigate(action.path)}
              className="flex flex-col items-center justify-center p-5 rounded-2xl border border-slate-200 bg-white transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] group"
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${action.bg} ${action.hover} transition-colors mb-3`}>
                <action.icon className={`w-6 h-6 ${action.color}`} />
              </div>
              <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">{action.title}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Username</p>
          <p className="mt-2 text-lg font-bold text-slate-900">@{user?.username || 'guest'}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Account ID</p>
          <p className="mt-2 text-lg font-bold text-slate-900">#{user?.account_id || '--'}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Role</p>
          <p className="mt-2 text-lg font-bold text-slate-900">{user?.role || 'USER'}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900 tracking-tight">Recent Transactions</h3>
          <button
            type="button"
            onClick={() => navigate('/user/history')}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            View All
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Transaction</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Amount</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-sm text-slate-500">
                    No transactions yet.
                  </td>
                </tr>
              )}
              {transactions.map((txn) => {
                const outgoing = txn.from_account_id === user?.account_id;
                const name = outgoing ? txn.to_full_name || txn.to_username || txn.type : txn.from_full_name || txn.from_username || txn.type;
                return (
                  <tr key={txn.id} className="hover:bg-slate-50 transition-colors duration-200">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900">{name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{txn.request_id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{formatTime(txn.created_at)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className={`text-sm font-semibold ${outgoing ? 'text-slate-900' : 'text-emerald-600'}`}>
                        {outgoing ? '-' : '+'}
                        {formatVnd(txn.amount)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <StatusBadge status={txn.status as StatusType} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
