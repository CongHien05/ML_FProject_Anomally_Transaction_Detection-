import React from 'react';

export type StatusType = 'COMPLETED' | 'PENDING' | 'FAILED' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

interface StatusBadgeProps {
  status: StatusType;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getStatusStyles = (status: StatusType) => {
    switch (status) {
      case 'COMPLETED':
      case 'LOW':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'PENDING':
      case 'MEDIUM':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'FAILED':
      case 'HIGH':
      case 'CRITICAL':
        return 'bg-rose-100 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <span
      className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusStyles(
        status
      )}`}
    >
      {status}
    </span>
  );
};
