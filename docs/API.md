# REST API DOCUMENTATION — Billet

Tài liệu chi tiết các API endpoints của hệ thống Billet.

## 1. Quy ước chung

- **Prefix API**: `/api`
- **Mã hóa & Headers**: `Content-Type: application/json`
- **Xác thực**: Session Cookie HTTP-Only `sid`. Mọi endpoint ngoại trừ `/api/health`, `/api/auth/register`, `/api/auth/login`, và `/api/group-funds/join-preview/:token` đều yêu cầu xác thực.
- **Format trả về chuẩn**:
  - Thành công (200, 201):
    ```json
    {
      "data": { ... },
      "meta": { ... } // (tùy chọn: phân trang, tổng cộng)
    }
    ```
  - Lỗi (400, 401, 403, 404, 500):
    ```json
    {
      "error": {
        "code": "ERROR_CODE",
        "message": "Thông báo lỗi bằng tiếng Việt",
        "fields": { "fieldName": "Chi tiết lỗi field" } // (tùy chọn)
      }
    }
    ```

---

## 2. Phân hệ Tài khoản (`/api/auth`)

| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| `POST` | `/api/auth/register` | Đăng ký tài khoản mới |
| `POST` | `/api/auth/login` | Đăng nhập tài khoản |
| `POST` | `/api/auth/logout` | Đăng xuất tài khoản |
| `GET` | `/api/auth/me` | Lấy thông tin tài khoản hiện tại |
| `PUT` | `/api/auth/password` | Đổi mật khẩu |
| `GET` | `/api/users/search?q=...` | Tìm kiếm người dùng (để mời vào quỹ) |

---

## 3. Phân hệ Tài chính cá nhân (`/api/personal-finance`)

### Ví tiền
| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| `GET` | `/api/wallets` | Lấy danh sách ví đang hoạt động kèm số dư và tổng tài sản |
| `POST` | `/api/wallets` | Tạo ví mới (tên, mô tả, số dư ban đầu >= 0) |
| `PUT` | `/api/wallets/:id` | Sửa tên và mô tả ví (không sửa trực tiếp số dư) |
| `DELETE` | `/api/wallets/:id` | Xóa ví (chưa có giao dịch: xóa vĩnh viễn; đã có: chuyển `inactive`) |
| `POST` | `/api/wallet-transfers` | Chuyển tiền giữa hai ví cá nhân |

### Danh mục
| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| `GET` | `/api/categories` | Lấy danh sách danh mục (chi tiêu / thu nhập) kèm tổng tiền |
| `POST` | `/api/categories` | Tạo danh mục mới |
| `PUT` | `/api/categories/:id` | Đổi tên danh mục |
| `DELETE` | `/api/categories` | Xóa danh mục đã chọn (archive nếu có giao dịch) |

### Giao dịch
| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| `GET` | `/api/transactions` | Lấy danh sách giao dịch (lọc theo từ khóa, thời gian, ví, danh mục, loại) |
| `POST` | `/api/transactions` | Thêm giao dịch (bắt buộc tên, danh mục; kiểm tra số dư ví, ngân sách còn lại và cảnh báo 90%) |
| `PUT` | `/api/transactions/:id` | Sửa giao dịch (bắt buộc tên; kiểm tra số dư ví và ngân sách còn lại) |
| `DELETE` | `/api/transactions/:id` | Xóa 1 giao dịch |
| `POST` | `/api/transactions/batch-delete` | Xóa nhiều giao dịch được chọn |

### Hạn mức (Ngân sách)
| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| `GET` | `/api/budgets/current` | Lấy hạn mức tháng hiện tại + số đã chi + chi tiết theo danh mục |
| `POST` | `/api/budgets` | Tạo hạn mức mới cho tháng hiện tại |
| `PUT` | `/api/budgets/:id` | Sửa số tiền hạn mức |
| `DELETE` | `/api/budgets/:id` | Xóa hạn mức |

### Mục tiêu tiết kiệm cá nhân
| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| `GET` | `/api/savings-goals` | Danh sách mục tiêu tiết kiệm |
| `POST` | `/api/savings-goals` | Tạo mục tiêu tiết kiệm mới |
| `PUT` | `/api/savings-goals/:id` | Sửa mục tiêu |
| `DELETE` | `/api/savings-goals/:id` | Xóa mục tiêu (hoàn tiền về ví được chọn) |
| `POST` | `/api/savings-goals/:id/deposit` | Nạp tiền vào mục tiêu từ ví cá nhân |
| `POST` | `/api/savings-goals/transfer` | Chuyển tiền giữa hai mục tiêu tiết kiệm |

---

## 4. Phân hệ Quỹ nhóm (`/api/group-funds`)

| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| `GET` | `/api/group-funds` | Danh sách quỹ nhóm người dùng tham gia |
| `POST` | `/api/group-funds` | Tạo quỹ nhóm mới (người tạo là Chủ quỹ) |
| `GET` | `/api/group-funds/:id` | Chi tiết quỹ: thành viên, số dư, mục tiêu, thanh tiến độ tổng |
| `PUT` | `/api/group-funds/:id` | Cập nhật tên, mô tả quỹ |
| `POST` | `/api/group-funds/:id/contribute` | Đóng góp tiền vào quỹ |
| `GET` | `/api/group-funds/:id/transactions` | Lịch sử giao dịch đóng góp/chi tiêu của quỹ |
| `POST` | `/api/group-funds/:id/goals` | Tạo mục tiêu chung |
| `PUT` | `/api/group-funds/:id/goals/:goalId` | Sửa mục tiêu chung |
| `DELETE` | `/api/group-funds/:id/goals/:goalId` | Xóa mục tiêu chung |
| `POST` | `/api/group-funds/:id/goals/:goalId/complete`| Đánh dấu hoàn thành mục tiêu (trừ tiền quỹ theo BR01) |
| `POST` | `/api/group-funds/:id/invite` | Gửi lời mời tới danh sách người dùng |
| `GET` | `/api/group-funds/:id/invite-link` | Lấy/tạo đường link mời kèm mã token |
| `GET` | `/api/group-funds/join-preview/:token` | Xem thông tin quỹ trước khi tham gia qua link |
| `POST` | `/api/group-funds/join/:token` | Tham gia quỹ qua link mời |
| `POST` | `/api/group-funds/invitations/:invitationId/accept` | Chấp nhận lời mời |
| `POST` | `/api/group-funds/invitations/:invitationId/decline` | Từ chối lời mời |
| `POST` | `/api/group-funds/:id/transfer-owner` | Chuyển quyền Chủ quỹ |
| `POST` | `/api/group-funds/:id/leave` | Rời quỹ |
| `POST` | `/api/group-funds/:id/dissolve` | Giải tán quỹ (chỉ Chủ quỹ) |

---

## 5. Phân hệ Chia hóa đơn (`/api/bills`)

| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| `GET` | `/api/bills` | Danh sách hóa đơn chia tiền của người dùng |
| `POST` | `/api/bills` | Tạo hóa đơn mới (tên hóa đơn, danh sách người tham gia) |
| `GET` | `/api/bills/:id` | Chi tiết hóa đơn: người tham gia, các hoạt động, bảng nợ rút gọn |
| `POST` | `/api/bills/:id/activities` | Thêm hoạt động (tổng tiền, người ứng, người tham gia, cách chia) |
| `POST` | `/api/bills/:id/close` | Kết thúc hóa đơn (chốt bảng nợ rút gọn, khóa sửa) |
| `PATCH`| `/api/bills/:id/settlements/:settlementId` | Đánh dấu hoặc bỏ đánh dấu đã trả khoản nợ |

---

## 6. Phân hệ Báo cáo (`/api/reports`)

| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| `GET` | `/api/reports/overview` | Tổng tài sản, tổng thu, tổng chi, số dư ròng theo khoảng thời gian |
| `GET` | `/api/reports/expense-categories` | Cơ cấu chi tiêu theo danh mục (cho biểu đồ tròn/donut) |
| `GET` | `/api/reports/trend` | Xu hướng thu vs chi theo ngày/tuần/tháng (cho biểu đồ cột/đường) |
| `GET` | `/api/reports/compare` | So sánh chỉ số tài chính với kỳ trước |

---

## 7. Phân hệ Thông báo (`/api/notifications`)

| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| `GET` | `/api/notifications` | Danh sách thông báo |
| `PATCH`| `/api/notifications/:id/read` | Đánh dấu thông báo đã đọc |
| `POST` | `/api/notifications/read-all` | Đánh dấu tất cả là đã đọc |
| `GET` | `/api/notifications/unread-count`| Số thông báo chưa đọc |
