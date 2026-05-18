import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  ChevronRight,
  PieChart as PieChartIcon,
  RefreshCw,
  ShieldAlert,
  Users,
  UsersRound,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { StatCard } from '../../components/ui/StatCard';
import { StatusBadge, StatusType } from '../../components/ui/StatusBadge';
import { getAdminDashboard, getAdminFraudPredictions, getAllTransactions } from '../../services/api';
import { formatVnd } from '../../services/auth';

interface TransactionItem {
  id: number;
  request_id: string;
  amount: number;
  type: string;
  status: string;
  risk_score?: number;
  risk_level?: string;
  review_status?: string;
  created_at: string;
}

interface FlaggedTransactionItem extends TransactionItem {
  prediction_id: number;
  from_username?: string;
  from_full_name?: string;
  to_username?: string;
  to_full_name?: string;
}

interface DashboardSummary {
  total_users: number;
  transactions_24h: number;
  high_risk_alerts: number;
  blocked_transactions: number;
  pending_reviews: number;
}

const RISK_COLORS: Record<string, string> = {
  LOW: '#10b981',
  MEDIUM: '#f59e0b',
  HIGH: '#f97316',
  CRITICAL: '#e11d48',
};

const REVIEW_COLORS: Record<string, string> = {
  PENDING: '#f59e0b',
  APPROVED: '#10b981',
  REJECTED: '#e11d48',
  ACCOUNT_FROZEN: '#f97316',
  USER_BANNED: '#be123c',
  FALSE_POSITIVE: '#06b6d4',
  NONE: '#94a3b8',
};

const formatShortDate = (value: string) =>
  new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(value));

const toLocalDateKey = (value: string) => {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const buildLastDays = (days: number) => {
  const result: Array<{ key: string; label: string }> = [];
  const today = new Date();

  for (let index = days - 1; index >= 0; index -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - index);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
      date.getDate()
    ).padStart(2, '0')}`;
    result.push({ key, label: formatShortDate(`${key}T00:00:00`) });
  }

  return result;
};

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<DashboardSummary>({
    total_users: 0,
    transactions_24h: 0,
    high_risk_alerts: 0,
    blocked_transactions: 0,
    pending_reviews: 0,
  });
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [flaggedTxns, setFlaggedTxns] = useState<FlaggedTransactionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = async () => {
    setError('');
    setIsLoading(true);

    try {
      const [dashboard, predictions, allTransactions] = await Promise.all([
        getAdminDashboard(),
        getAdminFraudPredictions(),
        getAllTransactions(),
      ]);
      setSummary(dashboard);
      setFlaggedTxns(predictions.slice(0, 6));
      setTransactions(allTransactions);
    } catch (err) {
      setError(err.message || 'Could not load dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    Promise.all([getAdminDashboard(), getAdminFraudPredictions(), getAllTransactions()])
      .then(([dashboard, predictions, allTransactions]) => {
        if (!mounted) return;
        setSummary(dashboard);
        setFlaggedTxns(predictions.slice(0, 6));
        setTransactions(allTransactions);
      })
      .catch((err) => {
        if (mounted) setError(err.message || 'Could not load dashboard');
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const avgRiskScore = useMemo(() => {
    if (!transactions.length) return 0;
    const total = transactions.reduce((sum, txn) => sum + Number(txn.risk_score || 0), 0);
    return total / transactions.length;
  }, [transactions]);

  const highRiskShare = useMemo(() => {
    if (!transactions.length) return 0;
    const riskyCount = transactions.filter((txn) => ['HIGH', 'CRITICAL'].includes(txn.risk_level || 'LOW')).length;
    return (riskyCount / transactions.length) * 100;
  }, [transactions]);

  const riskDistribution = useMemo(() => {
    const order = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    const counts = transactions.reduce<Record<string, number>>((acc, txn) => {
      const risk = txn.risk_level || 'LOW';
      acc[risk] = (acc[risk] || 0) + 1;
      return acc;
    }, {});

    return order.map((level) => ({
      level,
      count: counts[level] || 0,
    }));
  }, [transactions]);

  const reviewDistribution = useMemo(() => {
    const order = ['PENDING', 'APPROVED', 'REJECTED', 'ACCOUNT_FROZEN', 'USER_BANNED', 'FALSE_POSITIVE', 'NONE'];
    const counts = transactions.reduce<Record<string, number>>((acc, txn) => {
      const status = txn.review_status || 'NONE';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    return order
      .map((status) => ({
        status,
        count: counts[status] || 0,
      }))
      .filter((item) => item.count > 0);
  }, [transactions]);

  const trendData = useMemo(() => {
    const days = buildLastDays(7);
    const buckets = days.reduce<Record<string, { day: string; count: number; riskTotal: number }>>((acc, day) => {
      acc[day.key] = { day: day.label, count: 0, riskTotal: 0 };
      return acc;
    }, {});

    transactions.forEach((txn) => {
      const key = toLocalDateKey(txn.created_at);
      const bucket = buckets[key];
      if (!bucket) return;
      bucket.count += 1;
      bucket.riskTotal += Number(txn.risk_score || 0);
    });

    return days.map((day) => {
      const bucket = buckets[day.key];
      return {
        day: bucket.day,
        transactions: bucket.count,
        avgRisk: bucket.count ? Number((bucket.riskTotal / bucket.count).toFixed(2)) : 0,
      };
    });
  }, [transactions]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Tổng Quan Hệ Thống</h1>
          <p className="mt-1 text-sm text-slate-500">Dữ liệu thời gian thực từ giao dịch, cảnh báo, dự đoán và kiểm duyệt</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/admin/accounts')}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            <UsersRound className="h-4 w-4" />
            Tài khoản
          </button>
          <button
            type="button"
            onClick={loadDashboard}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Làm mới
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
          Đang tải...
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            <StatCard title="Tổng người dùng" value={summary.total_users.toLocaleString()} icon={Users} />
            <StatCard title="Giao dịch (24h)" value={summary.transactions_24h.toLocaleString()} icon={Activity} />
            <StatCard
              title="Chờ kiểm duyệt"
              value={summary.pending_reviews.toLocaleString()}
              icon={AlertTriangle}
              isAlert={summary.pending_reviews > 0}
            />
            <StatCard
              title="Điểm rủi ro TB"
              value={avgRiskScore.toFixed(2)}
              icon={BarChart3}
              trend={`Tỷ lệ rủi ro cao: ${highRiskShare.toFixed(1)}%`}
              trendUp={highRiskShare < 25}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Cảnh báo rủi ro cao</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{summary.high_risk_alerts.toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm font-medium text-slate-500">Giao dịch bị chặn</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{summary.blocked_transactions.toLocaleString()}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-slate-500" />
                <h3 className="text-base font-semibold text-slate-900">Phân bố mức rủi ro</h3>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={riskDistribution} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="level" tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                    <Tooltip
                      formatter={(value: number) => [`${value} giao dịch`, 'Số lượng']}
                      contentStyle={{ borderRadius: '12px', borderColor: '#e2e8f0' }}
                    />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                      {riskDistribution.map((entry) => (
                        <Cell key={entry.level} fill={RISK_COLORS[entry.level] || '#64748b'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <PieChartIcon className="h-4 w-4 text-slate-500" />
                <h3 className="text-base font-semibold text-slate-900">Tỉ lệ kết quả kiểm duyệt</h3>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={reviewDistribution}
                      dataKey="count"
                      nameKey="status"
                      innerRadius={70}
                      outerRadius={105}
                      paddingAngle={3}
                    >
                      {reviewDistribution.map((entry) => (
                        <Cell key={entry.status} fill={REVIEW_COLORS[entry.status] || '#94a3b8'} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string) => [`${value} tx`, name]}
                      contentStyle={{ borderRadius: '12px', borderColor: '#e2e8f0' }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-slate-500" />
                <h3 className="text-base font-semibold text-slate-900">Biến động 7 ngày gần đây</h3>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={trendData} margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="day" tickLine={false} axisLine={false} />
                    <YAxis yAxisId="left" tickLine={false} axisLine={false} allowDecimals={false} />
                    <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} domain={[0, 100]} />
                    <Tooltip
                      formatter={(value: number, name: string) => {
                        if (name === 'transactions') return [`${value} giao dịch`, 'Số lượng'];
                        return [`${value.toFixed(2)}/100`, 'Rủi ro TB'];
                      }}
                      contentStyle={{ borderRadius: '12px', borderColor: '#e2e8f0' }}
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="transactions" name="Giao dịch" fill="#0f766e" radius={[8, 8, 0, 0]} />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="avgRisk"
                      name="Rủi ro TB"
                      stroke="#e11d48"
                      strokeWidth={2.5}
                      dot={{ r: 3 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 tracking-tight">Giao dịch ưu tiên kiểm duyệt</h3>
              <button
                type="button"
                onClick={() => navigate('/admin/alerts')}
                className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
              >
                Xem hàng chờ
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Mã GD</th>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Số tiền</th>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Mức rủi ro</th>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nhãn</th>
                    <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {flaggedTxns.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-500">
                        <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                        Không có giao dịch rủi ro cao nào đang chờ.
                      </td>
                    </tr>
                  )}
                  {flaggedTxns.map((txn) => (
                    <tr key={txn.prediction_id} className="hover:bg-slate-50 transition-colors duration-200 group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono text-sm font-medium text-slate-900">{txn.request_id}</span>
                        <div className="mt-1 text-xs text-slate-500">{txn.type === 'TRANSFER' ? 'Chuyển tiền' : txn.type === 'CASH_OUT' ? 'Rút tiền' : txn.type} — {txn.status === 'BLOCKED' ? 'Bị chặn' : txn.status === 'COMPLETED' ? 'Hoàn tất' : txn.status}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="text-sm font-semibold text-slate-900">{formatVnd(txn.amount)}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${txn.risk_score >= 80 ? 'bg-rose-500' : 'bg-amber-500'}`}
                              style={{ width: `${txn.risk_score}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-slate-700">{txn.risk_score.toFixed(2)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={txn.risk_level as StatusType} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          type="button"
                          onClick={() => navigate('/admin/alerts')}
                          className="px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 active:scale-[0.98] transition-all duration-200"
                        >
                          Kiểm duyệt
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
};
