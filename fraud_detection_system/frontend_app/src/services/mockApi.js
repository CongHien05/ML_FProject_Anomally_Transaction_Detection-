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
 * Giả lập API cho Advanced Check (Dữ liệu đầy đủ từ PaySim)
 * @param {Object} data - Dữ liệu đầu vào { step, type, amount, oldbalanceOrg, newbalanceOrig, oldbalanceDest, newbalanceDest }
 * @returns {Promise} Trả về kết quả phân tích sau 1.5s - 2s
 */
export const checkAdvancedTransaction = (data) => {
  return new Promise((resolve) => {
    // Giả lập độ trễ mạng ngẫu nhiên từ 1.5 giây đến 2 giây
    const delay = 1500 + Math.random() * 500;

    setTimeout(() => {
      let riskScore = 5;
      const explanations = [];

      const amount = Number(data.amount) || 0;
      const type = data.type || '';
      const oldbalanceOrg = Number(data.oldbalanceOrg) || 0;
      const newbalanceOrig = Number(data.newbalanceOrig) || 0;
      
      // Rule 1: Loại giao dịch rủi ro
      if (['TRANSFER', 'CASH_OUT'].includes(type.toUpperCase())) {
        riskScore += 15;
        explanations.push(`Phát hiện loại giao dịch '${type}' nằm trong nhóm rủi ro gian lận theo tập dữ liệu PaySim.`);
      }

      // Rule 2: Số tiền quá lớn
      if (amount > 200000) {
        riskScore += 25;
        explanations.push(`Số tiền chuyển đi (${amount.toLocaleString()}) rất lớn.`);
      }

      // Rule 3: Bất thường trong kế toán (Số dư không khớp)
      // Về mặt logic: Số dư cũ - Số tiền chuyển = Số dư mới
      const expectedNewOrig = oldbalanceOrg - amount;
      
      // Nếu số dư thực tế khác với số dư tính toán (cho phép sai số 1 chút do float hoặc phí, nhưng ở đây dùng 10 cho an toàn)
      if (Math.abs(expectedNewOrig - newbalanceOrig) > 10) {
        riskScore += 45;
        explanations.push('Nghiêm trọng: Có sự bất thường về số dư tài khoản người gửi. (Số dư cũ trừ số tiền chuyển không bằng số dư mới).');
      }

      // Rule 4: Chuyển cạn kiệt tài khoản (Rút sạch tiền)
      if (amount > 0 && amount === oldbalanceOrg && newbalanceOrig === 0) {
        riskScore += 20;
        explanations.push('Cảnh báo: Giao dịch này đã rút toàn bộ (rút cạn) số dư của tài khoản người gửi.');
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
            : ['Các chỉ số tài chính hoàn toàn khớp và logic. Không tìm thấy rủi ro.']
        }
      });
    }, delay);
  });
};
