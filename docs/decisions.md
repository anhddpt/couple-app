# Decision Log

Tài liệu này ghi lại các quyết định sản phẩm và kỹ thuật đã được chủ dự án xác nhận. Những mục có trạng thái `Pending` chưa được dùng làm cơ sở để viết migration hoặc business logic production.

## Trạng thái

- `Accepted`: đã chốt, tài liệu và code phải tuân theo.
- `Proposed`: có khuyến nghị nhưng chưa được chủ dự án xác nhận.
- `Pending`: cần thêm thông tin hoặc lựa chọn.
- `Rejected`: đã xem xét nhưng không sử dụng.

## DEC-001 - Pairing một bước có consent rõ ràng

**Status:** Accepted

Người tạo invitation được xem là đã đồng ý ghép đôi khi chủ động tạo và chia sẻ mã. Người nhập mã được xem preview tối thiểu của người mời và phải bấm xác nhận. Couple chỉ được kích hoạt sau lần xác nhận này.

Hệ quả:

- Không cần bước người tạo mã xác nhận lần hai.
- Invitation phải single-use, có thời hạn và có thể revoke.
- Preview không được lộ dữ liệu riêng tư ngoài tên hiển thị và avatar công khai tối thiểu.

## DEC-002 - Thị trường và ngôn ngữ đầu tiên

**Status:** Accepted

Sản phẩm dành cho mọi cặp đôi, không giới hạn ở cặp đôi yêu xa. Thị trường đầu tiên là người dùng Việt Nam.

Ứng dụng phải có kiến trúc i18n ngay từ đầu:

- `vi` là ngôn ngữ sản phẩm đầu tiên.
- `en` là fallback locale.
- Mọi key phải có bản dịch tiếng Anh.
- Không hardcode nội dung hiển thị trực tiếp trong component.
- Thiếu key ở locale hiện tại phải fallback về nội dung tiếng Anh, không hiển thị raw key cho người dùng production.

## DEC-003 - Không xây hệ thống chat

**Status:** Accepted

MVP không có chat tự do và không cho người dùng nhập nội dung message tùy ý.

Ứng dụng chỉ sử dụng:

- Action đã định nghĩa sẵn.
- Push notification được sinh từ action.
- Animation tương ứng.
- Câu phản ứng cấu hình sẵn theo action, ví dụ "Á!", "Đau nha", "Haha" hoặc trạng thái biểu cảm tương ứng.

Các câu phản ứng là localization key do ứng dụng kiểm soát, không phải user-generated content.

## DEC-004 - Không có read receipt công khai

**Status:** Accepted

Không hiển thị trạng thái "đã xem" cho người gửi. Backend có thể lưu trạng thái kỹ thuật để tránh phát lại animation nhưng dữ liệu này không được dùng làm read receipt trong UI.

## DEC-005 - Không có reply thread trong MVP

**Status:** Accepted

Mỗi action là một interaction độc lập. MVP không cần `reply_to_interaction_id`, thread hoặc chỉ số `interaction_replied`.

Người nhận có thể tự gửi một action mới, nhưng app không khẳng định action đó là phản hồi cho interaction trước.

## DEC-006 - Chỉ phát action mới nhất khi mở app

**Status:** Accepted

Nếu người nhận có nhiều interaction chưa được phát, khi mở phòng chung app chỉ chạy animation của interaction mới nhất. Các interaction cũ hơn không được phát tuần tự.

Backend cần một consumption cursor nội bộ để tránh phát lại action cũ. Cursor này không được hiển thị cho partner và không mang ý nghĩa read receipt.

## DEC-007 - Authentication

**Status:** Accepted

Production sử dụng email OTP. Không yêu cầu người dùng quản lý mật khẩu.

Local development có thể dùng mail viewer của Supabase local hoặc cơ chế development-only để đăng nhập test. Cơ chế local không được đóng gói hoặc bật trong production build.

## DEC-008 - Android-first

**Status:** Accepted

Pilot và version đầu tiên tập trung Android. iOS được giữ trong định hướng kiến trúc React Native nhưng không phải điều kiện hoàn thành pilot đầu tiên.

## DEC-009 - Nguồn asset avatar

**Status:** Accepted

Ưu tiên asset open-source có giấy phép rõ ràng và cho phép sử dụng thương mại, chỉnh sửa và phân phối trong ứng dụng.

Nếu asset open-source không đủ, dự án có thể sử dụng asset AI-generated sau khi kiểm tra:

- Điều khoản thương mại của công cụ tạo ảnh.
- Tính nhất quán giữa các layer.
- Nguồn prompt/reference không xâm phạm IP bên thứ ba.
- Lưu lại nguồn, giấy phép và ngày tải/tạo asset.

## DEC-010 - Design tokens tập trung

**Status:** Accepted

Mọi màu sắc trong source phải được lấy từ một theme/token module tập trung, dự kiến `src/theme/colors.ts` hoặc tương đương.

Không hardcode mã màu trong screen/component, ngoại trừ asset hoặc trường hợp kỹ thuật được ghi chú rõ. CI hoặc lint rule sẽ được cân nhắc để phát hiện màu hardcode.

## DEC-011 - Hai lựa chọn đóng tài khoản

**Status:** Accepted

Ứng dụng cung cấp hai lựa chọn riêng biệt:

- Vô hiệu hóa: tạm dừng account vô thời hạn, ẩn account khỏi partner và khóa interaction. User có thể restore bất cứ lúc nào bằng cách đăng nhập lại và xác nhận kích hoạt.
- Xóa hoàn toàn: xóa account và dữ liệu liên quan theo chính sách đã công bố.

Google Play không coi vô hiệu hóa là thay thế cho xóa tài khoản. Vì app cho phép tạo account, production phải có đường xóa account trong app và một web resource để yêu cầu xóa.

Tham chiếu chính thức:

- Google Play User Data policy: https://support.google.com/googleplay/android-developer/answer/10144311
- Account deletion requirements: https://support.google.com/googleplay/android-developer/answer/13327111

Việc gỡ cài đặt app không tự động deactivate account vì backend không nhận được một tín hiệu đáng tin cậy khi người dùng uninstall. User đã uninstall chỉ cần cài lại và đăng nhập OTP để tiếp tục.

## DEC-012 - Notification privacy

**Status:** Accepted

Việc gửi nội dung action trong notification không tự động làm app bị từ chối phát hành, nhưng nội dung đó có thể xuất hiện trên lock screen và được xem là dữ liệu quan hệ nhạy cảm.

Android pilot hỗ trợ ba chế độ do người dùng chọn:

- Xin quyền notification theo ngữ cảnh trên Android 13+.
- Notification channel dùng lock-screen visibility `PRIVATE`.
- `generic`: "Bạn vừa nhận một action mới"; đây là mặc định.
- `sender_only`: "Bạn có tương tác mới từ Minh".
- `detailed`: "Minh vừa hôn bạn".
- Privacy policy và Google Play Data safety phải mô tả đúng dữ liệu được thu thập, lưu và dùng để gửi notification.

Tham chiếu chính thức:

- Android notification permission: https://developer.android.com/develop/ui/compose/notifications/notification-permission
- Android lock-screen visibility: https://developer.android.com/design/ui/mobile/guides/home-screen/notifications

## DEC-013 - Hành vi khi tắt action

**Status:** Accepted

Sử dụng hai lớp setting:

- `action_enabled`: nếu tắt, backend từ chối action trước khi lưu, realtime và push. Người gửi nhận lỗi chung rằng action hiện không gửi được.
- `push_enabled`: nếu tắt, interaction vẫn tồn tại trong app nhưng không phát push notification.

## DEC-014 - Active membership invariant

**Status:** Accepted

Sử dụng bảng `active_couple_memberships` có `user_id` unique. Pairing transaction tạo hai active membership; end-couple transaction xóa chúng. `couple_members` vẫn giữ vai trò lịch sử.

## DEC-015 - Độ tin cậy của push delivery

**Status:** Accepted

V1 sử dụng durable outbox. Interaction và notification delivery job phải được tạo cùng transaction. Worker gửi push, retry có giới hạn và lưu kết quả theo device.

## DEC-016 - Hard delete interaction

**Status:** Accepted

Khi user yêu cầu xóa hoàn toàn, hệ thống xóa mọi interaction có user đó là sender hoặc receiver. Partner cũng không còn thấy các interaction này.

Deactivate không xóa dữ liệu; dữ liệu chỉ bị ẩn và account có thể restore bất cứ lúc nào, trừ khi user đã yêu cầu hard delete.

## DEC-017 - Unmatch và dữ liệu sau unmatch

**Status:** Accepted

Unmatch là hành động riêng với deactivate và hard delete:

- Couple chuyển sang `ended` ngay lập tức.
- Hai user bị xóa khỏi `active_couple_memberships`.
- Profile và avatar của partner bị ẩn ngay.
- Không thể gửi action mới.
- Interaction của couple được giữ 10 ngày rồi xóa tự động.
- Nếu hai người ghép lại, hệ thống tạo couple mới; không tự phục hồi couple cũ.

## DEC-018 - Asset catalog V1

**Status:** Accepted

V1 dùng asset manifest đóng gói trong app với ID ổn định. Không cần bảng asset catalog trong database. Mỗi asset phải có provenance record gồm nguồn, giấy phép, quyền thương mại và ngày tải/tạo.

## DEC-019 - Mood-driven action

**Status:** Accepted

Mỗi user có một mood hiện tại: `happy`, `angry` hoặc `sad`. Mood mặc định là `happy` và do user chủ động thay đổi.

Mood của người gửi quyết định action khi họ chạm cùng một vùng trên avatar đối phương. Mood của người nhận không tham gia resolve. Mapping đầu tiên cho vùng đầu:

| Mood người gửi | Chạm vùng đầu | Action |
|---|---|---|
| `happy` | Xoa đầu | `HEAD_PAT` |
| `angry` | Gõ đầu | `BONK` |
| `sad` | Đẩy ra | `PUSH_AWAY` |

Các vùng khác giữ mapping cố định trong Phase 1 cho đến khi có bảng mapping được xác nhận. Backend resolve action từ mood hiện tại và vùng chạm thay vì tin hoàn toàn action do client gửi.

Trên thiết bị người nhận, avatar người gửi là actor: đổi sang biểu cảm mood snapshot rồi thực hiện action lên avatar người nhận là target. Ví dụ A đang `angry` chạm đầu B thì trên máy B, avatar A đổi mặt angry và gõ đầu avatar B.
