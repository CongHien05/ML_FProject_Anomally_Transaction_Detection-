import React, { useState } from 'react';

interface RecipientInfo {
  user_id: number;
  account_id: number;
  username: string;
  full_name: string;
}

interface TransactionDecision {
  transaction_id: number;
  status: string;
  risk_score: number;
  risk_level: string;
  explanations: string[];
}

interface StoredUser {
  account_id: number;
  balance: number;
  phone_number?: string;
  full_name?: string;
  username?: string;
  role?: string;
}
import { Send, AlertCircle, Search, ShieldAlert, CheckCircle2, KeyRound, Smartphone } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  createTransaction,
  getCurrentUser,
  searchUserByUsername,
  verifyTransactionOtp,
  requestTransactionOtp,
} from '../../services/api';
import { formatVnd, formatVndInput, getStoredUser, parseVndAmount, saveUser } from '../../services/auth';

export const TransferPage = () => {
  const [currentUser, setCurrentUser] = useState(() => getStoredUser());
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [error, setError] = useState('');
  const [recipientInfo, setRecipientInfo] = useState<RecipientInfo | null>(null);
  const [searchingRecipient, setSearchingRecipient] = useState(false);
  const [decision, setDecision] = useState<TransactionDecision | null>(null);
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    } catch (err: unknown) {
      setError((err as Error).message || 'Không tìm thấy người nhận');
      setRecipientInfo(null);
    } finally {
      setSearchingRecipient(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
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
    } catch (err: unknown) {
      setError((err as Error).message || 'Chuyển tiền thất bại. Vui lòng thử lại.');
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
    } catch (err: unknown) {
      setError((err as Error).message || 'Gửi OTP thất bại');
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
    } catch (err: unknown) {
      setError((err as Error).message || 'Xác minh OTP thất bại');
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
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Chuyển Tiền</h1>
        <p className="text-slate-500 text-sm mt-2">Mỗi giao dịch đều được kiểm tra trước khi thực hiện.</p>
        <p className="text-slate-600 text-xs mt-3">
          Số dư: <span className="font-semibold text-slate-900">{formatVnd(currentUser.balance || 0)}</span>
        </p>
      </div>

      {decision && (
        <div
          className={`mb-5 rounded-2xl border shadow-sm overflow-hidden ${
            isBlocked
              ? 'border-rose-200'
              : isPending
                ? 'border-amber-200'
                : 'border-emerald-200'
          }`}
        >
          {/* Header */}
          <div className={`flex items-center gap-3 px-4 py-3 ${
            isBlocked ? 'bg-rose-50' : isPending ? 'bg-amber-50' : 'bg-emerald-50'
          }`}>
            <div className={`rounded-xl p-2 ${
              isBlocked ? 'bg-rose-100 text-rose-600'
              : isPending ? 'bg-amber-100 text-amber-600'
              : 'bg-emerald-100 text-emerald-600'
            }`}>
              {isBlocked ? <ShieldAlert className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-bold ${
                isBlocked ? 'text-rose-800' : isPending ? 'text-amber-800' : 'text-emerald-800'
              }`}>
                {isBlocked ? 'Giao dịch bị tạm giữ để xét duyệt'
                  : isPending ? 'Cần xác minh OTP để hoàn tất'
                  : 'Chuyển tiền thành công'}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Mã GD #{decision.transaction_id}</p>
            </div>
            {/* Risk badge */}
            <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-bold ${
              decision.risk_level === 'CRITICAL' ? 'bg-red-100 text-red-700'
              : decision.risk_level === 'HIGH' ? 'bg-orange-100 text-orange-700'
              : decision.risk_level === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700'
              : 'bg-green-100 text-green-700'
            }`}>
              {decision.risk_level === 'CRITICAL' ? '⚠ Rất cao'
                : decision.risk_level === 'HIGH' ? '⚠ Cao'
                : decision.risk_level === 'MEDIUM' ? '⚠ Trung bình'
                : '✓ Thấp'}
            </span>
          </div>

          {/* Status notice */}
          {isBlocked && (
            <div className="px-4 py-2.5 bg-rose-100/60 border-t border-rose-200 text-sm text-rose-800">
              Tiền <strong>chưa bị trừ</strong>. Quản trị viên sẽ xem xét và phản hồi sớm nhất.
            </div>
          )}
          {isPending && (
            <div className="px-4 py-2.5 bg-amber-100/60 border-t border-amber-200 text-sm text-amber-800">
              Tiền <strong>chưa bị trừ</strong>. Nhập mã OTP bên dưới để xác nhận giao dịch.
            </div>
          )}

          {/* Explanations */}
          {decision.explanations?.length > 0 && (
            <div className="px-4 py-3 bg-white border-t border-slate-100">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-2">
                Lý do hệ thống kiểm tra
              </p>
              <ul className="space-y-1.5">
                {decision.explanations.map((item, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${
                      isBlocked ? 'bg-rose-400' : isPending ? 'bg-amber-400' : 'bg-emerald-400'
                    }`} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {isPending && showPhoneVerification && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-3">
          <p className="text-sm font-semibold text-amber-800">Xác minh danh tính qua OTP</p>
          {!phoneOtpSent ? (
            <>
              <div className="text-sm text-amber-700">Nhập số điện thoại để nhận mã OTP</div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Smartphone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full rounded-xl border border-amber-200 bg-white py-3 pl-9 pr-3 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="Số điện thoại"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleRequestOtp}
                disabled={otpLoading}
                className="w-full rounded-xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {otpLoading ? 'Đang gửi...' : 'Gửi mã OTP'}
              </button>
            </>
          ) : (
            <>
              <div className="text-sm text-amber-700">
                Nhập mã OTP đã gửi đến <strong>{phoneNumber}</strong>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.slice(0, 6))}
                    className="w-full rounded-xl border border-amber-200 bg-white py-3 pl-9 pr-3 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="Mã OTP 6 chữ số"
                    maxLength={6}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleOtpVerify}
                  disabled={otpLoading}
                  className="rounded-xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  {otpLoading ? 'Đang xác minh' : 'Xác nhận'}
                </button>
              </div>
              <button
                type="button"
                onClick={() => setPhoneOtpSent(false)}
                className="w-full text-sm text-slate-600 hover:text-slate-700"
              >
                Đổi số điện thoại
              </button>
            </>
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
                Tên người nhận
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  id="recipient"
                  value={formData.recipient}
                  onChange={handleInputChange}
                  disabled={loading || searchingRecipient}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none transition-all duration-200 ease-out disabled:opacity-50"
                  placeholder="Tên đăng nhập"
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
                <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="text-green-700 font-medium">{recipientInfo.full_name}</p>
                    <p className="text-green-600 text-xs">@{recipientInfo.username} · Tài khoản hợp lệ</p>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-slate-700 mb-1.5">
                Số tiền
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
                <span>Số tiền chuyển: {formatVnd(parseVndAmount(formData.amount))}</span>
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
                Ghi chú (Tùy chọn)
              </label>
              <input
                type="text"
                id="note"
                value={formData.note}
                onChange={handleInputChange}
                disabled={loading}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none transition-all duration-200 ease-out disabled:opacity-50"
                placeholder="Nội dung chuyển tiền..."
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
                  Đang xử lý...
                </>
              ) : (
                <>
                  <Send className="mr-2 w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  Chuyển Tiền
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
