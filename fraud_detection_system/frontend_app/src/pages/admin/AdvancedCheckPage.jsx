import React, { useState } from 'react';
import { Loader2, AlertCircle, CheckCircle, ShieldAlert, TerminalSquare, Database, Activity } from 'lucide-react';
import { checkAdvancedTransaction } from '../../services/mockApi';
import toast from 'react-hot-toast';
const AdvancedCheckPage = () => {
  const [formData, setFormData] = useState({
    step: '1',
    type: 'TRANSFER',
    amount: '',
    oldbalanceOrg: '',
    newbalanceOrig: '',
    oldbalanceDest: '',
    newbalanceDest: ''
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    const numericFields = {
      step: 'Step (Giờ)',
      amount: 'Amount',
      oldbalanceOrg: 'Old Balance Orig',
      newbalanceOrig: 'New Balance Orig',
      oldbalanceDest: 'Old Balance Dest',
      newbalanceDest: 'New Balance Dest'
    };
    
    if (!formData.type) newErrors.type = 'Vui lòng chọn loại giao dịch.';
    
    Object.keys(numericFields).forEach(field => {
      if (formData[field] === '') {
        newErrors[field] = 'Bắt buộc nhập.';
      } else if (Number(formData[field]) < 0) {
        newErrors[field] = 'Không được âm.';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setResult(null);

    try {
      const response = await checkAdvancedTransaction(formData);
      setResult(response.data);
      
      if (response.data.riskLevel === 'High') {
        toast.error('Phát hiện rủi ro cao!', { duration: 4000 });
      } else if (response.data.riskLevel === 'Low') {
        toast.success('Giao dịch an toàn!');
      } else {
        toast('Giao dịch cần lưu ý', { icon: '⚠️' });
      }
    } catch (error) {
      console.error('Lỗi khi kiểm tra giao dịch:', error);
      toast.error('Lỗi kết nối tới Server AI!');
    } finally {
      setIsLoading(false);
    }
  };

  const getRiskColorClasses = (riskLevel) => {
    switch (riskLevel) {
      case 'High':
        return {
          bg: 'bg-red-50',
          border: 'border-danger',
          text: 'text-danger',
          icon: <ShieldAlert className="w-8 h-8 text-danger" />,
          progressBg: 'bg-red-200',
          progressFill: 'bg-danger',
          codeBg: 'bg-red-900/5'
        };
      case 'Medium':
        return {
          bg: 'bg-amber-50',
          border: 'border-warning',
          text: 'text-warning',
          icon: <AlertCircle className="w-8 h-8 text-warning" />,
          progressBg: 'bg-amber-200',
          progressFill: 'bg-warning',
          codeBg: 'bg-amber-900/5'
        };
      case 'Low':
      default:
        return {
          bg: 'bg-green-50',
          border: 'border-safe',
          text: 'text-safe',
          icon: <CheckCircle className="w-8 h-8 text-safe" />,
          progressBg: 'bg-green-200',
          progressFill: 'bg-safe',
          codeBg: 'bg-green-900/5'
        };
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-10">
      <div className="mb-8 border-b pb-4">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Database className="w-8 h-8 text-blue-600" />
          Advanced Check
        </h1>
        <p className="text-gray-500 mt-2">
          Giao diện Debug/Test mô hình Machine Learning dành cho Kỹ thuật viên & Quản trị viên. 
          Yêu cầu nhập đầy đủ 7 tham số của tập dữ liệu PaySim.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Cột Form (Chiếm 5 phần) */}
        <div className="lg:col-span-5 bg-white rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-gray-100 p-6 h-fit">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <TerminalSquare className="w-5 h-5 text-gray-500" />
              Tham số đầu vào (Features)
            </h2>
          </div>

          {/* Demo Scenarios */}
          <div className="mb-6 bg-slate-50 rounded-lg p-3 border border-slate-100">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">Demo Scenarios</div>
            <div className="flex flex-wrap gap-2">
              <button 
                type="button" 
                onClick={() => {
                  setFormData({ step: '1', type: 'TRANSFER', amount: '500000', oldbalanceOrg: '500000', newbalanceOrig: '0', oldbalanceDest: '0', newbalanceDest: '0' });
                  setErrors({});
                }}
                className="text-xs font-medium px-2.5 py-1.5 border border-rose-200 text-rose-600 bg-white hover:bg-rose-50 rounded transition-colors"
              >
                Rút cạn tài khoản
              </button>
              <button 
                type="button" 
                onClick={() => {
                  setFormData({ step: '1', type: 'PAYMENT', amount: '1500', oldbalanceOrg: '20000', newbalanceOrig: '18500', oldbalanceDest: '0', newbalanceDest: '0' });
                  setErrors({});
                }}
                className="text-xs font-medium px-2.5 py-1.5 border border-emerald-200 text-emerald-600 bg-white hover:bg-emerald-50 rounded transition-colors"
              >
                Chuyển hợp lệ
              </button>
              <button 
                type="button" 
                onClick={() => {
                  setFormData({ step: '1', type: 'CASH_OUT', amount: '850000', oldbalanceOrg: '850000', newbalanceOrig: '0', oldbalanceDest: '100000', newbalanceDest: '100000' });
                  setErrors({});
                }}
                className="text-xs font-medium px-2.5 py-1.5 border border-amber-200 text-amber-600 bg-white hover:bg-amber-50 rounded transition-colors"
              >
                Lệch số dư đích
              </button>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Step (Giờ)</label>
                <input
                  type="number"
                  name="step"
                  value={formData.step}
                  onChange={handleChange}
                  className={`w-full p-2.5 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all ${errors.step ? 'border-red-500 bg-red-50/50' : 'border-gray-200'}`}
                />
                {errors.step && <p className="text-red-500 text-xs mt-1 font-medium">{errors.step}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className={`w-full p-2.5 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all ${errors.type ? 'border-red-500 bg-red-50/50' : 'border-gray-200'}`}
                >
                  <option value="TRANSFER">TRANSFER</option>
                  <option value="CASH_OUT">CASH_OUT</option>
                  <option value="CASH_IN">CASH_IN</option>
                  <option value="DEBIT">DEBIT</option>
                  <option value="PAYMENT">PAYMENT</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                className={`w-full p-2.5 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all ${errors.amount ? 'border-red-500 bg-red-50/50' : 'border-gray-200'}`}
              />
              {errors.amount && <p className="text-red-500 text-xs mt-1 font-medium">{errors.amount}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Old Balance (Orig)</label>
                <input
                  type="number"
                  name="oldbalanceOrg"
                  value={formData.oldbalanceOrg}
                  onChange={handleChange}
                  className={`w-full p-2 bg-gray-50 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all ${errors.oldbalanceOrg ? 'border-red-500 bg-red-50/50' : 'border-gray-200'}`}
                />
                {errors.oldbalanceOrg && <p className="text-red-500 text-xs mt-1">{errors.oldbalanceOrg}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Balance (Orig)</label>
                <input
                  type="number"
                  name="newbalanceOrig"
                  value={formData.newbalanceOrig}
                  onChange={handleChange}
                  className={`w-full p-2 bg-gray-50 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all ${errors.newbalanceOrig ? 'border-red-500 bg-red-50/50' : 'border-gray-200'}`}
                />
                {errors.newbalanceOrig && <p className="text-red-500 text-xs mt-1">{errors.newbalanceOrig}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Old Balance (Dest)</label>
                <input
                  type="number"
                  name="oldbalanceDest"
                  value={formData.oldbalanceDest}
                  onChange={handleChange}
                  className={`w-full p-2 bg-gray-50 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all ${errors.oldbalanceDest ? 'border-red-500 bg-red-50/50' : 'border-gray-200'}`}
                />
                {errors.oldbalanceDest && <p className="text-red-500 text-xs mt-1">{errors.oldbalanceDest}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Balance (Dest)</label>
                <input
                  type="number"
                  name="newbalanceDest"
                  value={formData.newbalanceDest}
                  onChange={handleChange}
                  className={`w-full p-2 bg-gray-50 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all ${errors.newbalanceDest ? 'border-red-500 bg-red-50/50' : 'border-gray-200'}`}
                />
                {errors.newbalanceDest && <p className="text-red-500 text-xs mt-1">{errors.newbalanceDest}</p>}
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-6 bg-slate-800 hover:bg-slate-900 text-white font-medium py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition-all flex justify-center items-center gap-2 disabled:bg-slate-400 disabled:shadow-none disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Executing ML Model...</span>
                </>
              ) : (
                <>
                  <Activity className="w-5 h-5" />
                  <span>Chạy dự đoán (Inference)</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Cột Result (Chiếm 7 phần) */}
        <div className="lg:col-span-7">
          {!result && !isLoading && (
            <div className="h-full min-h-[500px] bg-slate-50 border border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <TerminalSquare className="w-16 h-16 mb-4 text-slate-300" />
              <h3 className="text-lg font-medium text-slate-600 mb-1">Admin / Debug Console</h3>
              <p className="text-sm">Vùng hiển thị chi tiết kết quả trả về từ API và các thông số kỹ thuật.</p>
            </div>
          )}

          {isLoading && (
            <div className="h-full min-h-[500px] bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-gray-100 rounded-xl flex flex-col items-center justify-center p-8">
              <Activity className="w-12 h-12 text-slate-800 animate-pulse mb-4" />
              <h3 className="text-xl font-medium text-gray-800">Đang truyền dữ liệu qua Model...</h3>
              <div className="w-48 h-1 bg-gray-200 rounded-full mt-4 overflow-hidden">
                <div className="h-full bg-slate-800 animate-ping rounded-full" />
              </div>
            </div>
          )}

          {result && !isLoading && (() => {
            const colors = getRiskColorClasses(result.riskLevel);
            
            return (
              <div className={`h-full min-h-[500px] rounded-xl border-2 p-8 shadow-sm transition-all duration-500 animate-in fade-in zoom-in-95 ${colors.bg} ${colors.border}`}>
                
                {/* Headers */}
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    {colors.icon}
                    <div>
                      <h2 className={`text-3xl font-black uppercase tracking-wide ${colors.text}`}>
                        {result.riskLevel} RISK
                      </h2>
                      <p className={`text-sm font-semibold mt-1 ${colors.text} opacity-80`}>
                        Model Prediction Result
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${colors.border} ${colors.text} bg-white/50`}>
                      {result.isFraud ? 'FRAUD DETECTED' : 'CLEAN'}
                    </span>
                  </div>
                </div>

                {/* Score Grid */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-white/80 backdrop-blur-sm border border-white rounded-xl p-5 shadow-sm">
                    <span className="text-slate-500 font-semibold uppercase text-xs tracking-wider block mb-1">Risk Score</span>
                    <span className={`text-4xl font-black ${colors.text}`}>{result.riskScore}<span className="text-lg text-gray-400 font-medium">/100</span></span>
                  </div>
                  <div className="bg-white/80 backdrop-blur-sm border border-white rounded-xl p-5 shadow-sm">
                    <span className="text-slate-500 font-semibold uppercase text-xs tracking-wider block mb-1">Fraud Probability</span>
                    <span className={`text-4xl font-black ${colors.text}`}>{(result.fraudProbability * 100).toFixed(1)}%</span>
                  </div>
                </div>

                {/* Explanations */}
                <div className="mb-6 bg-white/60 rounded-xl p-5 border border-white">
                  <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2 text-sm uppercase tracking-wide">
                    <AlertCircle className="w-4 h-4 text-gray-600" /> Phân tích đặc trưng (Feature Importances)
                  </h3>
                  <ul className="space-y-2">
                    {result.explanations.map((exp, index) => (
                      <li key={index} className="flex items-start gap-3 text-gray-700 font-medium text-sm">
                        <span className={`mt-1.5 h-1.5 w-1.5 rounded-full flex-shrink-0 ${colors.progressFill}`} />
                        <span>{exp}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Debug View */}
                <div className={`${colors.codeBg} rounded-xl p-5 border border-black/5`}>
                  <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2 text-sm uppercase tracking-wide">
                    <TerminalSquare className="w-4 h-4 text-gray-600" /> Input Tensor / Payload Debug
                  </h3>
                  <pre className="font-mono text-xs text-slate-700 overflow-x-auto">
                    {JSON.stringify({
                      model_inputs: {
                        step: Number(formData.step),
                        type: formData.type,
                        amount: Number(formData.amount),
                        oldbalanceOrg: Number(formData.oldbalanceOrg),
                        newbalanceOrig: Number(formData.newbalanceOrig),
                        oldbalanceDest: Number(formData.oldbalanceDest),
                        newbalanceDest: Number(formData.newbalanceDest)
                      },
                      timestamp: new Date().toISOString()
                    }, null, 2)}
                  </pre>
                </div>

              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

export default AdvancedCheckPage;
