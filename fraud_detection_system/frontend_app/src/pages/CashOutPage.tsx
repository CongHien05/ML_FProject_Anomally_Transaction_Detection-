import React from 'react';
import { Wallet } from 'lucide-react';

export const CashOutPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Cash Out</h1>
        <p className="text-gray-500 text-sm mt-1">Withdraw funds to your linked bank account.</p>
      </div>
      
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 min-h-[400px] flex flex-col items-center justify-center">
        <Wallet className="w-16 h-16 text-gray-200 mb-4" />
        <h3 className="text-lg font-medium text-gray-900">Cash Out Form Skeleton</h3>
        <p className="text-gray-500 max-w-sm mt-2 text-center">Amount to withdraw and destination selection will go here.</p>
      </div>
    </div>
  );
};
