# FRONTEND DESIGN & UI SPECIFICATION — Billet

Tài liệu đặc tả giao diện người dùng, cấu trúc component và các trang chức năng bám sát theo Mockup Design trong PDF (Chương 4).

## 1. Thiết kế tổng quan & Tone màu

- **Tone màu chủ đạo**:
  - Primary Green: `#059669` / `#10B981` (Emerald Green)
  - Dark Accent / Header cards: `#0f4c3a` / `#134e4a` (Dark Emerald)
  - Neutral Background: `#f8fafc` / `#f1f5f9` (Cool Gray/Off-white)
  - Card Background: `#ffffff`
  - Text Primary: `#0f172a` (Slate 900)
  - Text Secondary / Muted: `#64748b` (Slate 500)
  - Danger: `#ef4444`
  - Warning: `#f59e0b`
- **Typography & Formatting**:
  - Phông chữ: Inter / system-ui
  - Đơn vị tiền tệ: hiển thị `X.XXX.XXX đ` (hoặc `X.XXX.XXX VND`), dấu chấm phân tách hàng nghìn
  - Định dạng ngày: `DD/MM/YYYY`

---

## 2. Layout & Navigation

### Thanh điều hướng chính (Sidebar)
Thanh điều hướng luôn cố định bên trái ở desktop (responsive toggle trên mobile):
1. **Logo**: `billet` (icon chữ b màu xanh + tên thương hiệu)
2. **Tổng quan** (`/`) — Icon Home / Grid
3. **Ví tiền** (`/wallets`) — Icon Wallet
4. **Giao dịch** (`/transactions`) — Icon Arrow-left-right / Receipt
5. **Danh mục** (`/categories`) — Icon Tag / Grid
6. **Ngân sách** (`/budgets`) — Icon Pie-chart / Meter
7. **Mục tiêu tiết kiệm** (`/savings-goals`) — Icon Piggy-bank / Target
8. **Quỹ nhóm** (`/group-funds`) — Icon Users
9. **Chia hóa đơn** (`/bills`) — Icon File-text / Split
10. **Báo cáo** (`/reports`) — Icon Bar-chart
11. **Cài đặt** (`/settings`) — Icon Gear / Sliders

### Top Header Bar
- Breadcrumb / Tiêu đề trang
- Chuông thông báo (kèm badge số lượng chưa đọc, bấm mở dropdown thông báo)
- Thông tin người dùng hiện tại (Avatar, Tên hiển thị, Nút Đăng xuất nhanh)

---

## 3. Danh sách màn hình & Thành phần UI (Mockup PDF)

### 3.1 Màn hình Đăng nhập (Hình 4.1) & Đăng ký (Hình 4.2)
- Form nằm giữa màn hình, thẻ trắng viền bo tròn nhẹ, shadow thanh lịch.
- **Đăng nhập**: Email, Mật khẩu, Nút "Đăng nhập", Link "Đăng ký ngay".
- **Đăng ký**: Tên hiển thị, Email, Mật khẩu, Nhập lại mật khẩu, Thanh hiển thị độ mạnh mật khẩu (yêu cầu >= 8 ký tự, chữ hoa, chữ thường, số), Nút "Tạo tài khoản", Link quay lại đăng nhập.

### 3.2 Màn hình Cài đặt (Hình 4.3)
- Thông tin cơ bản: Tên hiển thị, Email.
- Đổi mật khẩu: Mật khẩu hiện tại, Mật khẩu mới, Xác nhận mật khẩu mới.
- Nút "Đăng xuất" bảo mật.

### 3.3 Màn hình Tổng quan (Hình 4.4)
- **3 thẻ thống kê trên cùng**:
  - Tổng tài sản (Card màu xanh đậm, chữ trắng nổi bật, ví dụ `12.400.000 đ`)
  - Tổng thu nhập tháng này (Màu xanh dương / xanh lá)
  - Tổng chi tiêu tháng này (Màu cam / đỏ)
- **Hàng giữa**:
  - Biểu đồ cột mini: Dòng tiền thu/chi theo tháng
  - Thẻ hạn mức ngân sách tháng: Thanh tiến độ %, số tiền đã chi / hạn mức (cảnh báo cam/đỏ khi >= 90%)
- **Hàng dưới**:
  - Danh sách giao dịch gần đây (kèm nút "Thêm giao dịch", nút "Xem tất cả")
  - Khối nợ & hóa đơn cần thanh toán (kèm nút "Chia hóa đơn")

### 3.4 Màn hình Ví tiền (Hình 4.5 – 4.8)
- Danh sách thẻ ví: tên ví, số dư, mô tả.
- Thẻ tổng tài sản trên đầu.
- Nút "Tạo ví mới" mở modal (Tên ví, Số dư ban đầu).
- Nút "Chuyển tiền giữa các ví" mở modal: chọn ví nguồn, ví đích, số tiền, ghi chú, xem trước số dư 2 ví sau khi chuyển.
- Nút "Sửa ví" mở modal: sửa tên, mô tả, tùy chọn vô hiệu hóa ví (`inactive`).

### 3.5 Màn hình Giao dịch (Hình 4.9 – 4.10)
- Bộ lọc phía trên: ô tìm kiếm từ khóa, lọc theo khoảng thời gian, theo ví, theo danh mục, theo loại thu/chi.
- Bảng lịch sử giao dịch: checkbox chọn dòng, ngày, danh mục (icon), ghi chú, ví, số tiền (+ / -), nút sửa, nút xóa.
- Nút "Xóa các mục đã chọn" và "Xóa tất cả".
- Form "Thêm giao dịch mới" (hoặc Modal): tên giao dịch bắt buộc, loại chi/thu, số tiền, chọn ví, chọn danh mục, ngày, ghi chú tối đa 100 từ.
- Modal "Sửa giao dịch".

### 3.6 Màn hình Danh mục (Hình 4.11)
- Hai tab: Chi tiêu và Thu nhập.
- Danh sách các danh mục kèm tổng tiền đã chi/thu của từng danh mục.
- Form tạo danh mục mới: chọn biểu tượng, tên danh mục.
- Nút đổi tên và xóa các danh mục đã chọn (archive nếu đã có giao dịch).

### 3.7 Màn hình Ngân sách (Hình 4.12 – 4.14)
- Nếu chưa có hạn mức: Banner thông báo "Bạn chưa có hạn mức chi tiêu" kèm nút "Tạo hạn mức mới".
- Khi đã có hạn mức: Thẻ tiến độ to lớn, hiển thị số tiền đã chi, số tiền hạn mức, tỷ lệ % sử dụng. Khi >= 90% hiện cảnh báo màu đỏ/vàng rõ rệt.
- Bảng thống kê chi tiêu theo từng danh mục (số tiền + % chiếm trong tổng chi).
- Nút sửa hạn mức và nút xóa hạn mức.

### 3.8 Màn hình Mục tiêu tiết kiệm (Hình 4.15 – 4.16)
- Thẻ tổng tiền đã tiết kiệm.
- Danh sách thẻ mục tiêu: tên, số tiền đã tích lũy, số tiền mục tiêu, thời hạn, thanh tiến độ %.
- Nút "Tạo mục tiêu mới".
- Thao tác nạp tiền từ ví vào mục tiêu.
- Thao tác chuyển tiền giữa hai mục tiêu tiết kiệm.
- Thao tác xóa mục tiêu (chọn ví để hoàn trả số tiền đang có).

### 3.9 Màn hình Quỹ nhóm (Hình 4.17 – 4.20)
- Danh sách các quỹ nhóm đang tham gia kèm nút "Tạo quỹ nhóm mới".
- Trang chi tiết quỹ nhóm:
  - Header: Tên quỹ, mô tả, số dư hiện có trong quỹ.
  - Thanh tiến độ tổng: Số dư quỹ / Tổng mục tiêu chung đang tích lũy.
  - Danh sách thành viên (phân biệt Chủ quỹ và Thành viên).
  - Nút "Mời thành viên": mở modal gồm ô tìm kiếm (email/tên) và nút "Sao chép liên kết mời" (kèm QR).
  - Nút "Đóng góp": mở modal nhập số tiền, chọn ví, ghi chú.
  - Danh sách mục tiêu chung: nút tạo, sửa, xóa, nút "Đánh dấu hoàn thành" (áp dụng BR01 trừ tiền quỹ).
  - Tab "Lịch sử giao dịch": xem toàn bộ các khoản đóng góp và chi tiêu hoàn thành mục tiêu.
  - Cài đặt quỹ: Chuyển quyền Chủ quỹ, Rời quỹ (cảnh báo không hoàn tiền), Giải tán quỹ (chỉ Chủ quỹ).

### 3.10 Màn hình Chia hóa đơn (Hình 4.21 – 4.25)
- Danh sách các hóa đơn (chia làm tab Hoạt động / Đã kết thúc).
- Nút "Tạo hóa đơn": nhập tên hóa đơn, danh sách người tham gia (tự động có người tạo, thêm bạn bè theo email/tên tự do).
- Chi tiết hóa đơn đang diễn ra:
  - Danh sách hoạt động chi tiêu (người ứng trước, tổng tiền, người tham gia, chi tiết chia).
  - Bảng nợ rút gọn tính toán tự động: ai trả ai bao nhiêu tiền (gọn nhất ≤ n-1 giao dịch).
  - Nút "Thêm hoạt động mới": nhập số tiền, người ứng, người tham gia, chọn "Chia đều" hoặc "Chia không đều".
  - Nút "Kết thúc hóa đơn".
- Chi tiết hóa đơn đã kết thúc:
  - Khóa sửa hoạt động.
  - Danh sách các khoản nợ chốt: hiển thị người nợ, người nhận, số tiền, checkbox đánh dấu "Đã trả / Chưa trả".

### 3.11 Màn hình Báo cáo (Hình 4.26)
- Bộ lọc thời gian: Tuần này, Tháng này (mặc định), Tháng trước, Năm nay, Tùy chọn ngày.
- Bộ lọc ví: Tất cả các ví hoặc chọn ví cụ thể.
- 4 thẻ số liệu: Tổng tài sản, Tổng thu, Tổng chi, Chênh lệch ròng.
- Biểu đồ Donut/Pie: Cơ cấu chi tiêu theo danh mục (dùng Recharts).
- Biểu đồ Cột/Đường: Xu hướng thu - chi theo thời gian (dùng Recharts).
- Bảng so sánh với kỳ liền trước (% tăng/giảm).
