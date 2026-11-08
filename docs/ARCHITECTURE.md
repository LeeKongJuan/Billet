# ARCHITECTURE — Billet

## 1. Lựa chọn kiến trúc

**Modular Monolith + Layered Architecture.**

- Backend chia theo module nghiệp vụ, tất cả chạy trong **một** ứng dụng Node.js, triển khai cùng nhau.
- Lý do: nhiều thao tác cần nhất quán dữ liệu (ví dụ chuyển tiền cập nhật 2 ví + lịch sử) → một backend + một CSDL quan hệ cho phép dùng **một database transaction**.
- Phân module giúp chia việc trong nhóm và giới hạn phạm vi ảnh hưởng khi sửa một chức năng.
- Hạn chế đã chấp nhận: chưa scale từng module độc lập.

## 2. Thành phần hệ thống

```
Trình duyệt (React UI)
   │  HTTPS: tải file tĩnh        │  HTTPS: REST /api/*
   ▼                              ▼
┌───────────── Railway Project ─────────────────────┐
│  Application Service (Node.js / Express)           │
│   ├─ Static: client/dist (React đã build)          │
│   └─ API: Routes/Controllers → Services → Repos    │
│                                   │ mạng nội bộ    │
│  Database Service (MySQL) ◄───────┘                │
└────────────────────────────────────────────────────┘
```

- Express phục vụ file tĩnh React và API tại `/api/*` (cùng origin → không cần CORS ở production).
- Người dùng **không** kết nối trực tiếp tới MySQL; backend kết nối qua mạng nội bộ Railway.

## 3. Các module backend

| Module | Thư mục | Trách nhiệm |
|---|---|---|
| Tài khoản & xác thực | `modules/auth` | Đăng ký, đăng nhập, đăng xuất, quản lý phiên, đổi mật khẩu |
| Tài chính cá nhân | `modules/personal-finance` | Ví, danh mục, giao dịch thu/chi, chuyển tiền giữa ví, ngân sách (hạn mức), mục tiêu tiết kiệm cá nhân |
| Quỹ nhóm | `modules/group-fund` | Quỹ, thành viên, lời mời (tìm kiếm/link), đóng góp, mục tiêu chung, chuyển quyền chủ quỹ, rời/giải tán |
| Chia hóa đơn | `modules/bill-split` | Hóa đơn, người tham gia, hoạt động, chia tiền, rút gọn nợ, trạng thái đã trả |
| Báo cáo | `modules/reports` | Tổng tài sản, cơ cấu chi tiêu, xu hướng thu/chi. **Chỉ đọc**, không đổi dữ liệu |
| Thông báo | `modules/notifications` | Thông báo trong ứng dụng (cảnh báo ngân sách, lời mời quỹ, sự kiện quỹ) |

Lý do gộp: ví + giao dịch + ngân sách đặt chung `personal-finance` vì gắn chặt (thêm khoản chi = ghi giao dịch + cập nhật số dư ví + đánh giá % ngân sách). Quỹ nhóm và chia hóa đơn tách riêng vì mô hình khác nhau (tiến độ tiết kiệm vs. nghĩa vụ trả nợ).

### Quy tắc giao tiếp giữa module

- Mỗi module **chỉ ghi** dữ liệu thuộc phạm vi của mình.
- Module cần phối hợp thì gọi **service công khai** của module kia (ví dụ `personal-finance` gọi `notifications.service.create(...)` khi vượt 90%).
- Cấm import repository của module khác. Cấm truy vấn chéo module ngoài `reports` (được phép truy vấn tổng hợp read-only).
- Đóng góp quỹ gọi service tài chính cá nhân để trừ ví đã chọn; thao tác trừ ví + ghi đóng góp + cập nhật số dư quỹ nằm trong cùng database transaction. Đánh dấu khoản nợ đã trả **không** tự tạo giao dịch ví.

## 4. Phân tầng trong mỗi module

### Presentation (Routes + Controllers)
- Parse/validate input (zod), lấy `req.user` từ middleware xác thực, gọi Service, map kết quả → HTTP status + JSON.
- Không truy vấn DB, không chứa thuật toán.

### Business Logic (Services + algorithms)
- Kiểm tra: quyền sở hữu tài nguyên, vai trò (Chủ quỹ/Thành viên), trạng thái (ví `active`, quỹ `active`, hóa đơn `open`...).
- Điều phối nhiều repository và **quyết định phạm vi transaction** (`knex.transaction`).
- Thuật toán chia tiền / rút gọn nợ: file thuần trong `bill-split/algorithms/`, không phụ thuộc HTTP/DB, test bằng bảng input → output.

### Data Access (Repositories)
- Truy vấn SQL cho Service: tìm ví theo id, lưu giao dịch, lấy thành viên quỹ, tổng hợp chi tiêu theo khoảng thời gian...
- Nhận `trx` (transaction object) tùy chọn làm tham số để chạy trong transaction của Service.
- Ràng buộc DB (FK, UNIQUE, CHECK) là lớp bảo vệ bổ sung, không thay thế kiểm tra ở Service.

## 5. Middleware chuẩn (thứ tự đăng ký)

1. `helmet`, `pino-http` (logging)
2. `express.json({ limit: '100kb' })`, `cookie-parser`
3. Rate limit cho `/api/auth/*`
4. `/api/health` (không auth)
5. Router các module (mỗi router gắn `requireAuth` trừ endpoint công khai)
6. Static `client/dist` + SPA fallback (mọi GET không bắt đầu bằng `/api` → `index.html`)
7. `notFound` cho `/api/*`, rồi `errorHandler` cuối cùng

`errorHandler` chuyển `AppError(code, httpStatus, message, fields?)` thành JSON chuẩn; lỗi không lường trước trả 500 với message chung, log chi tiết phía server.

## 6. Xác thực & phiên

- Đăng nhập thành công: sinh token ngẫu nhiên 32 byte, lưu **SHA-256 của token** trong bảng `sessions`, set cookie `sid` (`HttpOnly; Secure(prod); SameSite=Lax; Path=/`).
- Cookie là **session cookie** (không đặt `Expires`/`Max-Age`) → đóng trình duyệt là mất phiên, khớp use case Đăng xuất (alternative flow 1a). Phía server vẫn đặt `expires_at` (mặc định 7 ngày) để dọn phiên cũ.
- Đăng xuất: xóa bản ghi session phía server + clear cookie; lỗi mạng → client vẫn xóa state cục bộ.
- Middleware `requireAuth`: đọc cookie → hash → tìm session còn hạn → gắn `req.user = { id, displayName, email }`.

## 7. Giao dịch DB (Transaction)

Dùng `knex.transaction` cho các thao tác sau (bắt buộc):

| Thao tác | Nội dung transaction |
|---|---|
| Thêm/sửa/xóa giao dịch thu chi | Ghi/sửa/xóa `transactions` + cập nhật `wallets.balance` + cập nhật cờ cảnh báo ngân sách |
| Chuyển tiền giữa ví | Khóa 2 ví `SELECT ... FOR UPDATE` theo `id` tăng dần → kiểm tra số dư → trừ/cộng → ghi `wallet_transfers` |
| Nạp/rút/chuyển mục tiêu tiết kiệm cá nhân | Cập nhật `savings_goals.current_amount` + `wallets.balance` + ghi `savings_goal_movements` |
| Đóng góp quỹ | Khóa quỹ và ví nguồn → trừ `wallets.balance` → ghi `group_fund_transactions` + cập nhật `group_funds.balance` trong cùng transaction |
| Đánh dấu hoàn thành mục tiêu quỹ | Đổi trạng thái mục tiêu + ghi giao dịch chi + trừ số dư quỹ (BR01) |
| Chấp nhận lời mời / tham gia bằng link | Kiểm tra hiệu lực + thêm thành viên + cập nhật lời mời + tạo thông báo |
| Rời quỹ (có chuyển quyền) | Cập nhật vai trò chủ mới + xóa thành viên |
| Kết thúc hóa đơn | Tính bảng nợ rút gọn + ghi `bill_settlements` + đổi trạng thái `closed` |

## 8. Luồng mẫu: Chuyển tiền giữa hai ví

1. Frontend gửi `POST /api/wallet-transfers { fromWalletId, toWalletId, amount, note, transferredOn }`.
2. Controller validate (zod), gọi `walletTransferService.transfer(userId, dto)`.
3. Service kiểm tra: 2 ví khác nhau, cùng thuộc user, đều `active`, `amount > 0` và là số nguyên.
4. Mở transaction → khóa 2 ví theo thứ tự id → kiểm tra `from.balance >= amount` (lỗi `WALLET_INSUFFICIENT_BALANCE`: "Số dư ví nguồn không đủ để thực hiện chuyển tiền").
5. Trừ ví nguồn, cộng ví đích, insert `wallet_transfers`. Commit. Lỗi bất kỳ → rollback toàn bộ.
6. Trả về số dư mới của 2 ví; frontend invalidate query `wallets`.

## 9. Frontend ↔ Backend

- Frontend chỉ gọi REST API (`/api/...`) qua một lớp `client/src/api/http.js` (fetch, `credentials: 'same-origin'`, parse lỗi chuẩn).
- Dev: Vite proxy `/api` → `http://localhost:3000`.
- Production: Express serve `client/dist`; React Router dùng history mode nhờ SPA fallback.
- Khi nhận 401: xóa cache, chuyển về `/login`.
- Số tiền vẫn là số nguyên VND trong nghiệp vụ/API nhưng được AES-256-GCM mã hóa trước khi ghi database. Báo cáo/tìm kiếm cần giải mã và tính toán ở backend; key `DATA_ENCRYPTION_KEY` chỉ tồn tại trong secret manager/biến môi trường.

## 10. Mô hình triển khai

Xem `docs/DEPLOYMENT.md`. Tóm tắt: 2 service trên Railway (Application + MySQL), cấu hình bằng biến môi trường, migration chạy ở bước pre-deploy, sao lưu DB định kỳ.
