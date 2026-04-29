import React, { useEffect, useState } from 'react';
import { Users, Activity, AlertTriangle, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StatCard } from '../components/ui/StatCard';
import { StatusBadge, StatusType } from '../components/ui/StatusBadge';
import { getAdminDashboard, getAdminFraudPredictions } from '../services/api';
import { formatVnd } from '../services/auth';

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState({
    total_users: 0,
    transactions_24h: 0,
    high_risk_alerts: 0,
    blocked_transactions: 0,
    pending_reviews: 0,
  });
  const [flaggedTxns, setFlaggedTxns] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    Promise.all([getAdminDashboard(), getAdminFraudPredictions()])
      .then(([dashboard, predictions]) => {
        if (!mounted) return;
        setSummary(dashboard);
        setFlaggedTxns(predictions.slice(0, 6));
      })
      .catch((err) => {
        if (mounted) setError(err.message || 'Could not load dashboard');
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Overview</h1>
        <p className="text-slate-500 text-sm">Live data from transaction, alert, and prediction tables</p>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Total Users" value={summary.total_users.toLocaleString()} icon={Users} />
        <StatCard title="Transactions (24h)" value={summary.transactions_24h.toLocaleString()} icon={Activity} />
        <StatCard
          title="Pending Reviews"
          value={summary.pending_reviews.toLocaleString()}
          icon={AlertTriangle}
          isAlert={summary.pending_reviews > 0}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">High Risk Alerts</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{summary.high_risk_alerts.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Blocked Transactions</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">{summary.blocked_transactions.toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900 tracking-tight">Priority Flagged Transactions</h3>
          <button
            type="button"
            onClick={() => navigate('/admin/alerts')}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            View Queue
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Req ID</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Amount</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Risk Score</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Risk Level</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {flaggedTxns.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-500">
                    <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                    No high risk transactions waiting in the queue.
                  </td>
                </tr>
              )}
              {flaggedTxns.map((txn) => (
                <tr key={txn.prediction_id} className="hover:bg-slate-50 transition-colors duration-200 group">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-mono text-sm font-medium text-slate-900">{txn.request_id}</span>
                    <div className="mt-1 text-xs text-slate-500">{txn.type} - {txn.status}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className="text-sm font-semibold text-slate-900">{formatVnd(txn.amount)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${txn.risk_score >= 80 ? 'bg-rose-500' : 'bg-amber-500'}`}
                          style={{ width: `${txn.risk_score}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-slate-700">{txn.risk_score.toFixed(2)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={txn.risk_level as StatusType} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      type="button"
                      onClick={() => navigate('/admin/alerts')}
                      className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 active:scale-[0.98] transition-all duration-200"
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
