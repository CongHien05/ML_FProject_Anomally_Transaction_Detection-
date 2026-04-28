import React from 'react';
import { Send, ArrowRight } from 'lucide-react';

export const TransferPage = () => {
  return (
    <div className="max-w-md mx-auto py-8">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Send className="w-8 h-8 text-indigo-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Transfer Money</h1>
        <p className="text-slate-500 text-sm mt-2">Send funds securely to anyone, anywhere.</p>
      </div>
      
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
          <div className="space-y-4">
            <div>
              <label htmlFor="recipient" className="block text-sm font-medium text-slate-700 mb-1.5">
                Recipient
              </label>
              <input
                type="text"
                id="recipient"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none transition-all duration-200 ease-out"
                placeholder="Name, @username, or Email"
              />
            </div>
            
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-slate-700 mb-1.5">
                Amount
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="text-slate-500 font-medium">$</span>
                </div>
                <input
                  type="number"
                  id="amount"
                  className="w-full pl-8 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none transition-all duration-200 ease-out text-lg font-semibold"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label htmlFor="note" className="block text-sm font-medium text-slate-700 mb-1.5">
                Note (Optional)
              </label>
              <input
                type="text"
                id="note"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none transition-all duration-200 ease-out"
                placeholder="What's this for?"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              className="w-full flex items-center justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 ease-out active:scale-[0.98] group"
            >
              Review Transfer
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
