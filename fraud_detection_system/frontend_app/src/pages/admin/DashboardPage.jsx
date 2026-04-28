import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Cpu,
  Loader2,
  ShieldAlert,
  TrendingUp,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import toast from 'react-hot-toast';
import { fetchDashboardSummary, fetchModelInfo } from '../../services/api';

const fallbackSummary = {
  stats: {
    total_transactions: 0,
    high_risk: 0,
    safe_rate: 0,
  },
  weeklyData: [],
  riskDistribution: [
    { name: 'Low Risk', value: 0, color: '#10b981' },
    { name: 'Medium Risk', value: 0, color: '#f59e0b' },
    { name: 'High Risk', value: 0, color: '#ef4444' },
  ],
  modelMetrics: [],
  recentAlerts: [],
};

const numberFormatter = new Intl.NumberFormat('en-US');
const moneyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const DashboardPage = () => {
  const [summary, setSummary] = useState(fallbackSummary);
  const [modelInfo, setModelInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      setIsLoading(true);
      try {
        const [dashboardData, modelData] = await Promise.all([
          fetchDashboardSummary(),
          fetchModelInfo().catch(() => null),
        ]);
        setSummary({
          ...fallbackSummary,
          ...dashboardData,
          weeklyData: dashboardData.weeklyData || [],
          riskDistribution: dashboardData.riskDistribution || fallbackSummary.riskDistribution,
          modelMetrics: dashboardData.modelMetrics || [],
          recentAlerts: dashboardData.recentAlerts || [],
        });
        setModelInfo(modelData);
      } catch (error) {
        console.error(error);
        toast.error('Cannot load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const stats = summary.stats || fallbackSummary.stats;
  const totalRisk = summary.riskDistribution.reduce((sum, item) => sum + Number(item.value || 0), 0);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-8">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard Overview</h1>
          <p className="text-slate-500 mt-2">
            Real-time admin view for predictions stored in the XAMPP MySQL database.
          </p>
        </div>
        {isLoading && (
          <div className="inline-flex items-center gap-2 text-sm font-medium text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading data
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
              <Activity className="w-6 h-6 text-blue-600" />
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
              <TrendingUp className="w-3.5 h-3.5" /> Live
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Total checked transactions</p>
            <h3 className="text-3xl font-bold text-slate-900 tracking-tight">
              {numberFormatter.format(stats.total_transactions || 0)}
            </h3>
            <p className="text-xs text-slate-400 mt-2">Stored in prediction_logs</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-rose-600" />
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700">
              Review
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">High Risk alerts</p>
            <h3 className="text-3xl font-bold text-slate-900 tracking-tight">
              {numberFormatter.format(stats.high_risk || 0)}
            </h3>
            <p className="text-xs text-slate-400 mt-2">Use Logs to confirm or reject alerts</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
              Low Risk
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Safe transaction rate</p>
            <h3 className="text-3xl font-bold text-slate-900 tracking-tight">
              {(stats.safe_rate || 0).toFixed(1)}%
            </h3>
            <p className="text-xs text-slate-400 mt-2">Based on Low Risk predictions</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Traffic and High Risk Alerts</h2>
              <p className="text-sm text-slate-500 mt-1">Last 7 days from MySQL logs</p>
            </div>
          </div>

          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={summary.weeklyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dx={-10} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dx={10} />
                <RechartsTooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                  labelStyle={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '4px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '13px' }} />
                <Line yAxisId="left" type="monotone" name="Total" dataKey="total" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                <Line yAxisId="right" type="monotone" name="High Risk" dataKey="fraud" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-2">Risk Distribution</h2>
            <div className="h-[200px] w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={summary.riskDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                  >
                    {summary.riskDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold text-slate-800">{numberFormatter.format(totalRisk)}</span>
                <span className="text-xs text-slate-500 font-medium">Total</span>
              </div>
            </div>
            <div className="mt-4 space-y-2.5">
              {summary.riskDistribution.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-600 font-medium">{item.name}</span>
                  </div>
                  <span className="font-semibold text-slate-900">{numberFormatter.format(item.value || 0)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                <Cpu className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">Model Status</h2>
                <p className="text-xs text-slate-500">
                  {modelInfo?.status === 'loaded'
                    ? modelInfo.model_file
                    : 'Model not loaded yet'}
                </p>
              </div>
            </div>

            <div className="space-y-5">
              {summary.modelMetrics.map((metric) => (
                <div key={metric.name}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-slate-700">{metric.name}</span>
                    <span className="text-sm font-bold text-slate-900">{metric.value}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${metric.color} rounded-full transition-all duration-1000 ease-out`}
                      style={{ width: `${metric.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {modelInfo?.status !== 'loaded' && (
              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                {modelInfo?.detail || 'Backend is running, but the model file is unavailable.'}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center">
            <ShieldAlert className="w-5 h-5 text-rose-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Recent High Risk Alerts</h2>
            <p className="text-xs text-slate-500">Latest cases waiting for admin review</p>
          </div>
        </div>

        {summary.recentAlerts.length === 0 ? (
          <div className="text-sm text-slate-500 border border-dashed border-slate-200 rounded-xl p-6 text-center">
            No High Risk alerts yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {summary.recentAlerts.map((alert) => (
              <div key={alert.id} className="py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                  <div className="font-semibold text-slate-900">{alert.transactionId}</div>
                  <div className="text-xs text-slate-500">{alert.time} - {alert.type}</div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-bold text-slate-900">{moneyFormatter.format(alert.amount)}</span>
                  <span className="text-sm font-semibold text-rose-600">{alert.riskScore.toFixed(1)}/100</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
