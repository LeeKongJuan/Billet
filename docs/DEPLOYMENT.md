# DEPLOYMENT GUIDE (RAILWAY) — Billet

Tài liệu hướng dẫn triển khai hệ thống Billet trên nền tảng Cloud Railway.

## 1. Mô hình kiến trúc triển khai

Dự án Billet được triển khai trên Railway bằng **2 service** trong cùng 1 project:

1. **MySQL Service (Database Service)**
   - Khởi tạo trực tiếp từ catalog "New Service" -> "Database" -> "Add MySQL".
   - Railway tự động sinh các biến kết nối nội bộ: `MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`, `MYSQL_URL`.

2. **Application Service (Node.js / Express + React Built)**
   - Triển khai từ GitHub Repository: `https://github.com/LeeKongJuan/Billet.git`.
   - Build phase: Chạy `npm run build` để bundle frontend React thành các file tĩnh đặt trong `client/dist`.
   - Deploy phase: Chạy `npm run migrate && npm start` để chạy migration DB mới nhất và khởi chạy Express server.
   - Express server vừa đảm nhận xử lý REST API tại `/api/*`, vừa phục vụ file tĩnh và fallback SPA `index.html`.

---

## 2. Cấu hình file `railway.json`

File `railway.json` ở thư mục gốc:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm run build"
  },
  "deploy": {
    "startCommand": "npm run migrate && npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

---

## 3. Danh sách Biến môi trường (Environment Variables)

Cấu hình tại tab "Variables" của Application Service trên Railway:

| Tên biến | Bắt buộc | Giá trị mẫu / Mô tả |
|---|---|---|
| `NODE_ENV` | Có | `production` |
| `PORT` | Có | Railway tự động gán (mặc định 3000 nếu chạy local) |
| `SESSION_SECRET` | Có | Chuỗi bí mật ngẫu nhiên tối thiểu 32 ký tự để ký cookie session |
| `DATA_ENCRYPTION_KEY` | **Có** | AES-256-GCM key: Base64 của đúng 32 byte ngẫu nhiên; tạo riêng, không dùng chung với `SESSION_SECRET`. |
| `CLIENT_ORIGIN` | Không | URL frontend khi chạy dev (prod để trống để dùng cùng origin) |
| `MYSQLHOST` | Có | Gán từ `${{MySQL.MYSQLHOST}}` |
| `MYSQLPORT` | Có | Gán từ `${{MySQL.MYSQLPORT}}` |
| `MYSQLUSER` | Có | Gán từ `${{MySQL.MYSQLUSER}}` |
| `MYSQLPASSWORD` | Có | Gán từ `${{MySQL.MYSQLPASSWORD}}` |
| `MYSQLDATABASE` | Có | Gán từ `${{MySQL.MYSQLDATABASE}}` |
| `DATABASE_URL` | Không | Gán từ `${{MySQL.MYSQL_URL}}` nếu dùng chuỗi kết nối duy nhất |

---

## 4. Các bước triển khai thực tế trên Railway Dashboard

1. **Tạo Project mới trên Railway**:
   - Truy cập [railway.app](https://railway.app) và đăng nhập.
   - Nhấn **New Project** -> **Deploy from GitHub repo** -> Chọn repository `Billet`.

2. **Thêm Database MySQL**:
   - Trong giao diện project, nhấn **Create** -> **Database** -> **Add MySQL**.
   - Chờ service MySQL khởi tạo xong.

3. **Cấu hình biến môi trường cho Application Service**:
   - Chọn Application Service -> Vào tab **Variables**.
   - Sử dụng tính năng "Add Reference" để liên kết các biến:
     - `MYSQLHOST` = `${{MySQL.MYSQLHOST}}`
     - `MYSQLPORT` = `${{MySQL.MYSQLPORT}}`
     - `MYSQLUSER` = `${{MySQL.MYSQLUSER}}`
     - `MYSQLPASSWORD` = `${{MySQL.MYSQLPASSWORD}}`
     - `MYSQLDATABASE` = `${{MySQL.MYSQLDATABASE}}`
   - Thêm biến `NODE_ENV = production`.
   - Thêm biến `SESSION_SECRET = <chuỗi-bí-mật-bất-kỳ>`.
   - Tạo một `DATA_ENCRYPTION_KEY` riêng, ngẫu nhiên (32 byte, Base64; ví dụ `openssl rand -base64 32`) và lưu trực tiếp trong Railway Variables. Không dùng chung với `SESSION_SECRET`.

4. **Kích hoạt Public Domain**:
   - Chọn Application Service -> Vào tab **Settings** -> **Networking** -> **Generate Domain**.
   - Bạn sẽ nhận được đường dẫn HTTPS công khai dạng `billet-production.up.railway.app`.

5. **Deploy & Migration**:
   - Trước khi deploy migration mã hóa dữ liệu hiện có, tạo backup MySQL, cấu hình `DATA_ENCRYPTION_KEY` ổn định trong Railway Variables và lên lịch bảo trì ngắn để tránh bản ứng dụng cũ đọc/ghi trong lúc schema và dữ liệu đang được chuyển đổi.
   - Khi trigger commit mới vào nhánh `main`, Railway sẽ tự động build và chạy lệnh `npm run migrate && npm start`.
   - Kiểm tra tab **Deploy Logs** để xem quá trình chạy Knex migration thành công.
   - Không thay hoặc xóa `DATA_ENCRYPTION_KEY` sau deploy; muốn xoay khóa cần migration giải mã/mã hóa lại có kế hoạch.

## 5. Mã hóa dữ liệu tài chính

- Ứng dụng mã hóa tiền, tên/ghi chú giao dịch, số dư ví/quỹ, ngân sách, mục tiêu tiết kiệm, khoản chia hóa đơn và nội dung/payload thông báo bằng AES-256-GCM trước khi ghi database.
- API giải mã phía server sau khi xác thực và tiếp tục trả số tiền dạng số nguyên VND cho frontend. Các phép tổng hợp báo cáo và tìm kiếm ghi chú hiện chạy trong ứng dụng sau giải mã, không phải bằng SQL.
- `DATA_ENCRYPTION_KEY` là bắt buộc ở production. Trong development/test khi chưa đặt key, ứng dụng suy ra key tạm từ `SESSION_SECRET`; không dùng cơ chế fallback này cho production.
- SQL khởi tạo rõ ràng nằm trong [server/migrations/sql/schema.mysql.sql](../server/migrations/sql/schema.mysql.sql). Các migration `.sql` được gọi bởi wrapper Knex `.js`, để Knex vẫn theo dõi migration history trên Railway.
- Migration mã hóa dữ liệu hiện hữu là một chiều khi không còn key/backup; không rollback database bằng migration cũ sau khi đã ghi ciphertext.
