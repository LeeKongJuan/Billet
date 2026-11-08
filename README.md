# 💰 Billet — Ứng Dụng Quản Lý Tài Chính Cá Nhân & Quỹ Nhóm

> **Billet** là ứng dụng web quản lý tài chính toàn diện, hỗ trợ quản lý chi tiêu cá nhân, lập ngân sách, tích lũy tiết kiệm, quản lý quỹ nhóm và chia hóa đơn thông minh với thuật toán rút gọn công nợ.

---

## 📌 Mục Lục
- [Giới thiệu & Tính năng chính](#-giới-thiệu--tính-năng-chính)
- [Công nghệ sử dụng (Tech Stack)](#-công-nghệ-sử-dụng-tech-stack)
- [Cấu trúc thư mục dự án](#-cấu-trúc-thư-mục-dự-án)
- [Yêu cầu hệ thống](#-yêu-cầu-hệ-thống)
- [Hướng dẫn Cài đặt (Installation)](#-hướng-dẫn-cài-đặt-installation)
- [Khởi tạo Cơ sở dữ liệu (Migration & Seed)](#-khởi-tạo-cơ-sở-dữ-liệu-migration--seed)
- [Hướng dẫn Khởi chạy (Running)](#-hướng-dẫn-khởi-chạy-running)
- [Tài khoản dùng thử (Demo Accounts)](#-tài-khoản-dùng-thử-demo-accounts)
- [Các lệnh có sẵn (Available Scripts)](#-các-lệnh-có-sẵn-available-scripts)
- [Tài liệu tham khảo chi tiết](#-tài-liệu-tham-khảo-chi-tiết)

---

## 🌟 Giới thiệu & Tính năng chính

### 1. Quản lý Tài chính cá nhân
- **Ví tiền linh hoạt**: Tạo nhiều ví (Ví tiền mặt, Tài khoản ngân hàng, Thẻ tín dụng,...), theo dõi biến động số dư và hỗ trợ **chuyển tiền liên ví** (kiểm tra số dư, giao dịch an toàn).
- **Thu & Chi**: Ghi chép giao dịch nhanh chóng kèm danh mục, ngày, số tiền và ghi chú chi tiết. Tự động kiểm tra và ngăn chặn số dư ví âm.
- **Danh mục phân loại**: Tự tạo và quản lý danh mục thu/chi với biểu tượng phong phú. Hỗ trợ lưu trữ (`archive`) nếu danh mục đã có phát sinh giao dịch.
- **Ngân sách & Hạn mức (Budgets)**: Thiết lập hạn mức chi tiêu hàng tháng theo từng danh mục. Tự động gửi thông báo cảnh báo khi mức chi tiêu chạm ngưỡng **90%** và **100%**.
- **Mục tiêu tiết kiệm (Savings Goals)**: Lập các mục tiêu tích lũy (mua xe, du lịch,...), nạp tiền từ ví vào mục tiêu hoặc rút tiền về lại ví khi hoàn thành.

### 2. Quỹ nhóm (Group Funds)
- **Quản lý quỹ chung**: Tạo quỹ chi tiêu hoặc tiết kiệm chung cho gia đình, hội bạn bè, dự án.
- **Mời thành viên**: Mời qua email hoặc chia sẻ đường link/mã token tham gia tiện lợi.
- **Đóng góp quỹ**: Góp tiền từ ví cá nhân vào quỹ nhóm trong cùng một database transaction nhất quán.
- **Mục tiêu quỹ**: Lập kế hoạch tài chính chung và trừ tiền quỹ khi giải ngân mục tiêu hoàn tất.
- **Phân quyền**: Hỗ trợ quyền **Chủ quỹ (Owner)** và **Thành viên (Member)**, cho phép chuyển giao quyền chủ quỹ khi cần.

### 3. Chia hóa đơn thông minh (Bill Split)
- **Chia tiền linh hoạt**: Hỗ trợ chia đều cho mọi người hoặc chia theo tỷ lệ/số tiền tùy chỉnh lẻ đến từng đồng.
- **Rút gọn công nợ (Simplify Debts Algorithm)**: Tự động tính toán bù trừ công nợ giữa các thành viên, tối ưu số giao dịch cần chuyển tiền xuống tối đa $N - 1$ giao dịch.
- **Theo dõi trạng thái thanh toán**: Đánh dấu các khoản nợ đã thanh toán rõ ràng, minh bạch.

### 4. Báo cáo & Thống kê trực quan
- **Dashboard tổng quan**: Thống kê nhanh tổng tài sản, tổng thu, tổng chi và các giao dịch gần đây.
- **Biểu đồ phân tích (Recharts)**: Phân tích cơ cấu chi tiêu theo danh mục (Pie Chart) và xu hướng thu chi theo thời gian (Bar Chart).

### 5. Bảo mật & An toàn dữ liệu
- **Mã hóa trường nhạy cảm**: Áp dụng mã hóa đối xứng **AES-256-GCM** cho các trường số tiền và dữ liệu tài chính trong database.
- **Giao dịch DB an toàn (ACID)**: Mọi thao tác cập nhật ví, chuyển tiền, đóng góp quỹ đều dùng Knex Transaction với khóa `FOR UPDATE` chống race condition.
- **Xác thực phiên an toàn**: Hash mật khẩu bằng `bcryptjs` (salt 12 rounds), lưu phiên bằng HttpOnly Cookie.

---

## 🛠 Công nghệ sử dụng (Tech Stack)

| Thành phần | Công nghệ / Thư viện |
|---|---|
| **Mô hình kiến trúc** | Modular Monolith, Layered Architecture (Controller - Service - Repository) |
| **Frontend** | React 18, Vite 6, Bootstrap 5.3, React-Bootstrap, React Router DOM v6, TanStack Query (React Query v5), Recharts, Lucide React Icons |
| **Backend** | Node.js (ES Modules), Express.js v4, Knex.js v3, Zod (Data Validation), Helmet, Pino Logger |
| **Cơ sở dữ liệu** | SQLite 3 (`better-sqlite3` — mặc định chạy ngay không cần cài DB) / MySQL 8.x (`mysql2`) |
| **Testing** | Vitest, Supertest |
| **Triển khai (Deployment)** | Tối ưu triển khai trên Railway / Render / VPS |

---

## 📂 Cấu trúc thư mục dự án

Dự án được tổ chức theo kiến trúc **Monorepo / npm workspaces**:

```
Billet/
├── .env                       # File cấu hình biến môi trường cục bộ
├── .env.example               # Mẫu file cấu hình biến môi trường
├── package.json               # Root config cho npm workspaces (client + server)
├── railway.json               # Cấu hình triển khai tự động lên Railway
├── README.md                  # Tài liệu hướng dẫn sử dụng & cài đặt
├── docs/                      # Tài liệu kỹ thuật dự án
│   ├── ARCHITECTURE.md        # Kiến trúc hệ thống và luồng dữ liệu
│   ├── DATABASE.md            # Thiết kế ERD & lược đồ 20 bảng CSDL
│   ├── API.md                 # Quy chuẩn và danh sách các endpoint RESTful API
│   ├── BUSINESS_RULES.md      # Quy tắc nghiệp vụ chi tiết
│   ├── FRONTEND.md            # Kiến trúc giao diện và Mockup
│   └── DEPLOYMENT.md          # Hướng dẫn deploy môi trường Production
│
├── server/                    # [BACKEND] Ứng dụng Express API
│   ├── knexfile.js            # Cấu hình kết nối Knex (SQLite / MySQL)
│   ├── dev_test.sqlite        # File CSDL SQLite cục bộ (khi dùng SQLite)
│   ├── migrations/            # Các file schema migration Knex
│   ├── seeds/                 # Dữ liệu mẫu (01_initial_data.js)
│   ├── tests/                 # Unit test và API test (Vitest)
│   └── src/
│       ├── server.js          # File khởi động HTTP server (lắng nghe PORT 3000)
│       ├── app.js             # Khởi tạo Express app, middleware & static client
│       ├── config/            # Cấu hình biến môi trường (env.js), DB (db.js)
│       ├── middlewares/       # Middleware xác thực (auth), phân quyền, bắt lỗi
│       ├── shared/            # Tiện ích dùng chung (mã hóa AES-256, format tiền tệ)
│       └── modules/           # Các module nghiệp vụ chính:
│           ├── auth/          # Đăng ký, đăng nhập, đổi mật khẩu, phiên người dùng
│           ├── personal-finance/ # Ví, danh mục, giao dịch, ngân sách, mục tiêu
│           ├── group-fund/    # Quỹ nhóm, thành viên, góp tiền, sự kiện quỹ
│           ├── bill-split/    # Chia hóa đơn, thuật toán simplifyDebts
│           ├── reports/       # API tổng hợp số liệu báo cáo, biểu đồ
│           └── notifications/ # Thông báo và cảnh báo ngân sách
│
└── client/                    # [FRONTEND] Ứng dụng React Single Page Application (SPA)
    ├── vite.config.js         # Cấu hình Vite & Proxy chuyển tiếp `/api` sang backend
    ├── index.html             # HTML entry point
    └── src/
        ├── main.jsx           # Khởi tạo React DOM và Provider
        ├── App.jsx            # Điều hướng Route (Public, Protected)
        ├── api/               # Client gọi API (fetch client với cookie credentials)
        ├── context/           # React Context (AuthContext)
        ├── components/        # Component dùng chung (Navbar, Sidebar, Modal, Layout)
        ├── pages/             # Các trang chức năng:
        │   ├── Dashboard.jsx  # Bảng điều khiển tổng quan
        │   ├── Wallets.jsx    # Quản lý ví & chuyển tiền
        │   ├── Transactions.jsx # Danh sách giao dịch thu/chi & bộ lọc
        │   ├── Categories.jsx # Quản lý danh mục thu/chi
        │   ├── Budgets.jsx    # Quản lý ngân sách & cảnh báo 90%
        │   ├── SavingsGoals.jsx # Mục tiêu tích lũy tiết kiệm
        │   ├── GroupFunds.jsx # Quỹ nhóm & đóng góp
        │   ├── JoinFund.jsx   # Tham gia quỹ qua link mời token
        │   ├── BillSplit.jsx  # Chia hóa đơn & rút gọn nợ
        │   ├── Reports.jsx    # Báo cáo biểu đồ tài chính
        │   ├── Settings.jsx   # Đổi mật khẩu & cài đặt cá nhân
        │   ├── Login.jsx      # Đăng nhập
        │   └── Register.jsx   # Đăng ký tài khoản
        ├── styles/            # File CSS tùy chỉnh bổ trợ Bootstrap
        └── utils/             # Helper format tiền tệ (VND), ngày tháng
```

---

## 💻 Yêu cầu hệ thống

Trước khi bắt đầu, hãy đảm bảo máy tính của bạn đã cài đặt:
- **Node.js**: Phiên bản `18.x` trở lên (Khuyến nghị `v20.x LTS` hoặc `v22.x LTS`).
- **npm**: Phiên bản `9.x` hoặc `10.x` (đi kèm sẵn với Node.js).
- *(Tùy chọn)* **MySQL**: Phiên bản `8.0+` nếu bạn muốn dùng MySQL thay vì SQLite.

---

## 📦 Hướng dẫn Cài đặt (Installation)

### Bước 1: Di chuyển vào thư mục dự án
Mở terminal (PowerShell, Command Prompt, Git Bash hoặc Terminal trên macOS/Linux) tại thư mục `Billet`:
```bash
cd /duong-dan-toi/Billet
```

### Bước 2: Cài đặt toàn bộ thư viện dependencies
Dự án sử dụng **npm workspaces**, vì vậy bạn chỉ cần chạy **duy nhất 1 lệnh** tại thư mục gốc để tự động cài đặt cả thư viện cho server và client:
```bash
npm install
```

---

## 🗄 Khởi tạo Cơ sở dữ liệu (Migration & Seed)

### Bước 1: Cấu hình biến môi trường `.env`
Kiểm tra file `.env` tại thư mục gốc (hoặc copy từ `.env.example` nếu chưa có):
```bash
# Windows PowerShell
copy .env.example .env

# Linux / macOS
cp .env.example .env
```

> **Ghi chú về Cơ sở dữ liệu**:
> - **Mặc định (`DB_CLIENT=better-sqlite3`)**: Ứng dụng sử dụng SQLite cục bộ lưu tại `server/dev_test.sqlite`. **Không cần cài đặt MySQL**, cực kỳ tiện lợi để chạy thử ngay lập tức!
> - **Nếu muốn dùng MySQL**: Mở file `.env`, chuyển `DB_CLIENT=mysql2`, tạo database `billet` trong MySQL và cập nhật thông số kết nối:
>   ```env
>   DB_CLIENT=mysql2
>   MYSQLHOST=127.0.0.1
>   MYSQLPORT=3306
>   MYSQLUSER=root
>   MYSQLPASSWORD=mat_khau_mysql_cua_ban
>   MYSQLDATABASE=billet
>   ```

### Bước 2: Chạy Database Migration
Khởi tạo cấu trúc các bảng CSDL:
```bash
npm run migrate
```

### Bước 3: Nạp dữ liệu mẫu ban đầu (Seed)
Nạp bộ danh mục chuẩn và 4 tài khoản người dùng mẫu kèm ví, giao dịch, quỹ nhóm, mục tiêu tiết kiệm:
```bash
npm run seed
```

---

## 🚀 Hướng dẫn Khởi chạy (Running)

### 1. Khởi chạy môi trường Phát triển (Development Mode)
Để khởi chạy đồng thời cả **Backend (Express)** và **Frontend (Vite dev server)** với tính năng tự động reload (Hot Module Replacement):

```bash
npm run dev
```

Sau khi chạy lệnh trên:
- 🌐 **Frontend (Giao diện React)**: [http://localhost:5173](http://localhost:5173)
- 🔌 **Backend API**: [http://localhost:3000](http://localhost:3000)
- 🩺 **Kiểm tra trạng thái API**: [http://localhost:3000/api/health](http://localhost:3000/api/health)

*(Mọi yêu cầu gửi tới `/api` từ giao diện React sẽ được Vite tự động proxy sang cổng 3000).*

---

### 2. Khởi chạy môi trường Sản phẩm (Production Mode)

Để mô phỏng chạy như môi trường triển khai thực tế (Railway / Production Server):

1. **Build mã nguồn frontend**:
   ```bash
   npm run build
   ```
   *(Thao tác này đóng gói mã nguồn client vào thư mục `client/dist`)*.

2. **Khởi động server duy nhất**:
   ```bash
   npm start
   ```
   Server Node.js lúc này sẽ lắng nghe trên cổng `3000`, vừa phục vụ toàn bộ các REST API `/api/*` vừa phục vụ trực tiếp các file tĩnh của trang web tại [http://localhost:3000](http://localhost:3000).

---

## 👤 Tài khoản dùng thử (Demo Accounts)

Sau khi chạy lệnh `npm run seed`, hệ thống đã chuẩn bị sẵn các tài khoản demo với dữ liệu mẫu hoàn chỉnh:

| Họ và tên | Email đăng nhập | Mật khẩu chung | Vai trò mẫu |
|---|---|---|---|
| **Nguyễn Đức Tuấn Việt** | `tuanviet@billet.vn` | `Billet123@` | Chủ tài khoản cá nhân, Chủ quỹ nhóm Du lịch |
| **Lê Công Tuấn** | `congtuan@billet.vn` | `Billet123@` | Thành viên quỹ nhóm, Tham gia chia hóa đơn |
| **Nguyễn Quốc Việt** | `quocviet@billet.vn` | `Billet123@` | Thành viên quỹ nhóm |
| **Nguyễn Phước Hoàng Tú** | `hoangtu@billet.vn` | `Billet123@` | Thành viên quỹ nhóm |

> 💡 *Bạn cũng có thể tự tạo tài khoản mới tại trang [Đăng ký](http://localhost:5173/register). Hệ thống sẽ tự động kích hoạt và cấp phát bộ danh mục thu/chi mặc định.*

---

## 📋 Các lệnh có sẵn (Available Scripts)

Các lệnh thực thi từ thư mục gốc của dự án:

| Lệnh | Ý nghĩa |
|---|---|
| `npm install` | Cài đặt toàn bộ dependencies cho cả client và server |
| `npm run dev` | Khởi chạy đồng thời cả Server (nodemon) và Client (vite) |
| `npm run migrate` | Chạy toàn bộ migrations mới nhất vào cơ sở dữ liệu |
| `npm run migrate:rollback` | Rollback lượt migration gần nhất |
| `npm run seed` | Chạy file seeder để nạp tài khoản và dữ liệu mẫu |
| `npm run build` | Build ứng dụng React (Vite) ra thư mục `client/dist` |
| `npm start` | Chạy backend Express phục vụ API và Static Client ở chế độ production |
| `npm run test` | Chạy kiểm thử tự động với Vitest (thuật toán chia nợ, API) |

---

## 📚 Tài liệu tham khảo chi tiết

Bạn có thể tìm hiểu thêm về kiến trúc và tài liệu chi tiết của dự án trong thư mục `docs/`:
- [BUSINESS_RULES.md](file:///docs/BUSINESS_RULES.md): Toàn bộ luật nghiệp vụ, các mã lỗi chuẩn và điều kiện ràng buộc dữ liệu.
- [ARCHITECTURE.md](file:///docs/ARCHITECTURE.md): Chi tiết kiến trúc Modular Monolith và nguyên tắc thiết kế Service - Repository.
- [DATABASE.md](file:///docs/DATABASE.md): Mô hình thực thể liên kết (ERD), kiểu dữ liệu và định nghĩa 20 bảng CSDL.
- [API.md](file:///docs/API.md): Danh sách các route, phương thức HTTP, request body và response mẫu.
- [FRONTEND.md](file:///docs/FRONTEND.md): Tài liệu hướng dẫn thiết kế UI, các trang chức năng và tích hợp API.
- [DEPLOYMENT.md](file:///docs/DEPLOYMENT.md): Hướng dẫn triển khai ứng dụng lên Railway với MySQL và biến môi trường.
