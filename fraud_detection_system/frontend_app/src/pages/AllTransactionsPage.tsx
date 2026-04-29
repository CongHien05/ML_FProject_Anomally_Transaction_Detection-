import React, { useEffect, useState } from 'react';
import { List, Loader2 } from 'lucide-react';
import { StatusBadge, StatusType } from '../components/ui/StatusBadge';
import { getAllTransactions } from '../services/api';
import { formatVnd } from '../services/auth';

const formatTime = (value: string) =>
  new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));

export const AllTransactionsPage = () => {
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    getAllTransactions()
      .then((data) => {
        if (mounted) setTransactions(data);
      })
      .catch((err) => {
        if (mounted) setError(err.message || 'Could not load transactions');
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">All Transactions</h1>
        <p className="text-slate-500 text-sm mt-1">Global view of all system transactions and AI decisions.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
        {isLoading && (
          <div className="flex min-h-[500px] items-center justify-center text-slate-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading transactions
          </div>
        )}

        {!isLoading && error && (
          <div className="m-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
            {error}
          </div>
        )}

        {!isLoading && !error && transactions.length === 0 && (
          <div className="flex min-h-[500px] flex-col items-center justify-center text-center">
            <List className="w-16 h-16 text-slate-200 mb-4" />
            <h3 className="text-lg font-medium text-slate-800">No transactions yet</h3>
            <p className="text-slate-500 max-w-sm mt-2 text-center">Submitted transfers and cash-out requests will be mapped here.</p>
          </div>
        )}

        {!isLoading && !error && transactions.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Request</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">From</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">To</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Risk</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Amount</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((txn) => (
                  <tr key={txn.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-mono text-sm font-semibold text-slate-900">{txn.request_id}</div>
                      <div className="mt-1 text-xs text-slate-500">{formatTime(txn.created_at)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900">{txn.from_full_name || 'External'}</div>
                      <div className="mt-1 text-xs text-slate-500">@{txn.from_username || 'none'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900">{txn.to_full_name || 'External'}</div>
                      <div className="mt-1 text-xs text-slate-500">@{txn.to_username || 'none'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-slate-900">{txn.risk_score?.toFixed?.(2) || '0.00'}/100</div>
                      <div className="mt-1 text-xs text-slate-500">{txn.risk_level || 'LOW'} - {txn.review_status || 'NONE'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="text-sm font-semibold text-slate-900">{formatVnd(txn.amount)}</span>
                      <div className="mt-1 text-xs text-slate-500">{txn.type}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <StatusBadge status={txn.status as StatusType} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
