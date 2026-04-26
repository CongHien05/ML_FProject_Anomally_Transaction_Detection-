import React, { useState } from 'react';
import { Loader2, AlertCircle, CheckCircle, ShieldAlert } from 'lucide-react';
import { checkQuickTransaction } from '../services/mockApi';

const QuickCheckPage = () => {
  const [formData, setFormData] = useState({
    type: 'TRANSFER',
    amount: '',
    nameOrig: '',
    nameDest: ''
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error khi user type
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.type) newErrors.type = 'Vui lòng chọn loại giao dịch.';
    if (!formData.amount) {
      newErrors.amount = 'Vui lòng nhập số tiền.';
    } else if (Number(formData.amount) <= 0) {
      newErrors.amount = 'Số tiền phải lớn hơn 0.';
    }
    if (!formData.nameOrig.trim()) newErrors.nameOrig = 'Vui lòng nhập Sender ID.';
    if (!formData.nameDest.trim()) newErrors.nameDest = 'Vui lòng nhập Receiver ID.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setResult(null);

    try {
      const response = await checkQuickTransaction(formData);
      setResult(response.data);
    } catch (error) {
      console.error('Lỗi khi kiểm tra giao dịch:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function để lấy bộ màu sắc tương ứng với riskLevel
  const getRiskColorClasses = (riskLevel) => {
    switch (riskLevel) {
      case 'High':
        return {
          bg: 'bg-red-50',
          border: 'border-danger',
          text: 'text-danger',
          icon: <ShieldAlert className="w-8 h-8 text-danger" />,
          progressBg: 'bg-red-200',
          progressFill: 'bg-danger'
        };
      case 'Medium':
        return {
          bg: 'bg-amber-50',
          border: 'border-warning',
          text: 'text-warning',
          icon: <AlertCircle className="w-8 h-8 text-warning" />,
          progressBg: 'bg-amber-200',
          progressFill: 'bg-warning'
        };
      case 'Low':
      default:
        return {
          bg: 'bg-green-50',
          border: 'border-safe',
          text: 'text-safe',
          icon: <CheckCircle className="w-8 h-8 text-safe" />,
          progressBg: 'bg-green-200',
          progressFill: 'bg-safe'
        };
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 lg:p-10">
      <div className="mb-8 border-b pb-4">
        <h1 className="text-3xl font-bold text-gray-900">Quick Check</h1>
        <p className="text-gray-500 mt-2">
          Kiểm tra nhanh mức độ rủi ro gian lận của một giao dịch đơn lẻ.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Cột Form (Chiếm 5 phần) */}
        <div className="lg:col-span-5 bg-white rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-gray-100 p-6 h-fit">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Thông tin giao dịch</h2>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Type</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className={`w-full p-2.5 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all ${errors.type ? 'border-red-500 focus:ring-red-500 bg-red-50/50' : 'border-gray-200'}`}
              >
                <option value="TRANSFER">TRANSFER</option>
                <option value="CASH_OUT">CASH_OUT</option>
                <option value="CASH_IN">CASH_IN</option>
                <option value="DEBIT">DEBIT</option>
                <option value="PAYMENT">PAYMENT</option>
              </select>
              {errors.type && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.type}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                placeholder="Ví dụ: 250000"
                className={`w-full p-2.5 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all ${errors.amount ? 'border-red-500 focus:ring-red-500 bg-red-50/50' : 'border-gray-200'}`}
              />
              {errors.amount && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.amount}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sender ID (nameOrig)</label>
              <input
                type="text"
                name="nameOrig"
                value={formData.nameOrig}
                onChange={handleChange}
                placeholder="Mã tài khoản gửi (VD: C12345)"
                className={`w-full p-2.5 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all ${errors.nameOrig ? 'border-red-500 focus:ring-red-500 bg-red-50/50' : 'border-gray-200'}`}
              />
              {errors.nameOrig && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.nameOrig}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Receiver ID (nameDest)</label>
              <input
                type="text"
                name="nameDest"
                value={formData.nameDest}
                onChange={handleChange}
                placeholder="Mã tài khoản nhận (VD: M67890)"
                className={`w-full p-2.5 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all ${errors.nameDest ? 'border-red-500 focus:ring-red-500 bg-red-50/50' : 'border-gray-200'}`}
              />
              {errors.nameDest && <p className="text-red-500 text-xs mt-1.5 font-medium">{errors.nameDest}</p>}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition-all flex justify-center items-center gap-2 disabled:bg-blue-400 disabled:shadow-none disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Đang phân tích AI...</span>
                </>
              ) : (
                <span>Kiểm tra giao dịch</span>
              )}
            </button>
          </form>
        </div>

        {/* Cột Result (Chiếm 7 phần) */}
        <div className="lg:col-span-7">
          {/* Trạng thái mặc định khi chưa submit */}
          {!result && !isLoading && (
            <div className="h-full min-h-[400px] bg-white shadow-sm border border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center p-8 text-center text-gray-400">
              <ShieldAlert className="w-16 h-16 mb-4 text-gray-200" />
              <h3 className="text-lg font-medium text-gray-600 mb-1">Chưa có dữ liệu</h3>
              <p className="text-sm">Vui lòng điền thông tin vào form bên trái và bấm Kiểm tra để xem đánh giá rủi ro từ hệ thống Machine Learning.</p>
            </div>
          )}

          {/* Trạng thái đang tải */}
          {isLoading && (
            <div className="h-full min-h-[400px] bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-gray-100 rounded-xl flex flex-col items-center justify-center p-8">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
              <h3 className="text-xl font-medium text-gray-800">Mô hình AI đang suy luận...</h3>
              <p className="text-sm text-gray-500 mt-2 text-center max-w-sm">
                Quá trình này có thể mất vài giây để phân tích các đặc trưng hành vi và trích xuất điểm rủi ro.
              </p>
            </div>
          )}

          {/* Trạng thái hiển thị kết quả */}
          {result && !isLoading && (() => {
            const colors = getRiskColorClasses(result.riskLevel);
            
            return (
              <div className={`h-full min-h-[400px] rounded-xl border-2 p-8 shadow-sm transition-all duration-500 animate-in fade-in zoom-in-95 ${colors.bg} ${colors.border}`}>
                
                {/* Tiêu đề kết quả */}
                <div className="flex items-center gap-4 mb-8">
                  {colors.icon}
                  <div>
                    <h2 className={`text-3xl font-black uppercase tracking-wide ${colors.text}`}>
                      {result.riskLevel} RISK
                    </h2>
                    <p className={`text-sm font-semibold mt-1 ${colors.text} opacity-80`}>
                      {result.isFraud ? 'CẢNH BÁO: Giao dịch có dấu hiệu gian lận rõ ràng!' : 'Giao dịch hợp lệ, an toàn để duyệt.'}
                    </p>
                  </div>
                </div>

                {/* Khối Điểm số & Progress Bar */}
                <div className="bg-white/70 backdrop-blur-sm border border-white/50 rounded-xl p-6 mb-8 shadow-sm">
                  <div className="flex justify-between items-end mb-3">
                    <span className="text-gray-700 font-semibold uppercase text-sm tracking-wider">Risk Score</span>
                    <span className={`text-3xl font-black ${colors.text}`}>{result.riskScore}<span className="text-lg text-gray-400 font-medium">/100</span></span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className={`w-full h-4 rounded-full overflow-hidden ${colors.progressBg}`}>
                    <div 
                      className={`h-full ${colors.progressFill} transition-all duration-1000 ease-out`}
                      style={{ width: `${result.riskScore}%` }}
                    />
                  </div>
                  
                  <div className="mt-4 text-sm font-medium text-gray-600 flex justify-between items-center bg-white/50 py-2 px-3 rounded-md">
                    <span>Fraud Probability:</span>
                    <span className={`font-bold text-lg ${colors.text}`}>{(result.fraudProbability * 100).toFixed(1)}%</span>
                  </div>
                </div>

                {/* Khối giải thích (Explanations) */}
                <div>
                  <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-lg">
                    <AlertCircle className="w-5 h-5 text-gray-600" /> Lý do phân loại từ mô hình:
                  </h3>
                  <div className="bg-white/40 rounded-lg p-1">
                    <ul className="space-y-3">
                      {result.explanations.map((exp, index) => (
                        <li key={index} className="flex items-start gap-3 text-gray-800 font-medium p-2 hover:bg-white/50 rounded transition-colors">
                          <span className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 shadow-sm ${colors.progressFill}`} />
                          <span className="leading-relaxed">{exp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

export default QuickCheckPage;
