import React from 'react';
import { Users, Activity, AlertTriangle } from 'lucide-react';
import { StatCard } from '../components/ui/StatCard';
import { StatusBadge, StatusType } from '../components/ui/StatusBadge';

interface FlaggedTxn {
  id: string;
  amount: number;
  riskScore: number; // 0-100
  riskLevel: StatusType;
}

const mockFlaggedTxns: FlaggedTxn[] = [
  { id: 'REQ-9XF2...P1', amount: 15420.00, riskScore: 92, riskLevel: 'CRITICAL' },
  { id: 'REQ-4M8K...T9', amount: 8950.50, riskScore: 85, riskLevel: 'HIGH' },
  { id: 'REQ-2V1L...Q4', amount: 3200.00, riskScore: 68, riskLevel: 'MEDIUM' },
  { id: 'REQ-7B5N...W2', amount: 12500.00, riskScore: 74, riskLevel: 'MEDIUM' },
];

export const AdminDashboard = () => {
  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Overview</h1>
        <p className="text-slate-500 text-sm">Last updated: Just now</p>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Total Users" 
          value="124,592" 
          icon={Users} 
          trend="↑ 2.4%" 
          trendUp={true} 
        />
        <StatCard 
          title="Transactions (24h)" 
          value="842,019" 
          icon={Activity} 
          trend="↑ 5.1%" 
          trendUp={true} 
        />
        <StatCard 
          title="High Risk Alerts" 
          value="142" 
          icon={AlertTriangle} 
          trend="↑ 12%" 
          trendUp={false}
          isAlert={true}
        />
      </div>

      {/* Flagged Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900 tracking-tight">Priority Flagged Transactions</h3>
          <button className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors">View Queue</button>
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
              {mockFlaggedTxns.map((txn) => (
                <tr key={txn.id} className="hover:bg-slate-50 transition-colors duration-200 group">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-mono text-sm font-medium text-slate-900">{txn.id}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className="text-sm font-semibold text-slate-900">{formatCurrency(txn.amount)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${txn.riskScore >= 80 ? 'bg-rose-500' : 'bg-amber-500'}`} 
                          style={{ width: `${txn.riskScore}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-slate-700">{txn.riskScore}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={txn.riskLevel} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 active:scale-[0.98] transition-all duration-200">
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
