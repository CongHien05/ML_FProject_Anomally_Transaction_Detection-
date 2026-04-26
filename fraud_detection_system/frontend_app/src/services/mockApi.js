/**
 * Hàm hỗ trợ phân loại mức độ rủi ro dựa trên điểm số (0 - 100)
 */
const determineRiskLevel = (score) => {
  if (score >= 75) return 'High';
  if (score >= 40) return 'Medium';
  return 'Low';
};

/**
 * Giả lập API cho Quick Check
 * @param {Object} data - Dữ liệu đầu vào { type, amount, nameOrig, nameDest }
 * @returns {Promise} Trả về kết quả phân tích sau 1.5s - 2s
 */
export const checkQuickTransaction = (data) => {
  return new Promise((resolve) => {
    // Giả lập độ trễ mạng ngẫu nhiên từ 1.5 giây đến 2 giây
    const delay = 1500 + Math.random() * 500;
    
    setTimeout(() => {
      let riskScore = 15; // Điểm rủi ro cơ sở
      const explanations = [];

      const amount = Number(data.amount) || 0;
      const type = data.type || '';

      // Logic rủi ro 1: Loại giao dịch
      if (['TRANSFER', 'CASH_OUT'].includes(type.toUpperCase())) {
        riskScore += 25;
        explanations.push(`Loại giao dịch '${type}' có xác suất gian lận cao hơn các loại khác.`);
      }

      // Logic rủi ro 2: Số tiền quá lớn
      if (amount > 200000) {
        riskScore += 40;
        explanations.push(`Số tiền giao dịch (${amount.toLocaleString()}) vượt quá mức an toàn thông thường (200,000).`);
      }

      // Đảm bảo điểm số luôn nằm trong khoảng 0 - 100
      riskScore = Math.min(Math.max(riskScore, 0), 100);
      const isFraud = riskScore >= 75;

      resolve({
        status: 'success',
        data: {
          riskLevel: determineRiskLevel(riskScore),
          riskScore: Number(riskScore.toFixed(1)),
          fraudProbability: Number((riskScore / 100).toFixed(3)),
          isFraud: isFraud,
          explanations: explanations.length > 0 
            ? explanations 
            : ['Giao dịch có vẻ bình thường, không có dấu hiệu bất thường về loại hoặc số tiền.']
        }
      });
    }, delay);
  });
};

/**
 * Gọi API thật cho Advanced Check (Dữ liệu đầy đủ từ PaySim)
 * @param {Object} data - Dữ liệu đầu vào { step, type, amount, oldbalanceOrg, newbalanceOrig, oldbalanceDest, newbalanceDest }
 * @returns {Promise} Trả về kết quả phân tích từ Backend
 */
export const checkAdvancedTransaction = async (data) => {
  try {
    const response = await fetch('http://localhost:8000/api/v1/predict/advanced', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        step: Number(data.step) || 0,
        type: data.type || '',
        amount: Number(data.amount) || 0,
        oldbalanceOrg: Number(data.oldbalanceOrg) || 0,
        newbalanceOrig: Number(data.newbalanceOrig) || 0,
        oldbalanceDest: Number(data.oldbalanceDest) || 0,
        newbalanceDest: Number(data.newbalanceDest) || 0
      }),
    });

    if (!response.ok) {
      throw new Error(`Lỗi server: ${response.status}`);
    }

    const result = await response.json();
    
    // Đóng gói lại kết quả cho giống cấu trúc cũ để UI không bị vỡ
    return {
      status: 'success',
      data: result
    };
  } catch (error) {
    console.error("Lỗi khi gọi API AI:", error);
    // Quăng lỗi rõ ràng để UI có thể bắt
    throw new Error("Không thể kết nối đến AI Server. Vui lòng kiểm tra xem Backend FastAPI đã được bật chưa (chạy lệnh: uvicorn main:app --reload).");
  }
};
