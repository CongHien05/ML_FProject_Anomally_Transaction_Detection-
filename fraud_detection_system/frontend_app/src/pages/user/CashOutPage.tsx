import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, KeyRound, ShieldAlert, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import { createTransaction, getCurrentUser, verifyTransactionOtp } from '../../services/api';
import { formatVnd, formatVndInput, getStoredUser, parseVndAmount, saveUser } from '../../services/auth';

interface TransactionDecision {
  transaction_id: number;
  status: string;
  risk_score: number;
  risk_level: string;
  explanations: string[];
}

export const CashOutPage = () => {
  const [user, setUser] = useState(() => getStoredUser());
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [decision, setDecision] = useState<TransactionDecision | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);

  const refreshUser = async () => {
    const freshUser = await getCurrentUser();
    saveUser(freshUser);
    setUser(freshUser);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const numericAmount = parseVndAmount(amount);

    if (!numericAmount || numericAmount <= 0) {
      setError('Vui lòng nhập số tiền hợp lệ');
      return;
    }

    if (Number(user?.balance || 0) < numericAmount) {
      setError(`Số dư không đủ. Hiện có: ${formatVnd(user?.balance || 0)}`);
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
        toast.error('Cảnh báo gian lận: giao dịch bị chặn và chuyển sang xét duyệt.');
      } else if (result.status === 'PENDING') {
        toast('Cần xác minh OTP để hoàn tất.', { icon: '!' });
      } else {
        toast.success('Rút tiền thành công.');
        await refreshUser();
      }
    } catch (err: unknown) {
      setError((err as Error).message || 'Rút tiền thất bại');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpVerify = async () => {
    if (!decision?.transaction_id || !otpCode.trim()) {
      setError('Vui lòng nhập mã OTP');
      return;
    }

    setOtpLoading(true);
    setError('');

    try {
      const verified = await verifyTransactionOtp({
        transactionId: decision.transaction_id,
        phoneNumber: '',
        otpCode,
      });
      setDecision(verified);
      toast.success('Xác minh OTP thành công. Rút tiền hoàn tất.');
      await refreshUser();
    } catch (err: unknown) {
      setError((err as Error).message || 'Xác minh OTP thất bại');
    } finally {
      setOtpLoading(false);
    }
  };

  const isBlocked = decision?.status === 'BLOCKED';
  const isPending = decision?.status === 'PENDING';

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Rút Tiền</h1>
        <p className="text-gray-500 text-sm mt-1">Mỗi giao dịch đều được kiểm tra bảo mật trước khi thực hiện.</p>
      </div>

      {decision && (
        <div className={`rounded-2xl border shadow-sm overflow-hidden ${
          isBlocked ? 'border-rose-200'
          : isPending ? 'border-amber-200'
          : 'border-emerald-200'
        }`}>
          {/* Header */}
          <div className={`flex items-center gap-3 px-4 py-3 ${
            isBlocked ? 'bg-rose-50' : isPending ? 'bg-amber-50' : 'bg-emerald-50'
          }`}>
            <div className={`rounded-xl p-2 ${
              isBlocked ? 'bg-rose-100 text-rose-600'
              : isPending ? 'bg-amber-100 text-amber-600'
              : 'bg-emerald-100 text-emerald-600'
            }`}>
              {isBlocked ? <ShieldAlert className="h-5 w-5" />
                : isPending ? <KeyRound className="h-5 w-5" />
                : <CheckCircle2 className="h-5 w-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-bold ${
                isBlocked ? 'text-rose-800' : isPending ? 'text-amber-800' : 'text-emerald-800'
              }`}>
                {isBlocked ? 'Giao dịch bị tạm giữ để xét duyệt'
                  : isPending ? 'Cần xác minh OTP để hoàn tất'
                  : 'Rút tiền thành công'}
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
              Tiền <strong>chưa bị trừ</strong>. Nhập mã OTP để xác nhận rút tiền.
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

          {/* OTP input */}
          {isPending && (
            <div className="px-4 py-3 bg-amber-50 border-t border-amber-200">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(event) => setOtpCode(event.target.value)}
                    className="w-full rounded-xl border border-amber-200 bg-white py-3 pl-9 pr-3 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="Mã OTP 6 chữ số"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleOtpVerify}
                  disabled={otpLoading}
                  className="rounded-xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  {otpLoading ? 'Đang xác minh...' : 'Xác nhận'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Số dư khả dụng</p>
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
              Số tiền rút
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
              Ghi chú (Tùy chọn)
            </label>
            <input
              id="note"
              type="text"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Lý do rút tiền..."
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
                Đang kiểm tra...
              </span>
            ) : (
              <span className="flex items-center">
                <Wallet className="mr-2 h-5 w-5" />
                Xác nhận Rút Tiền
              </span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
