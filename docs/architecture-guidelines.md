# Architecture Guidelines

## Mục tiêu

Giữ code theo feature, backend authoritative và tránh abstraction không có nhu cầu thực tế.

## Mobile

- Screen trong `app/` chỉ compose UI và điều hướng.
- Mỗi feature sở hữu API module và hook orchestration của chính nó.
- API module gọi trực tiếp typed Supabase client; không thêm Repository interface khi chỉ có một backend.
- Hook quản lý lifecycle, realtime subscription và mutation state; component trình bày không tự quản lý network flow phức tạp.
- Server data không được sao chép vào một global store chung.

Các hook orchestration hiện tại:

- `useRoomController`: realtime, interaction consumption, mood và room state.
- `useCoupleSpaceEditor`: draft, realtime update và optimistic concurrency.
- `useVoiceRecorderAction`: permission, recorder lifecycle, upload reservation và cleanup.
- `useUserSettings`: load và mutation của notification/action settings.

## Backend

- Query RPC không được tạo update side effect.
- Command RPC tự xác minh `auth.uid()`, active account và active couple.
- Thao tác tốn chi phí hoặc tạo file dùng reservation/job record và quota server-side.
- Object Storage phải được xóa trước metadata liên quan.
- Worker retry dùng lease hoặc trạng thái durable; không dựa vào client retry.

## Pattern được dùng

- Durable outbox cho push delivery.
- Reservation cho voice upload.
- Job/quota record cho AI generation.
- Optimistic concurrency bằng `updated_at` cho shared-space editing.
- Observer qua Supabase Realtime, được đóng gói trong feature hook.

## Không sử dụng

- Không thêm Redux nếu chưa có client state toàn cục phức tạp.
- Không thêm Spring/Firebase song song với Supabase.
- Không thêm DI container, BaseRepository, event sourcing hoặc CQRS framework.
- Không tạo interface chỉ để bọc một implementation duy nhất.
