import React, { useState } from 'react';
import { Search, ShieldAlert, CheckCircle, AlertCircle, ArrowUpDown, Download, Eye, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';

const LogsPage = () => {
  // Mock Data
  const [logs] = useState([
    { id: 'TRX-90812', time: '2026-04-26 14:30:12', type: 'TRANSFER', amount: 250000, risk: 'High', sender: 'C192038', receiver: 'M92831' },
    { id: 'TRX-90811', time: '2026-04-26 14:28:45', type: 'PAYMENT', amount: 1500, risk: 'Low', sender: 'C827131', receiver: 'M11234' },
    { id: 'TRX-90810', time: '2026-04-26 14:25:01', type: 'CASH_OUT', amount: 50000, risk: 'Medium', sender: 'C443122', receiver: 'C99212' },
    { id: 'TRX-90809', time: '2026-04-26 14:20:19', type: 'TRANSFER', amount: 1200000, risk: 'High', sender: 'C102938', receiver: 'M55432' },
    { id: 'TRX-90808', time: '2026-04-26 14:15:33', type: 'DEBIT', amount: 200, risk: 'Low', sender: 'C554123', receiver: 'M00123' },
    { id: 'TRX-90807', time: '2026-04-26 14:10:05', type: 'PAYMENT', amount: 450, risk: 'Low', sender: 'C881234', receiver: 'M99123' },
    { id: 'TRX-90806', time: '2026-04-26 14:05:42', type: 'TRANSFER', amount: 85000, risk: 'Medium', sender: 'C112345', receiver: 'M22345' },
    { id: 'TRX-90805', time: '2026-04-26 14:01:10', type: 'CASH_IN', amount: 3000, risk: 'Low', sender: 'C992121', receiver: 'M33412' },
  ]);

  const getRiskBadge = (risk) => {
    switch (risk) {
      case 'High':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-rose-50 text-rose-700 border border-rose-100">
            <ShieldAlert className="w-3.5 h-3.5" /> High Risk
          </span>
        );
      case 'Medium':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-50 text-amber-700 border border-amber-100">
            <AlertCircle className="w-3.5 h-3.5" /> Medium Risk
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
            <CheckCircle className="w-3.5 h-3.5" /> Low Risk
          </span>
        );
    }
  };

  const handleExport = () => {
    const toastId = toast.loading('Đang xuất dữ liệu...');
    setTimeout(() => {
      toast.success('Đã tải xuống báo cáo CSV!', { id: toastId });
    }, 1500);
  };

  return (
    <div className="max-w-7xl mx-auto h-full flex flex-col space-y-6 pb-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Transaction Logs</h1>
        <p className="text-slate-500 mt-2">
          Quản lý, tìm kiếm và phân tích chi tiết lịch sử các giao dịch được quét bởi AI.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
        
        {/* Toolbar */}
        <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex flex-col lg:flex-row gap-4 justify-between items-center">
          <div className="relative w-full lg:w-96 group">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Tìm kiếm theo Transaction ID hoặc Sender ID..." 
              className="pl-9 pr-4 py-2 w-full border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white transition-all shadow-sm"
            />
          </div>
          
          <div className="flex flex-wrap gap-3 w-full lg:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <select className="appearance-none w-full sm:w-44 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium shadow-sm cursor-pointer pr-8">
                <option value="all">Risk Level: All</option>
                <option value="high">High Risk</option>
                <option value="medium">Medium Risk</option>
                <option value="low">Low Risk</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <div className="relative flex-1 sm:flex-none">
              <select className="appearance-none w-full sm:w-44 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium shadow-sm cursor-pointer pr-8">
                <option value="all">Type: All</option>
                <option value="transfer">TRANSFER</option>
                <option value="cash_out">CASH_OUT</option>
                <option value="payment">PAYMENT</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <button onClick={handleExport} className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 border border-slate-900 text-white rounded-lg hover:bg-slate-800 transition-all text-sm font-medium shadow-sm w-full sm:w-auto">
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-bold cursor-pointer hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-2">Transaction <ArrowUpDown className="w-3.5 h-3.5" /></div>
                </th>
                <th className="px-6 py-4 font-bold cursor-pointer hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-2">Time <ArrowUpDown className="w-3.5 h-3.5" /></div>
                </th>
                <th className="px-6 py-4 font-bold">Type</th>
                <th className="px-6 py-4 font-bold cursor-pointer hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-2">Amount <ArrowUpDown className="w-3.5 h-3.5" /></div>
                </th>
                <th className="px-6 py-4 font-bold">Risk Level</th>
                <th className="px-6 py-4 font-bold text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-900">{log.id}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{log.sender} &rarr; {log.receiver}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-600 font-medium">{log.time.split(' ')[0]}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{log.time.split(' ')[1]}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-semibold border border-slate-200">
                      {log.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-900">
                    ${log.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    {getRiskBadge(log.risk)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button 
                      className="text-slate-400 hover:text-blue-600 p-2 rounded-lg hover:bg-blue-50 transition-colors relative group/btn"
                      aria-label="View Details"
                    >
                      <Eye className="w-5 h-5" />
                      {/* Tooltip */}
                      <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-2.5 py-1.5 bg-slate-800 text-white text-xs font-medium rounded opacity-0 group-hover/btn:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-10 shadow-lg">
                        View Details
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45"></div>
                      </span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="p-5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50">
          <div className="text-sm text-slate-500 font-medium">
            Showing <span className="font-bold text-slate-900">1</span> to <span className="font-bold text-slate-900">10</span> of <span className="font-bold text-slate-900">500</span> entries
          </div>
          <div className="flex items-center gap-1.5">
            <button className="px-3.5 py-2 border border-slate-200 rounded-lg text-slate-400 cursor-not-allowed text-sm font-medium bg-white">
              Previous
            </button>
            <div className="hidden sm:flex gap-1.5 mx-2">
              <button className="w-9 h-9 flex items-center justify-center bg-blue-600 text-white rounded-lg font-medium text-sm shadow-sm hover:bg-blue-700 transition-colors">1</button>
              <button className="w-9 h-9 flex items-center justify-center border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors text-sm font-medium bg-white">2</button>
              <button className="w-9 h-9 flex items-center justify-center border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors text-sm font-medium bg-white">3</button>
              <span className="w-9 h-9 flex items-center justify-center text-slate-400 font-medium">...</span>
              <button className="w-9 h-9 flex items-center justify-center border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors text-sm font-medium bg-white">50</button>
            </div>
            <button className="px-3.5 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors text-sm font-medium bg-white">
              Next
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default LogsPage;
