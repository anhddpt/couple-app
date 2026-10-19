# Hướng dẫn phát triển

## Yêu cầu

- Node.js 20+
- npm 10+
- Java 17 cho Android native build
- Android Studio/SDK hoặc EAS Build
- Docker Desktop nếu chạy Supabase local
- Supabase CLI qua `npx supabase`

## Mobile

```powershell
npm install
Copy-Item .env.example .env
npm run check
npm start
```

Biến môi trường:

```text
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANDROID_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_EAS_PROJECT_ID=
```

Auth session được lưu qua adapter `expo-secure-store`. Device fingerprint không nhạy cảm được lưu bằng AsyncStorage để một lần đăng nhập sau có thể kích hoạt lại cùng device record.

## Supabase local

Docker phải đang chạy:

```powershell
npm run local:start
npx supabase db reset
npx supabase status
```

Dừng local stack:

```powershell
npm run local:stop
```

Trong máy hiện tại, Docker Engine chạy trực tiếp trong Ubuntu WSL2; không cần Docker Desktop.

Local OTP email được xem trong mail viewer tại URL do `supabase status` trả về, mặc định là `http://127.0.0.1:54324`.

Sau khi local stack chạy, điền `.env` bằng API URL và anon key từ `supabase status`.

Với Android emulator:

```text
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_ANDROID_URL=http://10.0.2.2:54321
```

Thiết bị Android thật không dùng được `10.0.2.2`; cần expose port local qua IP LAN/firewall hoặc dùng backend hosted.

## Supabase hosted

```powershell
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push
npx supabase functions deploy notification-worker
npx supabase functions deploy cleanup-ended-couples
npx supabase functions deploy delete-account
npx supabase functions deploy account-deletion-worker
npx supabase functions deploy generate-postcard
npx supabase functions deploy cleanup-voice-orphans
```

Sau deploy, tạo Vault secrets và cài bốn cron job theo `supabase/scheduler.sql.example`:

- notification worker mỗi phút
- account deletion worker mỗi phút
- ended-couple cleanup mỗi ngày
- voice orphan cleanup mỗi giờ

Release không được coi là sẵn sàng nếu bốn cron job chưa tồn tại.

## Android

Với Android SDK và `adb`:

```powershell
npm run android
```

Hoặc dùng EAS development build:

```powershell
npx eas-cli build --profile development --platform android
```

Push notification cần development build hoặc production build và `EXPO_PUBLIC_EAS_PROJECT_ID`; Expo Go không đủ cho toàn bộ cấu hình native của production.

## Kiểm tra

```powershell
npm run lint
npm run typecheck
npm test
npm run check:functions
npx expo-doctor
```

Database/RLS cần kiểm tra thêm khi Docker hoặc hosted Supabase sẵn sàng:

```powershell
npx supabase db reset
npx supabase db lint --local
```

Smoke test backend với hai account local:

```powershell
$env:SUPABASE_URL="http://127.0.0.1:54321"
$env:SUPABASE_PUBLISHABLE_KEY="<publishable key từ supabase status>"
$env:SUPABASE_SERVICE_ROLE_KEY="<service role key từ supabase status>"
$env:WORKER_SECRET="local-couple-worker-secret"
npm run smoke:local
```

Kiểm tra email OTP được Mailpit nhận:

```powershell
$env:SUPABASE_URL="http://127.0.0.1:54321"
$env:SUPABASE_PUBLISHABLE_KEY="<publishable key từ supabase status>"
$env:MAILPIT_URL="http://127.0.0.1:54324"
npm run smoke:otp:local
```
