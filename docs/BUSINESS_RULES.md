# BUSINESS RULES — Billet

Tài liệu này rút gọn các use case (Chương 3), mockup (Chương 4) và kiến trúc (Chương 6) của báo cáo thành luật có thể code được.
Nội dung message lỗi là **chuỗi chuẩn** lấy từ use case, hãy dùng đúng.

## 1. Quy ước chung

- Tiền: số nguyên VND, `> 0` cho mọi số tiền nhập vào (trừ số dư ban đầu của ví: `>= 0`).
- Mọi dữ liệu cá nhân gắn `user_id`; mọi truy vấn phải lọc theo người dùng hiện tại.
- Thao tác lỗi hệ thống: giữ nguyên dữ liệu (rollback), trả 500 với message chung "Đã có lỗi xảy ra, vui lòng thử lại sau".

## 2. Tài khoản

| Luật | Chi tiết |
|---|---|
| Đăng ký | Trường: Tên hiển thị, Email, Mật khẩu, Xác nhận mật khẩu |
| Mật khẩu | >= 8 ký tự, có chữ hoa, chữ thường, chữ số (theo mockup 4.2); UI hiển thị độ mạnh mật khẩu |
| Email | Đúng định dạng, **duy nhất** (so sánh không phân biệt hoa/thường). Trùng → "Email này đã được đăng ký" (gợi ý đăng nhập) |
| Xác nhận mật khẩu | Không khớp → lỗi tại field |
| Đăng nhập sai | "Email hoặc mật khẩu không chính xác" (không tiết lộ cái nào sai) |
| Đăng xuất | Hủy session phía server + client; đóng trình duyệt cũng mất phiên |
| Đổi mật khẩu | Có trong Cài đặt (mockup 4.3): yêu cầu mật khẩu cũ + mật khẩu mới theo cùng quy tắc |

## 3. Ví tiền

- Trường: Tên ví (bắt buộc), Mô tả (tùy chọn), Số dư ban đầu (`>= 0`; lỗi: "Số dư ban đầu không được nhỏ hơn 0", "Tên ví không được bỏ trống").
- Tổng tài sản = tổng số dư các ví `active`.
- Sửa ví: đổi tên và mô tả. **Mặc định: KHÔNG cho sửa số dư trực tiếp** (theo mockup 4.8). Xem mục 11 (mâu thuẫn #2).
- Xóa ví:
  - Chưa từng có giao dịch/chuyển tiền → xóa vĩnh viễn.
  - Đã từng có → chuyển `status = 'inactive'` (ẩn, giữ lịch sử và báo cáo). Hộp thoại xác nhận trước khi xóa.
  - Thông báo: "Xóa ví thành công".
- Ví `inactive` không được dùng cho giao dịch/chuyển tiền mới và không tính vào tổng tài sản hiển thị.
- Chuyển tiền giữa ví:
  - Cần >= 2 ví active; ví nguồn ≠ ví đích; số tiền > 0; trường: ví nguồn, ví đích, số tiền, ghi chú, ngày chuyển.
  - Số dư nguồn không đủ → lỗi "Số dư ví nguồn không đủ để thực hiện chuyển tiền".
  - Tổng tài sản không đổi. **Không** là thu/chi trong báo cáo.
  - UI hiển thị trước số dư 2 ví sau khi chuyển.

## 4. Danh mục

- Phân loại: `expense` (chi tiêu) hoặc `income` (thu nhập); có tên và biểu tượng (icon).
- Tên duy nhất trong các danh mục đang hoạt động của user. Trùng → "Tên danh mục này đã được đặt, vui lòng đặt tên khác".
- Danh sách hiển thị kèm tổng số tiền của từng danh mục.
- Chưa có danh mục → "Bạn chưa có danh mục nào. Vui lòng tạo danh mục mới để bắt đầu quản lý chi tiêu."
- Xóa (một hoặc nhiều, có "Xóa tất cả"): danh mục **chưa có giao dịch** → xóa hẳn; **đã có giao dịch** → `archived` (ẩn khỏi lựa chọn mới, giữ lịch sử).
- Khi đăng ký có thể seed bộ danh mục mặc định (Ăn uống, Di chuyển, Mua sắm, Khác; thu nhập: Lương) — tùy chọn, ghi rõ trong seed.

## 5. Giao dịch

- Trường: tên giao dịch (bắt buộc, tối đa 100 ký tự), loại (chi/thu), số tiền > 0, ví, danh mục (**bắt buộc**), ngày giao dịch, ghi chú (tối đa 100 từ).
- Danh mục phải cùng loại với giao dịch. Nếu user chưa có danh mục → yêu cầu tạo (use case "Chọn danh mục" exception 2a).
- Cập nhật số dư ví trong cùng transaction: chi → trừ, thu → cộng. Không thao tác nào được làm số dư ví âm; khoản chi không được lớn hơn số dư ví. Sửa giao dịch = hoàn tác ảnh hưởng cũ rồi áp dụng mới. Xóa giao dịch thu chỉ được phép nếu hoàn tác không làm số dư âm.
- Tra cứu: tìm theo nội dung (ghi chú), khoảng thời gian, ví, danh mục, loại thu/chi; phân trang; xem chi tiết.
- Xóa nhiều giao dịch + "Xóa tất cả"; có bước xác nhận.
- Sau khi thêm **chi** thành công → đánh giá ngân sách (mục 6).
- Khoản chi không được vượt số dư ví. Nếu có hạn mức tháng, khoản chi mới cũng không được vượt phần ngân sách còn lại.

## 6. Ngân sách (Hạn mức) & cảnh báo 90%

- Hạn mức theo **tháng**, tổng cho toàn bộ chi tiêu của tháng (không chia theo danh mục).
- Mỗi user có **tối đa 1 hạn mức/tháng**. Tạo hạn mức cho tháng hiện tại; đã có thì không tạo thêm trong tháng đó nhưng được **sửa** (số tiền) hoặc **xóa**. Tháng mới mới tạo được hạn mức mới.
- Bỏ trống/<= 0 số tiền → lỗi tại field ("Vui lòng nhập số tiền").
- Hiển thị: đã chi / hạn mức, % sử dụng, còn lại, bảng chi tiêu theo danh mục (số tiền + % tổng chi).
- Chưa có hạn mức → hiển thị lời mời "Tạo hạn mức mới" nhưng vẫn hiện bảng chi tiêu theo danh mục.
- **Cảnh báo**: sau khi thêm/sửa/xóa giao dịch chi, nếu `spent / limit >= 0.9` và chưa cảnh báo cho tháng này → tạo thông báo "Bạn đã sử dụng vượt quá 90% hạn mức!" (loại `budget_alert`) và đặt `alert_sent_at`. Nếu sửa hạn mức hoặc xóa giao dịch làm tỉ lệ < 90% → xóa `alert_sent_at` để có thể cảnh báo lại.
- Khoản chi mới hoặc khoản chi sau khi sửa không được vượt số dư hạn mức còn lại của tháng. Nếu chưa tạo hạn mức thì chỉ kiểm tra số dư ví.
- "Chi tiêu" của tháng = tổng giao dịch `expense` có `occurred_on` trong tháng (không gồm chuyển tiền ví, không gồm nạp mục tiêu tiết kiệm).

## 7. Mục tiêu tiết kiệm cá nhân

- Trường: Tên mục tiêu, Số tiền cần đạt (> 0), Ngày kết thúc (không được ở quá khứ). Lỗi: "thông tin bị thiếu hoặc số tiền <= 0", "ngày kết thúc ở quá khứ: dữ liệu không hợp lệ".
- Hiển thị: tên, số tiền mục tiêu, số đã đạt, thời hạn, % tiến độ; tổng đã tiết kiệm.
- Xóa mục tiêu: người dùng **chọn ví hoàn trả** số tiền đang có trong mục tiêu → cộng vào ví đó (transaction) rồi xóa mục tiêu.
- Suy luận từ mockup 4.15–4.16 (use case không mô tả chi tiết): có thao tác **nạp tiền** vào mục tiêu từ ví (trừ ví, cộng mục tiêu) và **chuyển tiền giữa hai mục tiêu**. Số tiền trong mục tiêu **không** tính vào tổng tài sản ví (đã được trừ khỏi ví lúc nạp). Hai thao tác này không là thu/chi trong báo cáo.

## 8. Quỹ nhóm

### Vai trò & trạng thái
- Vai trò: `owner` (Chủ quỹ, đúng 1 người/quỹ) và `member` (Thành viên).
- Trạng thái quỹ: `active` | `dissolved`. Quỹ `dissolved`: chặn mọi thao tác ghi, báo "Quỹ này không còn hoạt động"; ẩn khỏi danh sách mọi thành viên.

### Tạo quỹ
- Trường: Tên quỹ (bắt buộc), Mô tả, Biểu tượng. Người tạo thành `owner`; số dư = 0; trạng thái `active`.
- Có thể mời thành viên ngay lúc tạo (mockup 4.17).

### Xem quỹ
- Danh sách quỹ user đang tham gia. Chi tiết: tên, mô tả, thành viên + vai trò, tổng số dư, lịch sử giao dịch quỹ, danh sách mục tiêu (tên, số tiền, thời hạn, trạng thái), **thanh tiến độ tổng** = số dư quỹ / tổng số tiền các mục tiêu đang `accumulating`.
- Không phải thành viên (truy cập bằng URL) → 403 "Bạn không có quyền truy cập quỹ này".
- Chưa có mục tiêu → gợi ý "Đặt mục tiêu chung" thay cho thanh tiến độ.

### Đóng góp
- Trường: Số tiền (số nguyên > 0), Ví tiền, Ghi chú. Lưu kèm người đóng; cộng vào số dư quỹ; mọi thành viên thấy trong lịch sử.
- Quỹ đã giải tán → "Quỹ này không còn hoạt động".
- Bắt buộc chọn ví cá nhân đang hoạt động; số dư ví phải đủ. Trừ ví và cộng quỹ trong cùng một database transaction; nếu một bước lỗi thì rollback toàn bộ.

### Mời thành viên
- Mọi thành viên gửi được lời mời. Cách 1: tìm theo **Email hoặc Username** (tên hiển thị), chọn một hoặc nhiều người → tạo lời mời `pending` + thông báo.
  - Người đã là thành viên bị ẩn khỏi kết quả.
  - Người đã có lời mời `pending` → chặn chọn, cảnh báo "Người dùng này đã được mời".
  - Không chọn ai → "Vui lòng chọn ít nhất 1 người dùng để gửi lời mời".
- Cách 2: **link mời** (token ngẫu nhiên, hết hạn mặc định 7 ngày). Người mở link phải đăng nhập, xem tên quỹ, bấm "Tham gia". Link hết hạn/thu hồi → "Liên kết mời không còn hiệu lực".
- Người được mời: Chấp nhận (thêm vào quỹ, báo người mời) hoặc Từ chối (`declined`, báo "Lời mời của bạn đã bị từ chối").
- Lời mời đã xử lý trước đó → "Lời mời này không còn tồn tại". Quỹ đã giải tán → "Quỹ này không còn hoạt động".
- Báo cáo nhắc đến "mã QR": QR chỉ là hiển thị của link mời (UI), không cần cơ chế riêng.

### Mục tiêu chung
- Trường: Tên mục tiêu (bắt buộc), Số tiền cần đạt (> 0), Ngày dự kiến (tùy chọn, nếu có không được ở quá khứ).
- Trạng thái ban đầu `accumulating`. Hỗ trợ tạo / sửa / xóa (có xác nhận).
- **Đánh dấu hoàn thành** (xác nhận trước): chỉ khả dụng khi số dư quỹ **lớn hơn** số tiền mục tiêu; nếu số dư bằng hoặc thấp hơn thì chặn cả ở giao diện lẫn API.
  - Trừ đúng số tiền mục tiêu khỏi số dư quỹ. Ghi 1 giao dịch quỹ loại chi (`goal_completion`) với đúng số tiền đã trừ.
  - Mục tiêu đã hoàn thành rồi → "Mục tiêu này đã được hoàn thành". Gửi thông báo tới thành viên.

### Rời quỹ
- Cảnh báo: "Bạn có chắc chắn muốn rời khỏi quỹ? Các khoản bạn đã đóng góp sẽ không được hoàn lại."
- Lịch sử đóng góp của người rời **giữ nguyên**. Gửi thông báo tới thành viên còn lại.
- Chủ quỹ muốn rời: phải chuyển quyền cho 1 thành viên ("Hãy chuyển quyền Chủ quỹ cho một thành viên khác trước khi rời quỹ"). Nếu là thành viên duy nhất → "Bạn là thành viên duy nhất, vui lòng giải tán quỹ thay vì rời quỹ".

### Giải tán
- Chỉ Chủ quỹ ("Chỉ Chủ quỹ mới có quyền giải tán quỹ"). Hộp thoại cảnh báo không thể khôi phục + hiển thị số dư hiện có. Chuyển `dissolved`, thu hồi quyền, thông báo từng thành viên. Đã giải tán → "Quỹ này đã được giải tán".

### Đổi vai trò (mockup 4.19)
- Chỉ Chủ quỹ đổi vai trò. **Mặc định:** đặt người khác thành `owner` = chuyển quyền (chủ cũ thành `member`), luôn đúng 1 `owner`.

## 9. Chia hóa đơn

### Thực thể
- **Hóa đơn** (bill): tên, trạng thái `open` | `closed`, người tạo. Người tạo luôn là người tham gia.
- **Người tham gia**: `display_name`, có thể gắn `user_id` (nếu là người dùng Billet) hoặc chỉ là tên (khách).
- **Hoạt động**: tên/nhãn, tổng tiền > 0, người ứng trước (chọn trong người tham gia), danh sách người tham gia hoạt động, cách chia `equal` | `custom`.

### Chia tiền
- **Chia đều**: `base = floor(total / n)`, `remainder = total % n`. Sắp xếp người tham gia hoạt động theo `participant.id` tăng dần; `remainder` người đầu tiên nhận thêm 1 đồng. → Tổng các phần **luôn bằng** `total`.
- **Chia không đều**: người dùng nhập số tiền từng người; nếu tổng ≠ tổng hoạt động → lỗi, không lưu.
- Người ứng trước có thể không nằm trong danh sách chia (vẫn hợp lệ).

### Bảng nợ rút gọn (thuật toán bắt buộc)
```text
net[p] = Σ(số tiền p đã ứng trước) − Σ(phần chia của p)      // >0: được nhận, <0: phải trả
creditors = những p có net > 0 (sắp giảm dần theo net, hòa thì theo id)
debtors   = những p có net < 0 (sắp giảm dần theo |net|, hòa thì theo id)
lặp: ghép debtor lớn nhất với creditor lớn nhất
     t = min(|net_debtor|, net_creditor)
     ghi nhận "debtor trả creditor t"; trừ t cả hai phía
     loại bỏ ai về 0
```
- Kết quả: tối đa `n − 1` giao dịch trả nợ, loại nợ chéo. Σ net = 0 là bất biến (assert trong test).
- Hóa đơn `open`: bảng nợ **tính động** mỗi lần xem (không lưu).
- **Kết thúc hóa đơn**: chốt bảng nợ → lưu `bill_settlements` (`is_paid = false`), đổi `closed`, khóa thêm/sửa hoạt động.
- Hóa đơn `closed`: chỉ hiển thị các khoản trả nợ + trạng thái đã trả; đánh dấu `đã trả` và **bỏ đánh dấu** (uncheck) được. Chỉ cho đánh dấu khi hóa đơn đã kết thúc.
- Đánh dấu đã trả **không** tạo giao dịch ví.
- Quyền xem hóa đơn: người tạo và người tham gia có `user_id`. Ai thêm được hoạt động: **mặc định** mọi người tham gia có tài khoản (xem #8).

### Test bắt buộc cho thuật toán
- 100.000 chia 3 → 33.334 / 33.333 / 33.333.
- Ví dụ từ mockup: Hoạt động 1 = 600.000 (Tuấn ứng, chia đều 3 → mỗi người 200.000), Hoạt động 2 = 300.000 (chia 3, phần Tuấn/Việt/Linh = 100.000 / 50.000 / 150.000 — chia không đều hoặc khác) → bảng nợ phải đúng, Σ net = 0.
- Nhiều người ứng trước, nợ vòng tròn A→B→C→A phải rút về 0 giao dịch.
- Không có hoạt động → bảng nợ rỗng.
- Property test: với dữ liệu ngẫu nhiên, Σ phần chia = tổng; Σ net = 0; số giao dịch ≤ n−1; sau khi áp dụng tất cả giao dịch thì mọi net = 0.

## 10. Báo cáo

- Khoảng thời gian: Tuần này, Tháng này (mặc định), Tháng trước, Năm nay, Tùy chọn ngày; có thể lọc theo ví.
- Thẻ tổng quan: Tổng tài sản (tổng số dư ví active), Tổng thu, Tổng chi, chênh lệch thu − chi.
- Biểu đồ tròn/donut: cơ cấu **chi tiêu** theo danh mục (tên, số tiền, %).
- Biểu đồ cột/đường: xu hướng thu vs. chi theo thời gian (nhóm theo ngày/tuần/tháng tùy khoảng).
- So sánh với kỳ liền trước (tổng thu, tổng chi, số dư; % thay đổi).
- Không có dữ liệu → biểu đồ rỗng + "Chưa có dữ liệu ghi chép thu chi trong khoảng thời gian này". Lỗi tải → "Không thể tải dữ liệu báo cáo, vui lòng thử lại sau".
- Tổng tài sản khi chưa có ví = 0 và gợi ý tạo ví.
- Báo cáo **loại trừ**: chuyển tiền giữa ví, nạp/chuyển mục tiêu tiết kiệm, đóng góp quỹ, thanh toán nợ.

## 11. Điểm cần quyết định (mâu thuẫn/thiếu sót trong báo cáo) và giá trị mặc định

Agent dùng cột "Mặc định", ghi chú trong commit. Nhóm có thể đổi sau.

| # | Vấn đề | Nguồn mâu thuẫn | Mặc định |
|---|---|---|---|
| 1 | Đóng góp quỹ có trừ ví cá nhân không? | UC 3.28 có chọn "Ví tiền" và nói "được tính là giao dịch"; Chương 6.5 nói không tự động trừ ví | **Có trừ ví đã chọn**, cùng transaction với việc cộng tiền vào quỹ |
| 2 | Có sửa số dư ví trực tiếp không? | UC 3.7 cho "Số dư điều chỉnh"; mockup 4.8 nói không sửa được số dư | **Không sửa trực tiếp** qua API sửa ví |
| 3 | Cảnh báo "vượt 90%" hay "từ 90% trở lên" | UC 3.17 vs. mockup 4.5 | **>= 90%** |
| 4 | Ai sửa/xóa mục tiêu quỹ | UC: mọi thành viên; mockup 4.18: Chủ quỹ | **Mọi thành viên** (theo use case) |
| 5 | Thuật ngữ "Chủ quỹ" / "Trưởng nhóm" | Trộn lẫn trong báo cáo | Dùng **Chủ quỹ** (`owner`) |
| 6 | Chi vượt số dư ví/ngân sách | Không nói rõ | **Chặn** khoản chi vượt số dư ví hoặc phần hạn mức tháng còn lại |
| 7 | Người tham gia hóa đơn là khách (không có tài khoản) | Mockup cho nhập tên tự do | **Cho phép** tham gia dạng tên; chỉ người có `user_id` mới thấy hóa đơn trong danh sách của mình |
| 8 | Ai thêm hoạt động vào hóa đơn | Không nói rõ | Người tạo + người tham gia có tài khoản |
| 9 | Username khi mời thành viên | Đăng ký chỉ có "Tên hiển thị", không unique | Tìm theo **email (khớp chính xác)** hoặc **tên hiển thị (khớp một phần)**; hiển thị kèm email đã che (`t***@x.com`) |
| 10 | Xóa danh mục đã có giao dịch | Không nói rõ | **Archive** thay vì xóa hẳn |
| 11 | Mục tiêu tiết kiệm cá nhân: cách nạp tiền | UC không có, mockup có "Chuyển tiền" | Nạp từ ví; chuyển giữa mục tiêu (mục 7) |
| 12 | "Ngày nộp" ở trang bìa | Để trống | Không liên quan code |
