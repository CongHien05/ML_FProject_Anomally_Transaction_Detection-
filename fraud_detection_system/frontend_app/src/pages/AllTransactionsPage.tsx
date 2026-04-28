import React from 'react';
import { List } from 'lucide-react';

export const AllTransactionsPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">All Transactions</h1>
        <p className="text-slate-500 text-sm mt-1">Global view of all system transactions.</p>
      </div>
      
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 min-h-[500px] flex flex-col items-center justify-center">
        <List className="w-16 h-16 text-slate-200 mb-4" />
        <h3 className="text-lg font-medium text-slate-800">Global Transactions Table Skeleton</h3>
        <p className="text-slate-500 max-w-sm mt-2 text-center">A large data grid with advanced filtering capabilities.</p>
      </div>
    </div>
  );
};
