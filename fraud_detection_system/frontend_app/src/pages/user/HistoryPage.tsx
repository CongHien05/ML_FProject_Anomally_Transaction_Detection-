import React, { useEffect, useState } from 'react';
import { History, Loader2 } from 'lucide-react';
import { StatusBadge, StatusType } from '../../components/ui/StatusBadge';
import { getMyTransactions } from '../../services/api';
import { formatVnd, getStoredUser } from '../../services/auth';

interface Transaction {
  id: number;
  request_id: string;
  from_account_id: number | null;
  from_username: string | null;
  from_full_name: string | null;
  to_account_id: number | null;
  to_username: string | null;
  to_full_name: string | null;
  amount: number;
  type: string;
  note: string | null;
  status: string;
  risk_score: number | null;
  risk_level: string | null;
  explanations: string[];
  created_at: string;
  updated_at: string;
}

const formatTime = (value: string) =>
  new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));

export const HistoryPage = () => {
  const user = getStoredUser();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    getMyTransactions()
      .then((data) => {
        if (mounted) setTransactions(data);
      })
      .catch((err) => {
        if (mounted) setError(err.message || 'Không thể tải lịch sử giao dịch');
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
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Lịch Sử Giao Dịch</h1>
        <p className="text-gray-500 text-sm mt-1">Xem lại các giao dịch đã thực hiện, đang chờ và bị chặn.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
        {isLoading && (
          <div className="flex min-h-[400px] items-center justify-center text-slate-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Đang tải...
          </div>
        )}

        {!isLoading && error && (
          <div className="m-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
            {error}
          </div>
        )}

        {!isLoading && !error && transactions.length === 0 && (
          <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
            <History className="w-16 h-16 text-gray-200 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">Chưa có giao dịch nào</h3>
            <p className="text-gray-500 max-w-sm mt-2 text-center">Các giao dịch chuyển tiền và rút tiền sẽ hiện thị tại đây.</p>
          </div>
        )}

        {!isLoading && !error && transactions.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Mã GD</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Người giao dịch</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Rủi ro</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Số tiền</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((txn) => {
                  const outgoing = txn.from_account_id === user?.account_id;
                  const counterparty = outgoing
                    ? txn.to_full_name || txn.to_username || 'Ngoài hệ thống'
                    : txn.from_full_name || txn.from_username || 'Ngoài hệ thống';

                  return (
                    <tr key={txn.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-mono text-sm font-semibold text-slate-900">{txn.request_id}</div>
                        <div className="mt-1 text-xs text-slate-500">{formatTime(txn.created_at)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-900">{counterparty}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {txn.type === 'TRANSFER' ? 'Chuyển tiền' : txn.type === 'CASH_OUT' ? 'Rút tiền' : txn.type === 'CASH_IN' ? 'Nạp tiền' : txn.type}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {txn.risk_level && txn.risk_level !== 'LOW' ? (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            txn.risk_level === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                            txn.risk_level === 'HIGH'     ? 'bg-orange-100 text-orange-700' :
                                                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            ⚠ {txn.risk_level === 'CRITICAL' ? 'Rất cao' : txn.risk_level === 'HIGH' ? 'Cao' : 'Trung bình'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-600">
                            ✓ An toàn
                          </span>
                        )}
                      </td>
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
        )}
      </div>
    </div>
  );
};
