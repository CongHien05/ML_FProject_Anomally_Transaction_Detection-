import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  ShieldAlert,
  CheckCircle,
  AlertCircle,
  Download,
  Eye,
  ChevronDown,
  Loader2,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchTransactionLogs, updateLogReview } from '../../services/api';

const riskOptions = ['all', 'High', 'Medium', 'Low'];
const typeOptions = ['all', 'TRANSFER', 'CASH_OUT', 'PAYMENT', 'CASH_IN', 'DEBIT'];
const reviewOptions = ['Pending', 'Confirmed Fraud', 'False Positive', 'Safe'];

const moneyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const LogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [riskFilter, setRiskFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [reviewStatus, setReviewStatus] = useState('Pending');
  const [reviewNote, setReviewNote] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 350);

    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const loadLogs = async () => {
      setIsLoading(true);
      try {
        const result = await fetchTransactionLogs({
          page,
          limit: 10,
          risk: riskFilter,
          txType: typeFilter,
          search,
        });
        setLogs(result.items);
        setTotal(result.total);
        setTotalPages(result.total_pages || 1);
      } catch (error) {
        console.error(error);
        toast.error('Cannot load transaction logs');
      } finally {
        setIsLoading(false);
      }
    };

    loadLogs();
  }, [page, riskFilter, typeFilter, search]);

  const visibleRange = useMemo(() => {
    if (total === 0) return { from: 0, to: 0 };
    const from = (page - 1) * 10 + 1;
    const to = Math.min(page * 10, total);
    return { from, to };
  }, [page, total]);

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

  const openDetails = (log) => {
    setSelectedLog(log);
    setReviewStatus(log.reviewStatus || 'Pending');
    setReviewNote(log.reviewNote || '');
  };

  const handleReviewSave = async () => {
    if (!selectedLog) return;

    const toastId = toast.loading('Saving review...');
    try {
      await updateLogReview(selectedLog.id, { reviewStatus, reviewNote });
      toast.success('Review saved', { id: toastId });
      setLogs((current) =>
        current.map((log) =>
          log.id === selectedLog.id
            ? { ...log, reviewStatus, reviewNote }
            : log
        )
      );
      setSelectedLog((current) =>
        current ? { ...current, reviewStatus, reviewNote } : current
      );
    } catch (error) {
      console.error(error);
      toast.error('Cannot save review', { id: toastId });
    }
  };

  const handleExport = () => {
    if (logs.length === 0) {
      toast.error('No logs to export');
      return;
    }

    const header = ['Transaction ID', 'Time', 'Type', 'Amount', 'Risk Level', 'Risk Score', 'Review'];
    const rows = logs.map((log) => [
      log.transactionId,
      log.time,
      log.type,
      log.amount,
      log.riskLevel,
      log.riskScore,
      log.reviewStatus,
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'fraud-transaction-logs.csv';
    link.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  return (
    <div className="max-w-7xl mx-auto h-full flex flex-col space-y-6 pb-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Transaction Logs</h1>
        <p className="text-slate-500 mt-2">
          Monitor predictions saved from the FastAPI model service and review high-risk cases.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex flex-col lg:flex-row gap-4 justify-between items-center">
          <div className="relative w-full lg:w-96 group">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by transaction ID or type..."
              className="pl-9 pr-4 py-2 w-full border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white transition-all shadow-sm"
            />
          </div>

          <div className="flex flex-wrap gap-3 w-full lg:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <select
                value={riskFilter}
                onChange={(event) => {
                  setPage(1);
                  setRiskFilter(event.target.value);
                }}
                className="appearance-none w-full sm:w-44 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium shadow-sm cursor-pointer pr-8"
              >
                {riskOptions.map((risk) => (
                  <option key={risk} value={risk}>
                    Risk: {risk === 'all' ? 'All' : risk}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <div className="relative flex-1 sm:flex-none">
              <select
                value={typeFilter}
                onChange={(event) => {
                  setPage(1);
                  setTypeFilter(event.target.value);
                }}
                className="appearance-none w-full sm:w-44 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium shadow-sm cursor-pointer pr-8"
              >
                {typeOptions.map((type) => (
                  <option key={type} value={type}>
                    Type: {type === 'all' ? 'All' : type}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <button onClick={handleExport} className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 border border-slate-900 text-white rounded-lg hover:bg-slate-800 transition-all text-sm font-medium shadow-sm w-full sm:w-auto">
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto w-full min-h-[420px]">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-bold">Transaction</th>
                <th className="px-6 py-4 font-bold">Time</th>
                <th className="px-6 py-4 font-bold">Type</th>
                <th className="px-6 py-4 font-bold">Amount</th>
                <th className="px-6 py-4 font-bold">Risk</th>
                <th className="px-6 py-4 font-bold">Review</th>
                <th className="px-6 py-4 font-bold text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading && (
                <tr>
                  <td colSpan="7" className="px-6 py-16 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3 text-blue-600" />
                    Loading logs...
                  </td>
                </tr>
              )}

              {!isLoading && logs.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-6 py-16 text-center text-slate-500">
                    No prediction logs yet. Run an Advanced Check to create the first record.
                  </td>
                </tr>
              )}

              {!isLoading && logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-900">{log.transactionId}</div>
                    <div className="text-xs text-slate-400 mt-0.5">Model: {log.modelVersion}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-slate-600 font-medium">{log.time?.split(' ')[0] || '-'}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{log.time?.split(' ')[1] || '-'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-semibold border border-slate-200">
                      {log.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-900">
                    {moneyFormatter.format(log.amount)}
                  </td>
                  <td className="px-6 py-4">
                    {getRiskBadge(log.riskLevel)}
                    <div className="text-xs text-slate-400 mt-1">{log.riskScore.toFixed(1)}/100</div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-600">
                    {log.reviewStatus}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => openDetails(log)}
                      className="text-slate-400 hover:text-blue-600 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                      aria-label="View details"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/50">
          <div className="text-sm text-slate-500 font-medium">
            Showing <span className="font-bold text-slate-900">{visibleRange.from}</span> to{' '}
            <span className="font-bold text-slate-900">{visibleRange.to}</span> of{' '}
            <span className="font-bold text-slate-900">{total}</span> entries
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((current) => Math.max(current - 1, 1))}
              disabled={page <= 1 || isLoading}
              className="px-3.5 py-2 border border-slate-200 rounded-lg text-slate-600 disabled:text-slate-400 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors text-sm font-medium bg-white"
            >
              Previous
            </button>
            <span className="text-sm font-semibold text-slate-700 px-2">
              Page {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((current) => Math.min(current + 1, totalPages))}
              disabled={page >= totalPages || isLoading}
              className="px-3.5 py-2 border border-slate-200 rounded-lg text-slate-600 disabled:text-slate-400 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors text-sm font-medium bg-white"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {selectedLog && (
        <div className="fixed inset-0 z-40 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-200 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{selectedLog.transactionId}</h2>
                <p className="text-sm text-slate-500 mt-1">{selectedLog.time}</p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <div className="text-xs uppercase font-bold text-slate-400">Type</div>
                  <div className="mt-1 font-bold text-slate-900">{selectedLog.type}</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <div className="text-xs uppercase font-bold text-slate-400">Amount</div>
                  <div className="mt-1 font-bold text-slate-900">{moneyFormatter.format(selectedLog.amount)}</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <div className="text-xs uppercase font-bold text-slate-400">Risk Score</div>
                  <div className="mt-1 font-bold text-slate-900">{selectedLog.riskScore.toFixed(1)}/100</div>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <div className="text-xs uppercase font-bold text-slate-400">Risk Level</div>
                  <div className="mt-1">{getRiskBadge(selectedLog.riskLevel)}</div>
                </div>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 mb-3">Model explanations</h3>
                <ul className="space-y-2">
                  {selectedLog.explanations.map((item, index) => (
                    <li key={index} className="text-sm text-slate-700 bg-slate-50 border border-slate-100 rounded-lg p-3">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 mb-3">Input payload</h3>
                <pre className="text-xs bg-slate-950 text-slate-100 rounded-xl p-4 overflow-x-auto">
{JSON.stringify({
  step: selectedLog.step,
  type: selectedLog.type,
  amount: selectedLog.amount,
  oldbalanceOrg: selectedLog.oldbalanceOrg,
  newbalanceOrig: selectedLog.newbalanceOrig,
  oldbalanceDest: selectedLog.oldbalanceDest,
  newbalanceDest: selectedLog.newbalanceDest,
}, null, 2)}
                </pre>
              </div>

              <div className="border-t border-slate-200 pt-5">
                <h3 className="font-bold text-slate-900 mb-3">Admin review</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="relative">
                    <select
                      value={reviewStatus}
                      onChange={(event) => setReviewStatus(event.target.value)}
                      className="appearance-none w-full px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-medium shadow-sm cursor-pointer pr-8"
                    >
                      {reviewOptions.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                  <input
                    value={reviewNote}
                    onChange={(event) => setReviewNote(event.target.value)}
                    placeholder="Optional review note"
                    className="md:col-span-2 px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <button
                  onClick={handleReviewSave}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
                >
                  Save Review
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LogsPage;
