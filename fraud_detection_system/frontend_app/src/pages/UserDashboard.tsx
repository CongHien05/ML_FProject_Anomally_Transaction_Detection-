import React from 'react';
import { Send, Download, History } from 'lucide-react';
import { TransactionRow, TransactionProps } from '../components/ui/TransactionRow';

const mockTransactions: TransactionProps[] = [
  { id: 'TXN-8F3A92K', name: 'Apple Store', date: 'Apr 28, 14:32', amount: -1299.00, status: 'COMPLETED' },
  { id: 'TXN-9B2C41X', name: 'Salary Deposit', date: 'Apr 27, 09:00', amount: 4500.00, status: 'COMPLETED' },
  { id: 'TXN-7Y1R55L', name: 'Uber Rides', date: 'Apr 26, 19:45', amount: -24.50, status: 'COMPLETED' },
  { id: 'TXN-3M9P88Q', name: 'Amazon Prime', date: 'Apr 25, 10:12', amount: -14.99, status: 'PENDING' },
  { id: 'TXN-5K2N77W', name: 'Starbucks', date: 'Apr 25, 08:30', amount: -5.40, status: 'COMPLETED' },
];

export const UserDashboard = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Overview</h1>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Debit Card */}
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl p-6 text-white shadow-md relative overflow-hidden flex flex-col justify-between h-[220px] transition-transform duration-200 hover:-translate-y-0.5">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-40 h-40 rounded-full bg-white/10 blur-2xl"></div>
          <div className="relative z-10 flex justify-between items-start">
            <div>
              <p className="text-indigo-200 text-sm font-medium mb-1">Available Balance</p>
              <h2 className="text-4xl font-bold tracking-tight">$12,450.00</h2>
            </div>
            <div className="w-12 h-8 bg-white/20 rounded-md flex items-center justify-center backdrop-blur-md">
              <span className="text-xs font-bold tracking-widest opacity-80">VISA</span>
            </div>
          </div>
          <div className="relative z-10 flex justify-between items-end mt-8">
            <p className="font-mono text-lg tracking-widest opacity-90">•••• •••• •••• 4281</p>
            <p className="text-sm font-medium opacity-80">12/28</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="lg:col-span-2 grid grid-cols-3 gap-4">
          {[
            { title: 'Transfer', icon: Send, color: 'text-indigo-600', bg: 'bg-indigo-50', hover: 'hover:bg-indigo-100' },
            { title: 'Receive', icon: Download, color: 'text-emerald-600', bg: 'bg-emerald-50', hover: 'hover:bg-emerald-100' },
            { title: 'History', icon: History, color: 'text-slate-600', bg: 'bg-slate-100', hover: 'hover:bg-slate-200' },
          ].map((action, index) => (
            <button
              key={index}
              className={`flex flex-col items-center justify-center p-5 rounded-2xl border border-slate-200 bg-white transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] group`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${action.bg} ${action.hover} transition-colors mb-3`}>
                <action.icon className={`w-6 h-6 ${action.color}`} />
              </div>
              <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900">{action.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900 tracking-tight">Recent Transactions</h3>
          <button className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors">View All</button>
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
              {mockTransactions.map((txn) => (
                <TransactionRow key={txn.id} transaction={txn} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
