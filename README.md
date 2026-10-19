# Couple App

Couple App là ứng dụng di động dành cho các cặp đôi, cho phép mỗi người tạo một nhân vật chibi đại diện cho mình, ghép đôi với người yêu và gửi cảm xúc thông qua các tương tác trực tiếp trên nhân vật.

Thay vì chỉ nhắn những câu như "em đói", "anh nhớ em" hoặc "em muốn được ôm", người dùng có thể chạm vào nhân vật để gửi một hành động ngắn, có animation và thông báo tương ứng cho đối phương.

## Trạng thái dự án

Phase 1 và Phase 2 Core đã có source code Android-first. Source hiện gồm email OTP, avatar layer editor, pairing preview/confirmation, chín resolved action, realtime/latest-action playback, interaction history, quiet hours và durable notification outbox. Việc chạy end-to-end cần một Supabase project hoặc Docker để chạy Supabase local.

## Phạm vi MVP

- Đăng nhập bằng email OTP.
- Tạo avatar chibi từ preset hoặc tùy chỉnh giới hạn.
- Ghép đôi bằng mã mời hoặc liên kết.
- Hiển thị hai avatar trong một không gian chung.
- Pilot bắt đầu với bốn interaction intent: chạm đầu, ôm, đói và nhớ. Chạm đầu thay đổi theo mood `happy`, `angry` hoặc `sad`.
- Đồng bộ tương tác theo thời gian thực.
- Gửi push notification khi đối phương không mở app.
- Cho phép tắt từng loại tương tác và giới hạn spam.

## Công nghệ dự kiến

- React Native với Expo và TypeScript.
- Expo Router.
- React Native Gesture Handler và Reanimated.
- Supabase Auth, PostgreSQL, Realtime, Storage và Edge Functions.
- Expo Notifications kết hợp FCM/APNs.
- EAS Build và GitHub Actions.

Việc lựa chọn công nghệ được mô tả chi tiết trong [kiến trúc kỹ thuật](docs/technical-architecture.md).

## Tài liệu

- [Mục lục tài liệu](docs/README.md)
- [Đặc tả sản phẩm](docs/product-spec.md)
- [Decision log](docs/decisions.md)
- [Pilot plan](docs/pilot-plan.md)
- [Định hướng UX/UI](docs/ux-ui-design.md)
- [Mood và action matrix](docs/mood-action-matrix.md)
- [Kiến trúc kỹ thuật](docs/technical-architecture.md)
- [Mô hình dữ liệu](docs/data-model.md)
- [Roadmap triển khai](docs/implementation-roadmap.md)
- [Hướng dẫn phát triển](docs/development.md)
- [Phase 2 Core](docs/phase2-core.md)

## Chạy dự án

```powershell
npm install
Copy-Item .env.example .env
npm run check
npm start
```

Xem cấu hình Supabase, OTP local, Edge Functions và Android trong [hướng dẫn phát triển](docs/development.md).

## Nguyên tắc phát triển

- Kiểm chứng vòng lặp tương tác cốt lõi trước khi thêm nhiều tính năng.
- Giữ giao diện đơn giản để tập trung vào hai nhân vật và cảm xúc của cặp đôi.
- Mọi tương tác phải có sự đồng thuận và có thể được tắt bởi người nhận.
- Không thiết kế các tính năng theo dõi hoặc gây áp lực trong mối quan hệ.
- Không đưa chat, mạng xã hội, AI hoặc hệ thống mua bán phức tạp vào MVP.
