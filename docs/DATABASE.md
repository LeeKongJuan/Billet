# DATABASE — Billet

Tài liệu thiết kế cơ sở dữ liệu MySQL 8+ cho hệ thống Billet.

## 1. Thiết lập CSDL
- Hệ quản trị CSDL: **MySQL 8.0+**
- Storage Engine: **InnoDB** (bắt buộc cho foreign keys & transactions)
- Character set: **utf8mb4**
- Collation: **utf8mb4_unicode_ci**
- Timezone lưu trữ: **UTC**
- Đơn vị tiền tệ ở API/nghiệp vụ: số nguyên VND. Các số tiền nhạy cảm được lưu dưới dạng ciphertext AES-256-GCM trong cột `TEXT`; không thể dùng SQL `SUM`/so sánh số trực tiếp.
- Schema SQL dùng để khởi tạo MySQL mới: [server/migrations/sql/schema.mysql.sql](../server/migrations/sql/schema.mysql.sql). Các migration tăng phiên bản nằm trong `server/migrations/sql/` và được Knex gọi qua migration wrapper `.js` để giữ lịch sử deploy.
- Key mã hóa lấy từ `DATA_ENCRYPTION_KEY`, chỉ giữ trong secret manager/biến môi trường của ứng dụng, tuyệt đối không lưu trong database hoặc Git.

---

## 2. Danh sách các bảng

1. `users` — Tài khoản người dùng
2. `sessions` — Phiên đăng nhập (SHA-256 hash của session cookie)
3. `wallets` — Ví tiền cá nhân
4. `wallet_transfers` — Lịch sử chuyển tiền giữa hai ví
5. `categories` — Danh mục thu/chi
6. `transactions` — Giao dịch thu/chi cá nhân
7. `budgets` — Hạn mức chi tiêu theo tháng
8. `savings_goals` — Mục tiêu tiết kiệm cá nhân
9. `savings_goal_movements` — Biến động tiền mục tiêu tiết kiệm (nạp/chuyển/rút)
10. `group_funds` — Quỹ nhóm
11. `group_fund_members` — Thành viên quỹ nhóm (owner / member)
12. `group_fund_invitations` — Lời mời tham gia quỹ (trực tiếp hoặc liên kết)
13. `group_fund_goals` — Mục tiêu tích lũy của quỹ nhóm
14. `group_fund_transactions` — Lịch sử giao dịch quỹ (đóng góp, chi hoàn thành mục tiêu)
15. `bills` — Hóa đơn chia tiền
16. `bill_participants` — Người tham gia hóa đơn
17. `bill_activities` — Các hoạt động chi tiêu trong hóa đơn
18. `bill_activity_shares` — Chi tiết phần tiền chia cho từng người trong hoạt động
19. `bill_settlements` — Bảng nợ rút gọn đã chốt khi kết thúc hóa đơn
20. `notifications` — Thông báo trong hệ thống

---

## 3. Schema DDL chi tiết (Tham chiếu)

```sql
-- 1. Users
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  display_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Sessions
CREATE TABLE sessions (
  id VARCHAR(64) PRIMARY KEY, -- SHA-256 token hash
  user_id INT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_sessions_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Wallets
CREATE TABLE wallets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT NULL,
  balance TEXT NOT NULL,
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_wallets_user_status (user_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Wallet Transfers
CREATE TABLE wallet_transfers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  from_wallet_id INT NOT NULL,
  to_wallet_id INT NOT NULL,
  amount TEXT NOT NULL,
  note TEXT NULL,
  transferred_on DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (from_wallet_id) REFERENCES wallets(id),
  FOREIGN KEY (to_wallet_id) REFERENCES wallets(id),
  INDEX idx_transfers_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Categories
CREATE TABLE categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  type ENUM('expense', 'income') NOT NULL,
  icon VARCHAR(50) NOT NULL DEFAULT 'tag',
  status ENUM('active', 'archived') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_categories_user_type_status (user_id, type, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Transactions
CREATE TABLE transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name TEXT NOT NULL,
  wallet_id INT NOT NULL,
  category_id INT NOT NULL,
  type ENUM('expense', 'income') NOT NULL,
  amount TEXT NOT NULL,
  occurred_on DATE NOT NULL,
  note TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (wallet_id) REFERENCES wallets(id),
  FOREIGN KEY (category_id) REFERENCES categories(id),
  INDEX idx_transactions_user_date (user_id, occurred_on),
  INDEX idx_transactions_wallet (wallet_id),
  INDEX idx_transactions_category (category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Budgets
CREATE TABLE budgets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  month VARCHAR(7) NOT NULL, -- 'YYYY-MM'
  amount TEXT NOT NULL,
  alert_sent_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_budgets_user_month (user_id, month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Savings Goals
CREATE TABLE savings_goals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  target_amount TEXT NOT NULL,
  current_amount TEXT NOT NULL,
  target_date DATE NOT NULL,
  status ENUM('accumulating', 'completed') NOT NULL DEFAULT 'accumulating',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_savings_goals_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Savings Goal Movements
CREATE TABLE savings_goal_movements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  source_type ENUM('wallet', 'savings_goal') NOT NULL,
  source_id INT NOT NULL,
  dest_type ENUM('wallet', 'savings_goal') NOT NULL,
  dest_id INT NOT NULL,
  amount TEXT NOT NULL,
  note TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Group Funds
CREATE TABLE group_funds (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT NULL,
  icon VARCHAR(50) DEFAULT 'users',
  balance TEXT NOT NULL,
  status ENUM('active', 'dissolved') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Group Fund Members
CREATE TABLE group_fund_members (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_fund_id INT NOT NULL,
  user_id INT NOT NULL,
  role ENUM('owner', 'member') NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_fund_id) REFERENCES group_funds(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY uq_fund_user (group_fund_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Group Fund Invitations
CREATE TABLE group_fund_invitations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_fund_id INT NOT NULL,
  inviter_user_id INT NOT NULL,
  invitee_user_id INT NULL,
  invite_token VARCHAR(64) NULL UNIQUE,
  status ENUM('pending', 'accepted', 'declined', 'expired') NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (group_fund_id) REFERENCES group_funds(id) ON DELETE CASCADE,
  FOREIGN KEY (inviter_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (invitee_user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_invitations_invitee (invitee_user_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Group Fund Goals
CREATE TABLE group_fund_goals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_fund_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  target_amount TEXT NOT NULL,
  target_date DATE NULL,
  status ENUM('accumulating', 'completed') NOT NULL DEFAULT 'accumulating',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (group_fund_id) REFERENCES group_funds(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Group Fund Transactions
CREATE TABLE group_fund_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_fund_id INT NOT NULL,
  user_id INT NOT NULL,
  wallet_id INT NULL,
  type ENUM('contribution', 'goal_completion') NOT NULL,
  amount TEXT NOT NULL,
  note TEXT NULL,
  occurred_on DATE NOT NULL,
  goal_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_fund_id) REFERENCES group_funds(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE SET NULL,
  FOREIGN KEY (goal_id) REFERENCES group_fund_goals(id) ON DELETE SET NULL,
  INDEX idx_fund_tx_fund (group_fund_id, occurred_on)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. Bills
CREATE TABLE bills (
  id INT AUTO_INCREMENT PRIMARY KEY,
  creator_user_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  status ENUM('open', 'closed') NOT NULL DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (creator_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. Bill Participants
CREATE TABLE bill_participants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bill_id INT NOT NULL,
  user_id INT NULL,
  display_name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. Bill Activities
CREATE TABLE bill_activities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bill_id INT NOT NULL,
  name TEXT NOT NULL,
  total_amount TEXT NOT NULL,
  paid_by_participant_id INT NOT NULL,
  split_type ENUM('equal', 'custom') NOT NULL DEFAULT 'equal',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE,
  FOREIGN KEY (paid_by_participant_id) REFERENCES bill_participants(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 18. Bill Activity Shares
CREATE TABLE bill_activity_shares (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bill_activity_id INT NOT NULL,
  participant_id INT NOT NULL,
  amount TEXT NOT NULL,
  FOREIGN KEY (bill_activity_id) REFERENCES bill_activities(id) ON DELETE CASCADE,
  FOREIGN KEY (participant_id) REFERENCES bill_participants(id) ON DELETE CASCADE,
  UNIQUE KEY uq_act_participant (bill_activity_id, participant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 19. Bill Settlements
CREATE TABLE bill_settlements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bill_id INT NOT NULL,
  debtor_participant_id INT NOT NULL,
  creditor_participant_id INT NOT NULL,
  amount TEXT NOT NULL,
  is_paid BOOLEAN NOT NULL DEFAULT FALSE,
  paid_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE,
  FOREIGN KEY (debtor_participant_id) REFERENCES bill_participants(id),
  FOREIGN KEY (creditor_participant_id) REFERENCES bill_participants(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 20. Notifications
CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type ENUM('budget_alert', 'fund_invitation', 'fund_event') NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  data TEXT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_notif_user_unread (user_id, is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```
