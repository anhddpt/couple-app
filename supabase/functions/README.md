# Edge Function Operations

## Functions

- `notification-worker`: checks Expo push receipts, claims pending outbox rows, sends pushes and schedules retries.
- `cleanup-ended-couples`: deletes interactions after the couple's 10-day retention window.
- `delete-account`: verifies the caller, marks deletion pending and ends an active couple.
- `account-deletion-worker`: retries queued Auth deletion requests until the user and cascading app data are removed.

## Required schedules

After deploying to a hosted Supabase project:

- Invoke `notification-worker` every minute with `X-Worker-Secret`.
- Invoke `account-deletion-worker` every minute with `X-Worker-Secret`.
- Invoke `cleanup-ended-couples` once per day with `X-Worker-Secret`.

Use Supabase Cron/`pg_net`, an external scheduler or CI automation. A template is provided in `supabase/scheduler.sql.example`. Never commit a service-role key.

Configure production secret:

```powershell
npx supabase secrets set WORKER_SECRET=<strong-random-secret>
```

## Deployment

```powershell
npx supabase functions deploy notification-worker
npx supabase functions deploy cleanup-ended-couples
npx supabase functions deploy delete-account
npx supabase functions deploy account-deletion-worker
```

The default Supabase runtime provides `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` to deployed functions.
