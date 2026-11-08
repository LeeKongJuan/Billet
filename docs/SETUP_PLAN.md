# SETUP PLAN — Billet

Kế hoạch thiết lập và phát triển dự án Billet theo từng pha.

## Pha 1: Khởi tạo Project & Tài liệu hóa
- Khởi tạo repo, workspace `client` và `server`.
- Thiết lập tài liệu đầy đủ trong `docs/`.
- Thiết lập `railway.json`, `.env.example`, `.gitignore`.

## Pha 2: Thiết kế Database & Cấu hình Server Core
- Cấu hình Knex migration, pool kết nối MySQL 8+ và hỗ trợ test.
- Viết migration tạo đầy đủ 20 bảng cơ sở dữ liệu theo `docs/DATABASE.md`.
- Viết seed ban đầu cho danh mục và dữ liệu mẫu.
- Thiết lập core server Express, cấu hình middleware (helmet, pino, cookie-parser, rate-limit, auth, error-handler).

## Pha 3: Phân hệ Xác thực & Tài chính cá nhân
- Authentication: Register, Login, Logout, Session check, Password change.
- Wallets: Tạo ví, xem ví, chuyển tiền giữa 2 ví (FOR UPDATE, transaction), sửa/vô hiệu hóa ví.
- Categories: Thêm, sửa tên, archive danh mục có giao dịch.
- Transactions: Ghi chép thu/chi, cập nhật số dư ví, lọc phân trang, xóa batch.
- Budgets: Thiết lập hạn mức tháng, kiểm tra ngưỡng >= 90% để bắn thông báo.
- Savings Goals: Tạo mục tiêu, nạp từ ví, chuyển giữa các mục tiêu, rút tiền khi xóa.

## Pha 4: Phân hệ Quỹ nhóm & Thuật toán Chia hóa đơn
- Group Funds: CRUD quỹ, mời thành viên (tìm kiếm + link token), đóng góp tiền, mục tiêu chung, hoàn thành mục tiêu (trừ tiền quỹ theo BR01), chuyển quyền chủ quỹ, rời/giải tán.
- Bill Split Algorithms: Pure function `splitEqual` (chia đều lẻ đến từng đồng) và `simplifyDebts` (tối ưu bảng nợ ≤ n-1 giao dịch).
- Bill Split API: Tạo hóa đơn, thêm người tham gia, thêm hoạt động (đều/không đều), tính nợ động, kết thúc hóa đơn và đánh dấu đã trả.

## Pha 5: Báo cáo, Thông báo & Tests
- Reports API: Tổng tài sản, cơ cấu chi tiêu, xu hướng thu chi, so sánh kỳ trước.
- Notifications API: Danh sách thông báo, đánh dấu đã đọc, cảnh báo tức thời.
- Unit & Integration Tests: Viết test cho thuật toán chia tiền, rút gọn nợ, và API endpoints.

## Pha 6: Frontend React + Bootstrap + Recharts (Mockup UI)
- Setup React + Vite, Bootstrap 5.3, React Router, TanStack Query, Recharts.
- Thiết kế layout chuẩn Mockup PDF: Sidebar xanh, Topbar, Responsive.
- Triển khai toàn bộ 11 trang giao diện khớp với Mockup Chương 4.

## Pha 7: Triển khai Railway & Kiểm thử cuối
- Cấu hình Application Service & MySQL Service trên Railway.
- Kiểm thử luồng build `npm run build` và chạy `npm start`.
- Đảm bảo production phục vụ file tĩnh và SPA fallback an toàn.
