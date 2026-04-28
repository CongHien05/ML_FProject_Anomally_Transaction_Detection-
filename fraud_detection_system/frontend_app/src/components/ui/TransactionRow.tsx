import React from 'react';
import { StatusBadge, StatusType } from './StatusBadge';

export interface TransactionProps {
  id: string;
  name: string;
  date: string;
  amount: number;
  status: StatusType;
}

export const TransactionRow: React.FC<{ transaction: TransactionProps }> = ({ transaction }) => {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(transaction.amount);

  return (
    <tr className="hover:bg-slate-50 transition-colors duration-200 group border-b border-slate-100 last:border-0">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div>
            <div className="text-sm font-medium text-slate-900">{transaction.name}</div>
            <div className="text-xs text-slate-500 mt-0.5">{transaction.id}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-slate-500">{transaction.date}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right">
        <div className={`text-sm font-medium ${transaction.amount < 0 ? 'text-slate-900' : 'text-emerald-600'}`}>
          {transaction.amount > 0 ? '+' : ''}{formattedAmount}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right">
        <StatusBadge status={transaction.status} />
      </td>
    </tr>
  );
};
