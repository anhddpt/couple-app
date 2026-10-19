# Phase 3

Phase 3 hoàn thiện lớp trải nghiệm mở rộng sau core interaction loop: không gian chung, pet, đồ đôi, voice action và AI postcard.

## Shared space

Mỗi active couple có một `couple_spaces` record gồm room theme, pet, pet XP/mood và matching outfit. Hai thành viên có thể cập nhật cấu hình; thay đổi được phát realtime vào phòng chung.

Pet có ba loại placeholder (`cat`, `dog`, `bunny`). Chăm pet tăng XP. Mood được tính lại khi tải không gian: `happy`, `sleepy` sau 24 giờ và `hungry` sau 48 giờ chưa được chăm.

## Voice action

Voice action được giới hạn 10 giây. Client phải lấy reservation có thời hạn trước khi upload vào private Supabase Storage bucket `voice-clips`; RPC chỉ finalize đúng reserved path thành interaction `VOICE`. Chỉ sender/receiver có quyền đọc và signed URL hết hạn sau 5 phút. Worker hàng giờ xóa upload hết hạn chưa được finalize.

## AI postcard

Edge Function `generate-postcard` xác thực user, lấy avatar config và shared-space theme rồi gọi OpenAI Images API. Client chỉ chọn occasion đã định nghĩa; không gửi tên hoặc nội dung message tự do.

Quota được enforce tại database: tối đa một generation đang chạy, cooldown 60 giây và tối đa ba postcard thành công trong 24 giờ cho mỗi user.

Secrets production:

```powershell
npx supabase secrets set OPENAI_API_KEY=<key>
npx supabase secrets set OPENAI_IMAGE_MODEL=gpt-image-1
```

Deploy:

```powershell
npx supabase functions deploy generate-postcard
```

## Widget

Expo SDK 55 `expo-widgets` chỉ hỗ trợ iOS WidgetKit/Live Activities. Dự án vẫn Android-first nên chưa thêm package này vào binary. `couple_spaces` và latest interaction đã cung cấp data contract cần thiết để nối Android native widget ở release riêng mà không thay schema.

## Migration

Phase 3 dùng `supabase/migrations/20261020090000_phase3_enums.sql`, `supabase/migrations/20261020120000_phase3.sql` và migration corrective `supabase/migrations/20261021120000_review_fixes.sql`. Migration corrective thêm AI quota, voice reservation, object cleanup và optimistic concurrency.
