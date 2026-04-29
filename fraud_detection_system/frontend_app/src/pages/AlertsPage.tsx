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
import { StatusBadge, StatusType } from '../components/ui/StatusBadge';
import { getAdminAlerts, markAdminAlertRead, reviewFraudPrediction } from '../services/api';

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
    } catch (err) {
      setError(err.message || 'Could not load alerts');
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
    } catch (err) {
      toast.error(err.message || 'Admin action failed');
    } finally {
      setActionLoading('');
    }
  };

  const unreadCount = alerts.filter((alert) => alert.status === 'UNREAD').length;
  const selectedFeatures = selected?.features_snapshot || {};
  const ipMapUrl = buildIpMapUrl(selected?.device_ip);
  const ipLookupUrl = buildIpLookupUrl(selected?.device_ip);
  const featureRows = [
    ['Recent average', selectedFeatures.avg_amount_last_10],
    ['Max recent amount', selectedFeatures.max_amount_last_10],
    ['Median recent amount', selectedFeatures.median_amount_last_10],
    ['Amount / average', selectedFeatures.amount_ratio_to_avg],
    ['Amount / balance', selectedFeatures.amount_to_balance_ratio],
    ['Balance after transaction', selectedFeatures.balance_after_transaction],
    ['Transactions in 24h', selectedFeatures.transaction_count_24h],
    ['New receiver', selectedFeatures.is_new_receiver],
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Triage Inbox</h1>
          <p className="text-slate-500 text-sm mt-1">
            {unreadCount} unread fraud alerts from blocked HIGH and CRITICAL transactions.
          </p>
        </div>
        <button
          type="button"
          onClick={loadAlerts}
          className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-xl shadow-sm hover:bg-slate-50 transition-colors"
        >
          Refresh
        </button>
      </div>

      {isLoading && (
        <div className="min-h-[420px] rounded-2xl border border-slate-200 bg-white flex items-center justify-center text-slate-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading alerts
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
          <h3 className="mt-4 text-lg font-semibold text-slate-900">No fraud alerts</h3>
          <p className="mt-1 text-sm text-slate-500">HIGH and CRITICAL transactions will appear here.</p>
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
                    AI analysis ready
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="w-full md:w-1/2 lg:w-3/5 bg-slate-50 p-6 flex flex-col">
            {selected && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex-1">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 tracking-tight">{selected.title}</h2>
                    <p className="text-sm text-slate-500 font-mono mt-0.5">
                      ALT-{String(selected.id).padStart(4, '0')} - User: {selected.username || 'unknown'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Amount</p>
                    <p className="mt-1 text-lg font-bold text-slate-900">{formatVnd(selected.amount)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Risk Score</p>
                    <p className="mt-1 text-lg font-bold text-rose-600">{selected.risk_score.toFixed(2)}/100</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Transaction</p>
                    <p className="mt-1 text-sm font-bold text-slate-900">
                      #{selected.transaction_id} - {selected.transaction_type}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Status</p>
                    <p className="mt-1 text-sm font-bold text-slate-900">{selected.transaction_status}</p>
                    <p className="mt-1 text-xs font-medium text-slate-500">{selected.review_status}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">IP Address</p>
                    <p className="mt-1 flex items-center gap-2 text-sm font-bold text-slate-900">
                      <Network className="h-4 w-4 text-slate-400" />
                      {selected.device_ip || 'Unknown'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Suspect</p>
                    <p className="mt-1 flex items-center gap-2 text-sm font-bold text-slate-900">
                      <UserRound className="h-4 w-4 text-slate-400" />
                      @{selected.from_username || selected.username || 'unknown'}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                      <MapPin className="h-3.5 w-3.5" />
                      Account #{selected.from_account_id ?? 'unknown'} to @{selected.to_username || 'external'}
                    </p>
                  </div>
                </div>

                <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2 text-indigo-800 font-semibold text-sm">
                    <Sparkles className="w-4 h-4" />
                    AI Risk Assessment
                  </div>
                  <p className="text-sm text-indigo-900/80 leading-relaxed">{selected.message}</p>
                  <ul className="mt-3 space-y-2">
                    {selected.explanations.map((explanation, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-indigo-900/80">
                        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-indigo-500" />
                        <span>{explanation}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => setIsReviewOpen(true)}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                >
                  Open full review popup
                  <ArrowRight className="h-4 w-4" />
                </button>

                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-slate-900 mb-3">Admin Action</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      { action: 'APPROVE', label: 'Approve transfer', className: 'hover:border-emerald-500 hover:bg-emerald-50' },
                      { action: 'REJECT', label: 'Reject transaction', className: 'hover:border-rose-500 hover:bg-rose-50' },
                      { action: 'ACCOUNT_FROZEN', label: 'Freeze account', className: 'hover:border-amber-500 hover:bg-amber-50' },
                      { action: 'USER_BANNED', label: 'Ban user', className: 'hover:border-rose-500 hover:bg-rose-50' },
                      { action: 'MARK_FALSE_POSITIVE', label: 'Mark false positive', className: 'hover:border-indigo-500 hover:bg-indigo-50 sm:col-span-2' },
                    ].map((item) => (
                      <button
                        key={item.action}
                        type="button"
                        onClick={() => handleAdminAction(item.action)}
                        disabled={Boolean(actionLoading)}
                        className={`rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition-all disabled:cursor-not-allowed disabled:opacity-50 ${item.className}`}
                      >
                        {actionLoading === item.action ? 'Working...' : item.label}
                      </button>
                    ))}
                  </div>
                </div>
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
                  Full admin review - Transaction #{selected.transaction_id}
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
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Amount</p>
                    <p className="mt-1 text-xl font-bold text-slate-900">{formatVnd(selected.amount)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Risk Score</p>
                    <p className="mt-1 text-xl font-bold text-rose-600">{selected.risk_score.toFixed(2)}/100</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Review State</p>
                    <p className="mt-1 text-sm font-bold text-slate-900">{selected.review_status}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatTime(selected.created_at)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Sender</p>
                    <p className="mt-2 text-base font-bold text-slate-900">
                      {selected.from_full_name || selected.from_username || 'Unknown sender'}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      @{selected.from_username || 'unknown'} - Account #{selected.from_account_id ?? 'unknown'}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Receiver</p>
                    <p className="mt-2 text-base font-bold text-slate-900">
                      {selected.to_full_name || selected.to_username || 'External receiver'}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      @{selected.to_username || 'external'} - Account #{selected.to_account_id ?? 'external'}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-indigo-900">
                    <Sparkles className="h-4 w-4" />
                    AI assessment
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
                  <p className="text-sm font-semibold text-slate-900">Risk signals</p>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {featureRows.map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                        <span className="text-slate-500">{label}</span>
                        <span className="font-semibold text-slate-900">{formatFeatureValue(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-sm font-semibold text-slate-900">Admin action</p>
                  <p className="mt-1 text-xs text-slate-500">
                    After this action, the item is removed from the pending review queue.
                  </p>
                  <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {[
                      { action: 'APPROVE', label: 'Approve transfer', className: 'hover:border-emerald-500 hover:bg-emerald-50' },
                      { action: 'REJECT', label: 'Reject transaction', className: 'hover:border-rose-500 hover:bg-rose-50' },
                      { action: 'ACCOUNT_FROZEN', label: 'Freeze account', className: 'hover:border-amber-500 hover:bg-amber-50' },
                      { action: 'USER_BANNED', label: 'Ban user', className: 'hover:border-rose-500 hover:bg-rose-50' },
                      { action: 'MARK_FALSE_POSITIVE', label: 'Mark false positive', className: 'hover:border-indigo-500 hover:bg-indigo-50 sm:col-span-2' },
                    ].map((item) => (
                      <button
                        key={item.action}
                        type="button"
                        onClick={() => handleAdminAction(item.action)}
                        disabled={Boolean(actionLoading)}
                        className={`rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition-all disabled:cursor-not-allowed disabled:opacity-50 ${item.className}`}
                      >
                        {actionLoading === item.action ? 'Working...' : item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 bg-slate-50 p-6 lg:border-l lg:border-t-0">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">IP Address</p>
                      <p className="mt-1 flex items-center gap-2 text-base font-bold text-slate-900">
                        <Network className="h-4 w-4 text-slate-400" />
                        {selected.device_ip || 'Unknown'}
                      </p>
                    </div>
                    {ipLookupUrl && (
                      <a
                        href={ipLookupUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                      >
                        Lookup
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
                        <p className="mt-3 text-sm font-semibold text-slate-700">No IP available</p>
                        <p className="mt-1 text-xs">The backend could not capture a client IP for this transaction.</p>
                      </div>
                    )}
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-slate-500">
                    Map lookup uses the captured network IP. Exact physical address depends on the IP intelligence provider.
                  </p>
                </div>

                <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-sm font-semibold text-slate-900">Route</p>
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
