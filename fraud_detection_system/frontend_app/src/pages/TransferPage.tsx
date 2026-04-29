import React, { useState } from 'react';
import { Send, AlertCircle, Search, ShieldAlert, CheckCircle2, KeyRound, Smartphone } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  createTransaction,
  getCurrentUser,
  searchUserByUsername,
  verifyTransactionOtp,
  requestTransactionOtp,
} from '../services/api';
import { formatVnd, formatVndInput, getStoredUser, parseVndAmount, saveUser } from '../services/auth';

export const TransferPage = () => {
  const [currentUser, setCurrentUser] = useState(() => getStoredUser());
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [error, setError] = useState('');
  const [recipientInfo, setRecipientInfo] = useState(null);
  const [searchingRecipient, setSearchingRecipient] = useState(false);
  const [decision, setDecision] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [showPhoneVerification, setShowPhoneVerification] = useState(false);
  const [formData, setFormData] = useState({
    recipient: '',
    amount: '',
    note: '',
  });

  const refreshCurrentUser = async () => {
    const freshUser = await getCurrentUser();
    saveUser(freshUser);
    setCurrentUser(freshUser);
  };

  if (!currentUser) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-600">Please log in first</p>
      </div>
    );
  }

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: id === 'amount' ? formatVndInput(value) : value,
    }));
    setError('');
    setDecision(null);
  };

  const handleUseMaxAmount = () => {
    setFormData((prev) => ({
      ...prev,
      amount: formatVndInput(currentUser.balance || 0),
    }));
    setError('');
    setDecision(null);
  };

  const handleSearchRecipient = async () => {
    if (!formData.recipient.trim()) {
      setError('Please enter recipient username');
      return;
    }

    setSearchingRecipient(true);
    setError('');
    setDecision(null);
    try {
      const result = await searchUserByUsername(formData.recipient);
      if (result.account_id === currentUser.account_id) {
        setRecipientInfo(null);
        setError('You cannot transfer to your own account');
        return;
      }
      setRecipientInfo(result);
      setError('');
    } catch (err) {
      setError(err.message || 'Recipient not found');
      setRecipientInfo(null);
    } finally {
      setSearchingRecipient(false);
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();

    if (!formData.recipient.trim()) {
      setError('Please enter recipient name');
      return;
    }
    if (!recipientInfo) {
      setError('Please search and select a valid recipient');
      return;
    }
    const amount = parseVndAmount(formData.amount);
    if (!formData.amount || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (Number(currentUser.balance) < amount) {
      setError(`Insufficient balance. Available: ${formatVnd(currentUser.balance)}, needed: ${formatVnd(amount)}`);
      return;
    }

    setLoading(true);
    setError('');
    setDecision(null);

    try {
      const txnResponse = await createTransaction({
        from_account_id: currentUser.account_id,
        to_account_id: recipientInfo.account_id,
        amount,
        type: 'TRANSFER',
        note: formData.note,
      });

      setDecision(txnResponse);

      if (txnResponse.status === 'BLOCKED') {
        toast.error('Fraud alert: transfer blocked and sent to admin review.');
      } else if (txnResponse.status === 'PENDING') {
        toast('OTP required before this transfer can be completed.', { icon: '!' });
        setPhoneNumber(currentUser.phone_number || '');
        setShowPhoneVerification(true);
      } else {
        toast.success('Transfer completed.');
        await refreshCurrentUser();
      }
    } catch (err) {
      setError(err.message || 'Transfer failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOtp = async () => {
    if (!phoneNumber.trim()) {
      setError('Please enter your phone number');
      return;
    }

    setOtpLoading(true);
    setError('');

    try {
      await requestTransactionOtp(phoneNumber);
      toast('OTP sent to your phone number.', { icon: '📱' });
      setPhoneOtpSent(true);
    } catch (err) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleOtpVerify = async () => {
    if (!decision?.transaction_id || !otpCode.trim()) {
      setError('Please enter the OTP code');
      return;
    }

    if (!phoneNumber.trim()) {
      setError('Please enter your phone number');
      return;
    }

    setOtpLoading(true);
    setError('');

    try {
      const verified = await verifyTransactionOtp({
        transactionId: decision.transaction_id,
        phoneNumber,
        otpCode,
      });
      setDecision(verified);
      toast.success('OTP verified. Transfer completed.');
      await refreshCurrentUser();
      setShowPhoneVerification(false);
      setPhoneNumber('');
      setOtpCode('');
      setPhoneOtpSent(false);
    } catch (err) {
      setError(err.message || 'OTP verification failed');
    } finally {
      setOtpLoading(false);
    }
  };

  const isBlocked = decision?.status === 'BLOCKED';
  const isPending = decision?.status === 'PENDING';
  const isCompleted = decision?.status === 'COMPLETED';

  return (
    <div className="max-w-md mx-auto py-8">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Send className="w-8 h-8 text-indigo-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Transfer Money</h1>
        <p className="text-slate-500 text-sm mt-2">Every transfer is screened before funds move.</p>
        <p className="text-slate-600 text-xs mt-3">
          Your balance: <span className="font-semibold text-slate-900">{formatVnd(currentUser.balance || 0)}</span>
        </p>
      </div>

      {decision && (
        <div
          className={`mb-5 rounded-2xl border p-4 shadow-sm ${
            isBlocked
              ? 'border-rose-200 bg-rose-50'
              : isPending
                ? 'border-amber-200 bg-amber-50'
                : 'border-emerald-200 bg-emerald-50'
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`mt-0.5 rounded-xl p-2 ${
                isBlocked
                  ? 'bg-rose-100 text-rose-700'
                  : isPending
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              {isBlocked ? <ShieldAlert className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900">
                {isBlocked
                  ? 'Fraud alert: transfer blocked'
                  : isPending
                    ? 'Extra verification required'
                    : 'Transfer completed'}
              </h3>
              <p className="mt-1 text-sm text-slate-700">
                Transaction #{decision.transaction_id} is {decision.status}. Risk: {decision.risk_level} (
                {Number(decision.risk_score).toFixed(2)}/100).
              </p>
              {isBlocked && (
                <p className="mt-2 text-sm font-medium text-rose-700">
                  Funds were not deducted. Admin has been alerted and can approve, reject, freeze the account, or ban the user.
                </p>
              )}
              {isPending && (
                <p className="mt-2 text-sm font-medium text-amber-700">
                  Funds were not deducted yet. Complete OTP verification before the transfer can move.
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

          {isPending && showPhoneVerification && (
            <div className="mt-4 space-y-3">
              {!phoneOtpSent ? (
                <>
                  <div className="text-sm font-medium text-slate-700 mb-2">Enter your phone number to receive OTP</div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Smartphone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="w-full rounded-xl border border-amber-200 bg-white py-3 pl-9 pr-3 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        placeholder="Phone number"
                      />
                    </div>
                  </div>
               <button
                  type="button"
                  onClick={handleRequestOtp}
                  disabled={otpLoading}
                  className="w-full rounded-xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  {otpLoading ? 'Sending...' : 'Send OTP to Phone'}
                </button>
                </>
              ) : (
                <>
                  <div className="text-sm font-medium text-slate-700 mb-2">
                    Enter OTP code sent to {phoneNumber}
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.slice(0, 6))}
                        className="w-full rounded-xl border border-amber-200 bg-white py-3 pl-9 pr-3 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        placeholder="000000"
                        maxLength="6"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleOtpVerify}
                      disabled={otpLoading}
                      className="rounded-xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                    >
                      {otpLoading ? 'Verifying' : 'Verify'}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPhoneOtpSent(false)}
                    className="w-full text-sm text-slate-600 hover:text-slate-700"
                  >
                    Change phone number
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form className="space-y-6" onSubmit={handleTransfer}>
          <div className="space-y-4">
            <div>
              <label htmlFor="recipient" className="block text-sm font-medium text-slate-700 mb-1.5">
                Recipient Username
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  id="recipient"
                  value={formData.recipient}
                  onChange={handleInputChange}
                  disabled={loading || searchingRecipient}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none transition-all duration-200 ease-out disabled:opacity-50"
                  placeholder="username"
                />
                <button
                  type="button"
                  onClick={handleSearchRecipient}
                  disabled={loading || searchingRecipient || !formData.recipient.trim()}
                  className="px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {searchingRecipient ? (
                    <div className="animate-spin w-5 h-5 border-2 border-slate-400 border-t-slate-700 rounded-full" />
                  ) : (
                    <Search className="w-5 h-5" />
                  )}
                </button>
              </div>
              {recipientInfo && (
                <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
                  <p className="text-green-700 font-medium">{recipientInfo.full_name}</p>
                  <p className="text-green-600 text-xs">Balance: {formatVnd(recipientInfo.balance)}</p>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-slate-700 mb-1.5">
                Amount
              </label>
              <input
                type="text"
                inputMode="numeric"
                id="amount"
                value={formData.amount}
                onChange={handleInputChange}
                disabled={loading}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none transition-all duration-200 ease-out text-lg font-semibold disabled:opacity-50"
                placeholder="0"
              />
              <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <span>Transfer amount: {formatVnd(parseVndAmount(formData.amount))}</span>
                <button
                  type="button"
                  onClick={handleUseMaxAmount}
                  disabled={loading}
                  className="font-semibold text-indigo-600 hover:text-indigo-700 disabled:opacity-50"
                >
                  Max
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="note" className="block text-sm font-medium text-slate-700 mb-1.5">
                Note (Optional)
              </label>
              <input
                type="text"
                id="note"
                value={formData.note}
                onChange={handleInputChange}
                disabled={loading}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none transition-all duration-200 ease-out disabled:opacity-50"
                placeholder="What's this for?"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || !recipientInfo || isCompleted}
              className="w-full flex items-center justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 ease-out active:scale-[0.98] group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin mr-2 w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Processing...
                </>
              ) : (
                <>
                  <Send className="mr-2 w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  Send Money
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransferPage;
