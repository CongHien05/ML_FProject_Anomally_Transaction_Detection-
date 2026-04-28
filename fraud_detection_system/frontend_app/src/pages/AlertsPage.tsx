import React from 'react';
import { AlertTriangle, Clock, Sparkles, ChevronRight } from 'lucide-react';
import { StatusBadge, StatusType } from '../components/ui/StatusBadge';

interface AlertItem {
  id: string;
  title: string;
  description: string;
  time: string;
  risk: StatusType;
  hasAiAnalysis?: boolean;
}

const mockAlerts: AlertItem[] = [
  { id: 'ALT-091', title: 'Unusual Login Location', description: 'User accessed account from IP associated with high-risk proxy.', time: '10 mins ago', risk: 'HIGH', hasAiAnalysis: true },
  { id: 'ALT-089', title: 'Velocity Limit Exceeded', description: '5 transfers initiated within 60 seconds to new recipient.', time: '1 hr ago', risk: 'CRITICAL', hasAiAnalysis: true },
  { id: 'ALT-088', title: 'Device Fingerprint Mismatch', description: 'Login successful but device signature completely differs from history.', time: '2 hrs ago', risk: 'MEDIUM' },
  { id: 'ALT-085', title: 'Suspicious Amount', description: 'Transfer amount of $9,999.00 exactly just below reporting threshold.', time: '4 hrs ago', risk: 'HIGH' },
];

export const AlertsPage = () => {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Triage Inbox</h1>
          <p className="text-slate-500 text-sm mt-1">Review and resolve system security alerts.</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-xl shadow-sm hover:bg-slate-50 transition-colors">
            Filter
          </button>
          <button className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl shadow-sm hover:bg-indigo-700 transition-colors">
            Resolve All
          </button>
        </div>
      </div>
      
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[600px]">
        {/* Inbox List */}
        <div className="w-full md:w-1/2 lg:w-2/5 border-r border-slate-200 overflow-y-auto">
          <div className="divide-y divide-slate-100">
            {mockAlerts.map((alert, idx) => (
              <div 
                key={alert.id} 
                className={`p-5 cursor-pointer transition-all duration-200 ease-out hover:bg-slate-50 group ${idx === 1 ? 'bg-indigo-50/30' : ''}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <StatusBadge status={alert.risk} />
                  <div className="flex items-center text-xs text-slate-400">
                    <Clock className="w-3.5 h-3.5 mr-1" />
                    {alert.time}
                  </div>
                </div>
                <h4 className={`font-semibold tracking-tight text-sm mb-1 ${idx === 1 ? 'text-indigo-900' : 'text-slate-900'}`}>
                  {alert.title}
                </h4>
                <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed">
                  {alert.description}
                </p>
                {alert.hasAiAnalysis && (
                  <div className="mt-3 inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs font-medium border border-indigo-100">
                    <Sparkles className="w-3 h-3" />
                    AI Analysis Ready
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Detail Panel */}
        <div className="w-full md:w-1/2 lg:w-3/5 bg-slate-50 p-6 flex flex-col">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex-1">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">Velocity Limit Exceeded</h2>
                <p className="text-sm text-slate-500 font-mono mt-0.5">ALT-089 • User: U-9281X</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2 text-indigo-800 font-semibold text-sm">
                  <Sparkles className="w-4 h-4" />
                  AI Risk Assessment
                </div>
                <p className="text-sm text-indigo-900/80 leading-relaxed">
                  The model flagged this with <strong>94% confidence</strong>. The velocity of 5 transfers within 60 seconds deviates significantly from this user's historical baseline. The destination account was created less than 24 hours ago.
                </p>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-900 mb-3">Action Required</h4>
                <div className="flex flex-col gap-2">
                  <button className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 transition-all text-sm font-medium text-slate-700 group">
                    <span>Block Account & Reverse</span>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                  </button>
                  <button className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 transition-all text-sm font-medium text-slate-700 group">
                    <span>Require Step-Up Auth (MFA)</span>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                  </button>
                  <button className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all text-sm font-medium text-slate-500 group">
                    <span>Dismiss Alert (False Positive)</span>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
