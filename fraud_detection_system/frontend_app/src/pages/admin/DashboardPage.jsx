import React from 'react';
import { ShieldAlert, CheckCircle, Activity, TrendingUp, TrendingDown, AlertTriangle, Cpu } from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell
} from 'recharts';

const DashboardPage = () => {
  // Mock data for LineChart
  const weeklyData = [
    { day: 'Mon', total: 3200, fraud: 12 },
    { day: 'Tue', total: 3500, fraud: 8 },
    { day: 'Wed', total: 4100, fraud: 15 },
    { day: 'Thu', total: 3800, fraud: 5 },
    { day: 'Fri', total: 4500, fraud: 20 },
    { day: 'Sat', total: 2900, fraud: 10 },
    { day: 'Sun', total: 2600, fraud: 7 },
  ];

  // Mock data for PieChart
  const riskDistribution = [
    { name: 'Low Risk', value: 23200, color: '#10b981' }, // emerald-500
    { name: 'Medium Risk', value: 1050, color: '#f59e0b' }, // amber-500
    { name: 'High Risk', value: 342, color: '#ef4444' }, // red-500
  ];

  // Mock data for Model Performance
  const modelMetrics = [
    { name: 'F1-Score', value: 94.5, color: 'bg-blue-500' },
    { name: 'Recall (Sensitivity)', value: 98.2, color: 'bg-indigo-500' },
    { name: 'Precision', value: 91.0, color: 'bg-violet-500' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard Overview</h1>
        <p className="text-slate-500 mt-2">
          Theo dõi tổng quan tình hình kiểm tra và phân tích hệ thống AI theo thời gian thực.
        </p>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
              <Activity className="w-6 h-6 text-blue-600" />
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
              <TrendingUp className="w-3.5 h-3.5" /> 12.5%
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Tổng giao dịch kiểm tra</p>
            <h3 className="text-3xl font-bold text-slate-900 tracking-tight">24,592</h3>
            <p className="text-xs text-slate-400 mt-2">So với tuần trước (21,850)</p>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-rose-600" />
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700">
              <TrendingDown className="w-3.5 h-3.5" /> 2.1%
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Cảnh báo High Risk</p>
            <h3 className="text-3xl font-bold text-slate-900 tracking-tight">1,248</h3>
            <p className="text-xs text-slate-400 mt-2">So với tuần trước (1,274)</p>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
              <TrendingUp className="w-3.5 h-3.5" /> 0.3%
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Tỉ lệ giao dịch an toàn</p>
            <h3 className="text-3xl font-bold text-slate-900 tracking-tight">94.3%</h3>
            <p className="text-xs text-slate-400 mt-2">So với tuần trước (94.0%)</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Line Chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Lưu lượng & Cảnh báo (7 ngày)</h2>
              <p className="text-sm text-slate-500 mt-1">Biến động số lượng giao dịch và số ca gian lận</p>
            </div>
          </div>
          
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dx={-10} />
                <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dx={10} />
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                  labelStyle={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '4px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '13px' }} />
                <Line yAxisId="left" type="monotone" name="Tổng giao dịch" dataKey="total" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                <Line yAxisId="right" type="monotone" name="Gian lận (Fraud)" dataKey="fraud" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-6">
          {/* Pie Chart: Risk Level Distribution */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-2">Phân bổ rủi ro</h2>
            <div className="h-[200px] w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={riskDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                  >
                    {riskDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Center Text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold text-slate-800">24.5k</span>
                <span className="text-xs text-slate-500 font-medium">Total</span>
              </div>
            </div>
            <div className="mt-4 space-y-2.5">
              {riskDistribution.map((item, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: item.color }}></span>
                    <span className="text-slate-600 font-medium">{item.name}</span>
                  </div>
                  <span className="font-semibold text-slate-900">{item.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Model Performance Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                <Cpu className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800">Model Performance</h2>
                <p className="text-xs text-slate-500">Production v1.2 (RandomForest)</p>
              </div>
            </div>

            <div className="space-y-5">
              {modelMetrics.map((metric, index) => (
                <div key={index}>
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
