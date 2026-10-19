# Tài liệu Couple App

Thư mục này chứa đặc tả sản phẩm, định hướng thiết kế và kế hoạch kỹ thuật của Couple App. Đây là nguồn tham chiếu chính trước khi bắt đầu viết code.

## Thứ tự đọc

1. [Đặc tả sản phẩm](product-spec.md): sản phẩm giải quyết vấn đề gì, dành cho ai và MVP gồm những gì.
2. [Decision log](decisions.md): các quyết định đã chốt và các điểm còn pending.
3. [Pilot plan](pilot-plan.md): phạm vi Android-first nhỏ nhất để kiểm chứng core loop.
4. [Định hướng UX/UI](ux-ui-design.md): phong cách hình ảnh, luồng màn hình và nguyên tắc tương tác.
5. [Mood và action matrix](mood-action-matrix.md): cách mood thay đổi action và nội dung phản ứng mặc định.
6. [Kiến trúc kỹ thuật](technical-architecture.md): stack, module, luồng realtime, notification và bảo mật.
7. [Mô hình dữ liệu](data-model.md): bảng dữ liệu, quan hệ và chính sách truy cập.
8. [Roadmap triển khai](implementation-roadmap.md): thứ tự xây dựng, acceptance criteria và điều kiện hoàn thành MVP.
9. [Hướng dẫn phát triển](development.md): cách chạy mobile, Supabase, Edge Functions và scheduler.

## Quyết định đã chốt

| Chủ đề | Quyết định |
|---|---|
| Nền tảng đầu tiên | Android-first; iOS ở phase sau |
| Mobile framework | React Native với Expo và TypeScript |
| Backend | Supabase |
| Realtime | Supabase Realtime |
| Push notification | Expo Notifications, FCM và APNs |
| Phong cách giao diện | Pastel ấm, tối giản |
| Avatar MVP | Ghép từ các layer PNG/SVG, animation bằng Reanimated |
| Authentication | Email OTP; local có cơ chế test riêng |
| Ngôn ngữ | Tiếng Việt, fallback tiếng Anh |
| Chat | Không có chat hoặc message tự do |
| Phạm vi hiện tại | Phase 1 và Phase 2 Core đã có source Android-first |

## Quyết định còn mở

- Tên thương mại chính thức của ứng dụng.
- Bộ nhận diện và logo chính thức.
- Nguồn asset chibi và giấy phép sử dụng asset.
- Có dùng Rive sau MVP hay tiếp tục phát triển hệ thống sprite/layer.
- Chính sách lưu lịch sử tương tác dài hạn.
- Mô hình thu phí sau khi MVP được kiểm chứng.
- Thời hạn lưu dữ liệu kỹ thuật trong backup và log.
- Mapping mood/action cho các vùng ngoài vùng đầu.

## Quy ước cập nhật

- Thay đổi phạm vi sản phẩm phải được cập nhật trong `product-spec.md`.
- Thay đổi stack hoặc ranh giới module phải được cập nhật trong `technical-architecture.md`.
- Thay đổi schema phải được cập nhật trong `data-model.md` trước hoặc cùng lúc với migration.
- Một milestone chỉ được đánh dấu hoàn thành khi đạt acceptance criteria trong `implementation-roadmap.md`.
- Các quyết định lớn chưa đủ thông tin phải được ghi là câu hỏi mở, không được ngầm coi là đã chốt.
