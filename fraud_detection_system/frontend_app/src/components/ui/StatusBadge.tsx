import React from 'react';

export type StatusType =
  | 'COMPLETED'
  | 'PENDING'
  | 'PROCESSING'
  | 'FAILED'
  | 'BLOCKED'
  | 'ACTIVE'
  | 'FROZEN'
  | 'BANNED'
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'CRITICAL';

interface StatusBadgeProps {
  status: StatusType;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getStatusStyles = (status: StatusType) => {
    switch (status) {
      case 'COMPLETED':
      case 'ACTIVE':
      case 'LOW':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'PENDING':
      case 'PROCESSING':
      case 'MEDIUM':
      case 'FROZEN':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'FAILED':
      case 'BLOCKED':
      case 'BANNED':
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
      {status === 'COMPLETED' ? 'Hoàn tất'
        : status === 'PENDING' ? 'Chờ xử lý'
        : status === 'PROCESSING' ? 'Đang xử lý'
        : status === 'FAILED' ? 'Thất bại'
        : status === 'BLOCKED' ? 'Bị chặn'
        : status === 'ACTIVE' ? 'Hoạt động'
        : status === 'FROZEN' ? 'Đóng băng'
        : status === 'BANNED' ? 'Bị khóa'
        : status === 'LOW' ? 'Thấp'
        : status === 'MEDIUM' ? 'Trung bình'
        : status === 'HIGH' ? 'Cao'
        : status === 'CRITICAL' ? 'Rất cao'
        : status}
    </span>
  );
};
