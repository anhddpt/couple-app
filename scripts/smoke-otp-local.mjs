import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const mailpitUrl = process.env.MAILPIT_URL ?? 'http://127.0.0.1:54324';

if (!publishableKey) throw new Error('SUPABASE_PUBLISHABLE_KEY is required.');

const email = `otp-smoke-${Date.now()}@example.com`;
const client = createClient(url, publishableKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { error } = await client.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
if (error) throw error;

await new Promise((resolve) => setTimeout(resolve, 1000));
const response = await fetch(`${mailpitUrl}/api/v1/messages`);
if (!response.ok) throw new Error(`Mailpit returned HTTP ${response.status}.`);
const payload = await response.text();
if (!payload.includes(email)) throw new Error('OTP email was not captured by Mailpit.');

console.log(`OTP email captured for ${email}.`);
