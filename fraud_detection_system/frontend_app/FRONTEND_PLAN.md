# Kế Hoạch Triển Khai Frontend: Hệ Thống Phát Hiện Gian Lận Thẻ Tín Dụng (Credit Card Fraud Detection)

Chào bạn, với tư cách là Senior Frontend Tech Lead của dự án này, tôi đã xây dựng một bản kế hoạch triển khai chi tiết cho phần Frontend. 

Vì team Backend và Machine Learning vẫn đang trong quá trình phát triển API, chúng ta sẽ áp dụng chiến lược **"Mock-First" (Ưu tiên dữ liệu giả lập)**. Phương pháp này giúp chúng ta xây dựng hoàn chỉnh giao diện người dùng (UI), trải nghiệm người dùng (UX), và luồng logic mà không bị phụ thuộc (block) bởi tiến độ của Backend. Khi API thực sự sẵn sàng, chúng ta chỉ cần thay đổi các lời gọi hàm ở tầng dịch vụ (service layer) là xong.

Lưu ý: Mọi tác vụ và thay đổi mã nguồn sẽ được giới hạn nghiêm ngặt trong thư mục `frontend_app/` để tránh xung đột (merge conflicts) với đồng đội của bạn ở các nhánh Backend/ML.

Dưới đây là kế hoạch 4 giai đoạn cụ thể:

## Giai đoạn 1: Thiết lập cơ bản (Base Setup)

Trong giai đoạn này, chúng ta sẽ xây dựng nền tảng cho ứng dụng, thiết lập hệ thống định tuyến (Routing) và cấu hình thư viện UI. Chúng ta sẽ sử dụng **Tailwind CSS** vì nó cung cấp khả năng tùy biến cao, phát triển nhanh và rất phù hợp để làm các ứng dụng có giao diện hiện đại, Dashboard trực quan.

- **Cấu hình UI Framework:** Thiết lập `tailwindcss` cùng với các cấu hình màu sắc đặc thù cho việc hiển thị cảnh báo rủi ro (xanh lá, vàng, đỏ) trong tệp `tailwind.config.js`.
- **Cấu hình Layout:** Xây dựng một Layout chính bao gồm:
  - **Navbar:** Thanh điều hướng trên cùng.
  - **Sidebar:** Thanh điều hướng bên cạnh (nếu cần thiết cho giao diện `/admin` để chuyển đổi giữa các công cụ).
- **Thiết lập Routing (React Router):**
  - `/` (Quick Check): Giao diện kiểm tra giao dịch nhanh gọn dành cho nhân viên xử lý thông thường.
  - `/admin` (Advanced Check): Giao diện phân tích chuyên sâu với đầy đủ các tham số dữ liệu, dành cho quản trị viên hoặc điều tra viên gian lận.

## Giai đoạn 2: Lớp Mock API (Mock API Layer)

Để các form và giao diện có thể hoạt động ngay lập tức, chúng ta cần một tầng dữ liệu giả lập dựa trên bối cảnh của tập dữ liệu PaySim.

- **Tạo thư mục dịch vụ:** Khởi tạo `src/services/mockApi.js`.
- **Xây dựng các hàm giả lập:** 
  - Tạo các hàm gọi API giả như `checkTransactionQuick(data)` và `checkTransactionAdvanced(data)`.
  - Sử dụng `setTimeout` kết hợp với `Promise` để tạo ra độ trễ mạng giả lập khoảng 2 giây (network delay simulation). Điều này giúp chúng ta lập trình và kiểm tra các trạng thái "đang tải" (loading states) của giao diện.
- **Cấu trúc dữ liệu trả về:** Phản hồi từ Mock API sẽ mô phỏng kết quả phân tích từ mô hình ML, bao gồm:
  - `isFraud`: boolean (true/false)
  - `riskScore`: number (0 - 100)
  - `fraudProbability`: number (tỉ lệ phần trăm)
  - `modelExplanations`: array (danh sách các yếu tố giải thích lý do giao dịch bị đánh dấu rủi ro, ví dụ: "Số tiền giao dịch lớn bất thường so với lịch sử").

## Giai đoạn 3: Xây dựng các UI Components (UI Components Construction)

Giai đoạn này tập trung vào việc xây dựng các thành phần giao diện, đặc biệt là các biểu mẫu nhập liệu (Forms) với logic kiểm tra tính hợp lệ (validation) nghiêm ngặt.

- **Thành phần biểu mẫu Quick Check (`/`):**
  - Các trường dữ liệu đầu vào cơ bản.
  - Dropdown cho `type` (Loại giao dịch: TRANSFER, CASH_OUT, PAYMENT, v.v.).
- **Thành phần biểu mẫu Advanced Check (`/admin`):**
  - Bao gồm các trường của Quick Check và bổ sung các thông tin chi tiết về số dư: `oldbalanceOrg`, `newbalanceOrig`, `oldbalanceDest`, `newbalanceDest`.
- **Xác thực dữ liệu đầu vào (Input Validation):**
  - Số tiền (`amount`) bắt buộc phải lớn hơn 0.
  - Đảm bảo các trường quan trọng không được bỏ trống (Required fields).
  - Hiển thị thông báo lỗi rõ ràng ngay dưới các ô nhập liệu nếu dữ liệu không hợp lệ.

## Giai đoạn 4: Quản lý trạng thái và Tích hợp (State Management & Integration)

Đây là bước kết nối các biểu mẫu React với lớp dữ liệu Mock API và xử lý phần hiển thị kết quả phân tích gian lận một cách sinh động, trực quan nhất.

- **Tích hợp API vào Form:** Xử lý sự kiện submit, kích hoạt trạng thái loading và gửi dữ liệu tới Mock API.
- **Hiển thị kết quả động (Dynamic Results Rendering):**
  - **Risk Score & Fraud Probability:** Trình bày điểm rủi ro bằng các thanh tiến trình (progress bars) hoặc biểu đồ vòng trực quan.
  - **Hệ thống cảnh báo bằng màu sắc (Color-coded alerts):** 
    - Rủi ro thấp: Màu Xanh lá (Safe)
    - Rủi ro trung bình: Màu Vàng (Warning)
    - Rủi ro cao: Màu Đỏ (Danger - Fraud Detected)
  - **Model Explanations:** Hiển thị danh sách các cảnh báo (alerts) hoặc lý do từ mô hình ML một cách rõ ràng, giúp người dùng hiểu tại sao hệ thống lại đưa ra mức độ rủi ro đó.

---

**Các bước tiếp theo:**
Hãy dành thời gian xem qua bản kế hoạch `FRONTEND_PLAN.md` này. Khi bạn đã sẵn sàng, hãy phản hồi lại cho tôi và chúng ta sẽ tiến hành triển khai (thực thi) từng bước một. Bạn có thể yêu cầu tôi "Bắt đầu Giai đoạn 1" khi đã sẵn sàng!
