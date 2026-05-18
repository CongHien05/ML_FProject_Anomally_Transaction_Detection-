import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  Clock,
  ExternalLink,
  Loader2,
  MapPin,
  Network,
  Sparkles,
  UserRound,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { StatusBadge, StatusType } from '../../components/ui/StatusBadge';
import { getAdminAlerts, markAdminAlertRead, reviewFraudPrediction } from '../../services/api';

interface AlertItem {
  id: number;
  user_id?: number;
  username?: string;
  transaction_id: number;
  prediction_id: number;
  request_id: string;
  from_account_id?: number;
  from_username?: string;
  from_full_name?: string;
  to_account_id?: number;
  to_username?: string;
  to_full_name?: string;
  device_ip?: string;
  type: string;
  risk_level: StatusType;
  risk_score: number;
  title: string;
  message: string;
  status: 'UNREAD' | 'READ';
  amount: number;
  transaction_type: string;
  transaction_status: string;
  review_status: string;
  explanations: string[];
  features_snapshot?: Record<string, number | string | boolean | null>;
  created_at: string;
}

const formatVnd = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value || 0);

const formatTime = (value: string) =>
  new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));

const formatFeatureValue = (value: number | string | boolean | null | undefined) => {
  if (value === null || value === undefined || value === '') return 'Unknown';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return value.toLocaleString('vi-VN');
  return value;
};

const buildIpMapUrl = (ip?: string) =>
  ip ? `https://maps.google.com/maps?q=${encodeURIComponent(ip)}&z=8&output=embed` : '';

const buildIpLookupUrl = (ip?: string) =>
  ip ? `https://ipinfo.io/${encodeURIComponent(ip)}` : '';

export const AlertsPage = () => {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState('');
  const [error, setError] = useState('');

  const loadAlerts = async () => {
    setError('');
    setIsLoading(true);

    try {
      const data = await getAdminAlerts();
      const pendingAlerts = data.filter((item: AlertItem) => item.review_status === 'PENDING');
      setAlerts(pendingAlerts);
      setSelectedId(pendingAlerts[0]?.id ?? null);
      setIsReviewOpen(false);
    } catch (err: unknown) {
      setError((err as Error).message || 'Không thể tải cảnh báo');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    getAdminAlerts()
      .then((data) => {
        if (!mounted) return;
        const pendingAlerts = data.filter((item: AlertItem) => item.review_status === 'PENDING');
        setAlerts(pendingAlerts);
        setSelectedId(pendingAlerts[0]?.id ?? null);
      })
      .catch((err) => {
        if (mounted) setError(err.message || 'Could not load alerts');
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const selected = useMemo(
    () => alerts.find((alert) => alert.id === selectedId) || alerts[0],
    [alerts, selectedId]
  );

  const handleSelect = async (alert: AlertItem) => {
    setSelectedId(alert.id);
    setIsReviewOpen(true);

    if (alert.status === 'READ') return;

    setAlerts((prev) =>
      prev.map((item) => (item.id === alert.id ? { ...item, status: 'READ' } : item))
    );

    try {
      await markAdminAlertRead(alert.id);
    } catch {
      setAlerts((prev) =>
        prev.map((item) => (item.id === alert.id ? { ...item, status: 'UNREAD' } : item))
      );
    }
  };

  const handleAdminAction = async (actionTaken: string) => {
    if (!selected) return;

    setActionLoading(actionTaken);
    try {
      const result = await reviewFraudPrediction({
        predictionId: selected.prediction_id,
        actionTaken,
        reviewNotes: `Action ${actionTaken} from alert inbox`,
      });

      const remainingAlerts = alerts.filter((item) => item.prediction_id !== selected.prediction_id);
      setAlerts(remainingAlerts);
      setSelectedId(remainingAlerts[0]?.id ?? null);
      setIsReviewOpen(false);
      toast.success(result.message);
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Thao tác thất bại');
    } finally {
      setActionLoading('');
    }
  };

  const unreadCount = alerts.filter((alert) => alert.status === 'UNREAD').length;
  const selectedFeatures = selected?.features_snapshot || {};
  const ipMapUrl = buildIpMapUrl(selected?.device_ip);
  const ipLookupUrl = buildIpLookupUrl(selected?.device_ip);
  const featureRows = [
    ['GD trung bình gần đây', selectedFeatures.avg_amount_last_10],
    ['GD lớn nhất gần đây', selectedFeatures.max_amount_last_10],
    ['GD trung vị gần đây', selectedFeatures.median_amount_last_10],
    ['Số tiền / trung bình', selectedFeatures.amount_ratio_to_avg],
    ['Số tiền / số dư', selectedFeatures.amount_to_balance_ratio],
    ['Số dư sau GD', selectedFeatures.balance_after_transaction],
    ['Số GD trong 24h', selectedFeatures.transaction_count_24h],
    ['Người nhận mới', selectedFeatures.is_new_receiver],
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Hộp cảnh báo gian lận</h1>
          <p className="text-slate-500 text-sm mt-1">
            {unreadCount} cảnh báo chưa đọc từ các giao dịch bị chặn mức CAO và RẤT CAO.
          </p>
        </div>
        <button
          type="button"
          onClick={loadAlerts}
          className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-xl shadow-sm hover:bg-slate-50 transition-colors"
        >
          Làm mới
        </button>
      </div>

      {isLoading && (
        <div className="min-h-[420px] rounded-2xl border border-slate-200 bg-white flex items-center justify-center text-slate-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Đang tải cảnh báo...
        </div>
      )}

      {!isLoading && error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      {!isLoading && !error && alerts.length === 0 && (
        <div className="min-h-[420px] rounded-2xl border border-slate-200 bg-white flex flex-col items-center justify-center text-center">
          <CheckCircle className="h-12 w-12 text-emerald-500" />
          <h3 className="mt-4 text-lg font-semibold text-slate-900">Không có cảnh báo</h3>
          <p className="mt-1 text-sm text-slate-500">Giao dịch mức CAO và RẤT CAO sẽ xuất hiện tại đây.</p>
        </div>
      )}

      {!isLoading && !error && alerts.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[620px]">
          <div className="w-full md:w-1/2 lg:w-2/5 border-r border-slate-200 overflow-y-auto">
            <div className="divide-y divide-slate-100">
              {alerts.map((alert) => (
                <button
                  type="button"
                  key={alert.id}
                  onClick={() => handleSelect(alert)}
                  className={`w-full text-left p-5 cursor-pointer transition-all duration-200 ease-out hover:bg-slate-50 ${
                    selected?.id === alert.id ? 'bg-indigo-50/40' : ''
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <StatusBadge status={alert.risk_level} />
                    <div className="flex items-center text-xs text-slate-400">
                      <Clock className="w-3.5 h-3.5 mr-1" />
                      {formatTime(alert.created_at)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {alert.status === 'UNREAD' && <span className="h-2 w-2 rounded-full bg-indigo-600" />}
                    <h4 className="font-semibold tracking-tight text-sm text-slate-900">
                      {alert.title}
                    </h4>
                  </div>
                  <p className="mt-1 text-sm text-slate-500 line-clamp-2 leading-relaxed">
                    {alert.message}
                  </p>
                  <div className="mt-3 inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs font-medium border border-indigo-100">
                    <Sparkles className="w-3 h-3" />
                    Phân tích AI sẵn sàng
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="w-full md:w-1/2 lg:w-3/5 bg-slate-50 p-4 flex flex-col overflow-y-auto">
            {selected && (
              <div className="space-y-3">

                {/* ── 1. Risk score bar ── */}
                <div className={`rounded-xl border p-4 ${
                  selected.risk_level === 'CRITICAL' ? 'border-red-200 bg-red-50'
                  : selected.risk_level === 'HIGH' ? 'border-orange-200 bg-orange-50'
                  : selected.risk_level === 'MEDIUM' ? 'border-yellow-200 bg-yellow-50'
                  : 'border-emerald-200 bg-emerald-50'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className={`h-4 w-4 ${
                        selected.risk_level === 'CRITICAL' ? 'text-red-600'
                        : selected.risk_level === 'HIGH' ? 'text-orange-600'
                        : selected.risk_level === 'MEDIUM' ? 'text-yellow-600'
                        : 'text-emerald-600'
                      }`} />
                      <span className="text-sm font-semibold text-slate-800">{selected.title}</span>
                    </div>
                    <StatusBadge status={selected.risk_level as StatusType} />
                  </div>
                  <div className="flex items-center gap-3 mt-3">
                    <div className="flex-1 h-2.5 bg-white/60 rounded-full overflow-hidden border border-slate-200">
                      <div
                        className={`h-full rounded-full transition-all ${
                          selected.risk_level === 'CRITICAL' ? 'bg-red-500'
                          : selected.risk_level === 'HIGH' ? 'bg-orange-500'
                          : selected.risk_level === 'MEDIUM' ? 'bg-yellow-500'
                          : 'bg-emerald-500'
                        }`}
                        style={{ width: `${selected.risk_score}%` }}
                      />
                    </div>
                    <span className={`text-lg font-black w-14 text-right ${
                      selected.risk_level === 'CRITICAL' ? 'text-red-700'
                      : selected.risk_level === 'HIGH' ? 'text-orange-700'
                      : selected.risk_level === 'MEDIUM' ? 'text-yellow-700'
                      : 'text-emerald-700'
                    }`}>
                      {selected.risk_score.toFixed(0)}
                      <span className="text-xs font-normal text-slate-400">/100</span>
                    </span>
                  </div>
                </div>

                {/* ── 2. Transaction route ── */}
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-3">Luồng giao dịch</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2.5">
                      <p className="text-xs text-slate-500">Người gửi</p>
                      <p className="font-semibold text-sm text-slate-900 truncate">
                        @{selected.from_username || selected.username || 'unknown'}
                      </p>
                      <p className="text-xs text-slate-400">#{selected.from_account_id ?? '—'}</p>
                    </div>
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      <ArrowRight className="h-4 w-4 text-slate-400" />
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        {selected.transaction_type === 'TRANSFER' ? 'CK' : selected.transaction_type === 'CASH_OUT' ? 'Rút' : selected.transaction_type}
                      </span>
                      <span className="text-xs font-bold text-slate-700">{formatVnd(selected.amount)}</span>
                    </div>
                    <div className="flex-1 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2.5">
                      <p className="text-xs text-slate-500">Người nhận</p>
                      <p className="font-semibold text-sm text-slate-900 truncate">
                        @{selected.to_username || 'external'}
                      </p>
                      <p className="text-xs text-slate-400">#{selected.to_account_id ?? '—'}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                    <Network className="h-3.5 w-3.5" />
                    IP: {selected.device_ip || 'Không rõ'}
                    <span className="mx-1">·</span>
                    GD #{selected.transaction_id}
                    <span className="mx-1">·</span>
                    {selected.transaction_status}
                  </div>
                </div>

                {/* ── 3. AI explanations ── */}
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
                  <div className="flex items-center gap-2 mb-3 text-indigo-800 font-semibold text-sm">
                    <Sparkles className="w-4 h-4" />
                    Phân tích AI
                  </div>
                  <ul className="space-y-2">
                    {selected.explanations.map((explanation, index) => (
                      <li key={index} className="flex items-start gap-2.5 rounded-lg bg-white/70 px-3 py-2 text-sm text-indigo-900/80">
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-indigo-400 shrink-0" />
                        {explanation}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* ── 4. Action buttons ── */}
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-3">Hành động</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => handleAdminAction('APPROVE')} disabled={Boolean(actionLoading)}
                      className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 transition-colors">
                      {actionLoading === 'APPROVE' ? 'Đang xử lý...' : '✓ Duyệt'}
                    </button>
                    <button type="button" onClick={() => handleAdminAction('REJECT')} disabled={Boolean(actionLoading)}
                      className="flex items-center justify-center gap-1.5 rounded-xl bg-rose-50 border border-rose-200 px-3 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50 transition-colors">
                      {actionLoading === 'REJECT' ? 'Đang xử lý...' : '✕ Từ chối'}
                    </button>
                    <button type="button" onClick={() => handleAdminAction('ACCOUNT_FROZEN')} disabled={Boolean(actionLoading)}
                      className="flex items-center justify-center gap-1.5 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 text-sm font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-50 transition-colors">
                      {actionLoading === 'ACCOUNT_FROZEN' ? 'Đang xử lý...' : '🔒 Đóng băng TK'}
                    </button>
                    <button type="button" onClick={() => handleAdminAction('USER_BANNED')} disabled={Boolean(actionLoading)}
                      className="flex items-center justify-center gap-1.5 rounded-xl bg-rose-50 border border-rose-200 px-3 py-2.5 text-sm font-semibold text-rose-800 hover:bg-rose-100 disabled:opacity-50 transition-colors">
                      {actionLoading === 'USER_BANNED' ? 'Đang xử lý...' : '⛔ Khóa người dùng'}
                    </button>
                    <button type="button" onClick={() => handleAdminAction('MARK_FALSE_POSITIVE')} disabled={Boolean(actionLoading)}
                      className="col-span-2 flex items-center justify-center gap-1.5 rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50 transition-colors">
                      {actionLoading === 'MARK_FALSE_POSITIVE' ? 'Đang xử lý...' : '↩ Đánh dấu báo sai (False Positive)'}
                    </button>
                  </div>
                </div>

                {/* ── 5. Full review link ── */}
                <button
                  type="button"
                  onClick={() => setIsReviewOpen(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
                >
                  Xem đầy đủ + bản đồ IP
                  <ArrowRight className="h-4 w-4" />
                </button>

              </div>
            )}
          </div>
        </div>
      )}

      {selected && isReviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={selected.risk_level} />
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                    {selected.transaction_status}
                  </span>
                </div>
                <h2 className="mt-3 text-xl font-bold tracking-tight text-slate-900">
                  Kiểm duyệt đầy đủ — Giao dịch #{selected.transaction_id}
                </h2>
                <p className="mt-1 text-sm text-slate-500 font-mono">{selected.request_id}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsReviewOpen(false)}
                className="rounded-xl border border-slate-200 p-2 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
                aria-label="Close review popup"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid max-h-[calc(92vh-88px)] grid-cols-1 overflow-y-auto lg:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-5 p-6">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Số tiền</p>
                    <p className="mt-1 text-xl font-bold text-slate-900">{formatVnd(selected.amount)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Mức rủi ro</p>
                    <p className="mt-1 text-xl font-bold text-rose-600">{selected.risk_score.toFixed(2)}/100</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Trạng thái</p>
                    <p className="mt-1 text-sm font-bold text-slate-900">{selected.review_status}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatTime(selected.created_at)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Người gửi</p>
                    <p className="mt-2 text-base font-bold text-slate-900">
                      {selected.from_full_name || selected.from_username || 'Không rõ'}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      @{selected.from_username || 'unknown'} - Account #{selected.from_account_id ?? 'unknown'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Người nhận</p>
                    <p className="mt-2 text-base font-bold text-slate-900">
                      {selected.to_full_name || selected.to_username || 'Người nhận ngoài hệ thống'}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      @{selected.to_username || 'external'} - Account #{selected.to_account_id ?? 'external'}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-indigo-900">
                    <Sparkles className="h-4 w-4" />
                    Đánh giá từ AI
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-indigo-950/80">{selected.message}</p>
                  <ul className="mt-3 space-y-2">
                    {selected.explanations.map((explanation, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-indigo-950/80">
                        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-indigo-500" />
                        <span>{explanation}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-sm font-semibold text-slate-900">Dấu hiệu rủi ro</p>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {featureRows.map(([label, value], idx) => (
                      <div key={idx} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                        <span className="text-slate-500">{label}</span>
                        <span className="font-semibold text-slate-900">{formatFeatureValue(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-sm font-semibold text-slate-900">Hành động quản trị</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Sau khi thực hiện, giao dịch này sẽ rời khỏi hàng chờ kiểm duyệt.
                  </p>
                  <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {[
                      { action: 'APPROVE', label: 'Duyệt giao dịch', className: 'hover:border-emerald-500 hover:bg-emerald-50' },
                      { action: 'REJECT', label: 'Từ chối giao dịch', className: 'hover:border-rose-500 hover:bg-rose-50' },
                      { action: 'ACCOUNT_FROZEN', label: 'Đóng băng tài khoản', className: 'hover:border-amber-500 hover:bg-amber-50' },
                      { action: 'USER_BANNED', label: 'Khóa người dùng', className: 'hover:border-rose-500 hover:bg-rose-50' },
                      { action: 'MARK_FALSE_POSITIVE', label: 'Đánh dấu báo sai', className: 'hover:border-indigo-500 hover:bg-indigo-50 sm:col-span-2' },
                    ].map((item) => (
                      <button
                        key={item.action}
                        type="button"
                        onClick={() => handleAdminAction(item.action)}
                        disabled={Boolean(actionLoading)}
                        className={`rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition-all disabled:cursor-not-allowed disabled:opacity-50 ${item.className}`}
                      >
                        {actionLoading === item.action ? 'Đang xử lý...' : item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 bg-slate-50 p-6 lg:border-l lg:border-t-0">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Địa chỉ IP</p>
                      <p className="mt-1 flex items-center gap-2 text-base font-bold text-slate-900">
                        <Network className="h-4 w-4 text-slate-400" />
                        {selected.device_ip || 'Không rõ'}
                      </p>
                    </div>
                    {ipLookupUrl && (
                      <a
                        href={ipLookupUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                      >
                        Tra cứu
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>

                  <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                    {ipMapUrl ? (
                      <iframe
                        title={`IP map lookup ${selected.device_ip}`}
                        src={ipMapUrl}
                        className="h-72 w-full"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-72 flex-col items-center justify-center text-center text-slate-500">
                        <MapPin className="h-10 w-10 text-slate-300" />
                        <p className="mt-3 text-sm font-semibold text-slate-700">Không có IP</p>
                        <p className="mt-1 text-xs">Hệ thống không ghi lại địa chỉ IP cho giao dịch này.</p>
                      </div>
                    )}
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-slate-500">
                    Bản đồ dựa trên IP mạng ghi lại. Địa chỉ chính xác phụ thuộc vào nhà cung cấp dữ liệu IP.
                  </p>
                </div>

                <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-900">Luồng giao dịch</p>
                  <div className="mt-3 flex items-center gap-3 text-sm">
                    <div className="min-w-0 flex-1 rounded-lg bg-slate-50 px-3 py-2">
                      <p className="truncate font-semibold text-slate-900">@{selected.from_username || 'unknown'}</p>
                      <p className="text-xs text-slate-500">Account #{selected.from_account_id ?? 'unknown'}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
                    <div className="min-w-0 flex-1 rounded-lg bg-slate-50 px-3 py-2">
                      <p className="truncate font-semibold text-slate-900">@{selected.to_username || 'external'}</p>
                      <p className="text-xs text-slate-500">Account #{selected.to_account_id ?? 'external'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
