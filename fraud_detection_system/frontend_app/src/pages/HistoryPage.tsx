import React from 'react';
import { History } from 'lucide-react';

export const HistoryPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Transaction History</h1>
        <p className="text-gray-500 text-sm mt-1">Review your past transactions and account activity.</p>
      </div>
      
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 min-h-[400px] flex flex-col items-center justify-center">
        <History className="w-16 h-16 text-gray-200 mb-4" />
        <h3 className="text-lg font-medium text-gray-900">History Table Skeleton</h3>
        <p className="text-gray-500 max-w-sm mt-2 text-center">A comprehensive, paginated table of user transactions will be rendered here.</p>
      </div>
    </div>
  );
};
