import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, KeyRound, ShieldAlert, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import { createTransaction, getCurrentUser, verifyTransactionOtp } from '../services/api';
import { formatVnd, formatVndInput, getStoredUser, parseVndAmount, saveUser } from '../services/auth';

export const CashOutPage = () => {
  const [user, setUser] = useState(() => getStoredUser());
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [decision, setDecision] = useState(null);
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);

  const refreshUser = async () => {
    const freshUser = await getCurrentUser();
    saveUser(freshUser);
    setUser(freshUser);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const numericAmount = parseVndAmount(amount);

    if (!numericAmount || numericAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (Number(user?.balance || 0) < numericAmount) {
      setError(`Insufficient balance. Available: ${formatVnd(user?.balance || 0)}`);
      return;
    }

    setIsLoading(true);
    setError('');
    setDecision(null);

    try {
      const result = await createTransaction({
        from_account_id: user.account_id,
        amount: numericAmount,
        type: 'CASH_OUT',
        note,
      });
      setDecision(result);

      if (result.status === 'BLOCKED') {
        toast.error('Fraud alert: cash-out blocked and sent to admin review.');
      } else if (result.status === 'PENDING') {
        toast('Cash-out is pending OTP review.', { icon: '!' });
      } else {
        toast.success('Cash-out completed.');
        await refreshUser();
      }
    } catch (err) {
      setError(err.message || 'Cash-out failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpVerify = async () => {
    if (!decision?.transaction_id || !otpCode.trim()) {
      setError('Please enter the OTP code');
      return;
    }

    setOtpLoading(true);
    setError('');

    try {
      const verified = await verifyTransactionOtp({
        transactionId: decision.transaction_id,
        otpCode,
      });
      setDecision(verified);
      toast.success('OTP verified. Cash-out completed.');
      await refreshUser();
    } catch (err) {
      setError(err.message || 'OTP verification failed');
    } finally {
      setOtpLoading(false);
    }
  };

  const isBlocked = decision?.status === 'BLOCKED';
  const isPending = decision?.status === 'PENDING';

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Cash Out</h1>
        <p className="text-gray-500 text-sm mt-1">Withdraw funds with the same fraud screening flow.</p>
      </div>

      {decision && (
        <div
          className={`rounded-2xl border p-4 shadow-sm ${
            isBlocked
              ? 'border-rose-200 bg-rose-50'
              : isPending
                ? 'border-amber-200 bg-amber-50'
                : 'border-emerald-200 bg-emerald-50'
          }`}
        >
          <div className="flex items-start gap-3">
            {isBlocked ? (
              <ShieldAlert className="mt-0.5 h-5 w-5 text-rose-600" />
            ) : isPending ? (
              <KeyRound className="mt-0.5 h-5 w-5 text-amber-600" />
            ) : (
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
            )}
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {isBlocked ? 'Fraud alert: cash-out blocked' : `Cash-out ${decision.status.toLowerCase()}`}
              </h3>
              <p className="mt-1 text-sm text-slate-700">
                Transaction #{decision.transaction_id} risk: {decision.risk_level} ({Number(decision.risk_score).toFixed(2)}/100)
              </p>
              {(isBlocked || isPending) && (
                <p className={`mt-2 text-sm font-medium ${isBlocked ? 'text-rose-700' : 'text-amber-700'}`}>
                  Funds were not deducted yet.
                </p>
              )}
              <ul className="mt-3 space-y-1.5">
                {decision.explanations?.map((item, index) => (
                  <li key={index} className="text-xs leading-relaxed text-slate-600">
                    - {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          {isPending && (
            <div className="mt-4 flex gap-2">
              <div className="relative flex-1">
                <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={otpCode}
                  onChange={(event) => setOtpCode(event.target.value)}
                  className="w-full rounded-xl border border-amber-200 bg-white py-3 pl-9 pr-3 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="OTP code"
                />
              </div>
              <button
                type="button"
                onClick={handleOtpVerify}
                disabled={otpLoading}
                className="rounded-xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {otpLoading ? 'Checking' : 'Verify'}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Available Balance</p>
          <p className="mt-1 text-xl font-bold text-slate-900">{formatVnd(user?.balance || 0)}</p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700">
            <AlertCircle className="mr-2 inline h-4 w-4" />
            {error}
          </div>
        )}

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-slate-700 mb-1.5">
              Amount
            </label>
            <input
              id="amount"
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={(event) => {
                setAmount(formatVndInput(event.target.value));
                setDecision(null);
                setError('');
              }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-lg font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="0"
            />
          </div>

          <div>
            <label htmlFor="note" className="block text-sm font-medium text-slate-700 mb-1.5">
              Note (Optional)
            </label>
            <input
              id="note"
              type="text"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Withdrawal reason"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="flex w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            {isLoading ? (
              <span className="flex items-center">
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Screening cash-out...
              </span>
            ) : (
              <span className="flex items-center">
                <Wallet className="mr-2 h-5 w-5" />
                Request Cash Out
              </span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
