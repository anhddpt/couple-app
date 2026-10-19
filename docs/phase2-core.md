# Phase 2 Core

Phase 2 Core mở rộng Android pilot với ba action mới, avatar editor theo layer, interaction history và quiet hours. iOS release, delivery dashboard và AI không thuộc phạm vi này.

## Action mới

| Intent | Resolved action |
|---|---|
| Tap má avatar partner | `CHEEK_POKE` |
| Long press má avatar partner | `KISS` |
| Tap mắt avatar của mình | `SLEEPY` |

Mood chỉ ảnh hưởng thao tác tap vùng đầu như Phase 1. Client tiếp tục gửi intent; PostgreSQL RPC resolve action authoritative.

## Avatar V2

Avatar lưu `config` JSON version 2 gồm skin, hair, eyes, mouth, outfit và accessory. Asset hiện là placeholder có ID ổn định và renderer theo layer để có thể thay bằng PNG/SVG thật sau này mà không đổi contract dữ liệu.

## Interaction history

Tab History hiển thị interaction của active couple theo cursor `(created_at, id)`, 20 item mỗi trang. History không có read receipt hoặc reply thread.

## Quiet hours

Người dùng cấu hình start, end và IANA timezone. Interaction trong quiet hours vẫn được lưu và phát realtime nhưng delivery push được đánh dấu `suppressed`; hệ thống không gửi lại notification cũ khi quiet hours kết thúc.

## Migration

Phase 2 dùng `supabase/migrations/20261019120000_phase2_core.sql`. Vì dự án chưa có database production, enum Phase 2 cũng được đưa vào migration nền Phase 1 để local reset có thể tạo schema mới trong một lượt.

## Verification

Source hiện pass ESLint, TypeScript, Jest, Deno check và Expo Doctor. Database reset/RLS smoke test cần Docker hoặc Podman, hiện chưa có trên PATH của máy phát triển.
