import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

const url = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const workerSecret = process.env.WORKER_SECRET;

if (!publishableKey || !serviceRoleKey) {
  throw new Error('SUPABASE_PUBLISHABLE_KEY and SUPABASE_SERVICE_ROLE_KEY are required.');
}

const admin = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function createTestUser(label) {
  const email = `smoke-${label}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  const password = `Local-${randomUUID()}!`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;

  const client = createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;
  return { id: data.user.id, client };
}

async function rpc(client, name, params = {}) {
  const { data, error } = await client.rpc(name, params);
  if (error) throw error;
  return data;
}

const users = [];

try {
  const alice = await createTestUser('alice');
  const bob = await createTestUser('bob');
  users.push(alice.id, bob.id);

  for (const [user, name, preset] of [
    [alice, 'Alice', 'coral'],
    [bob, 'Bob', 'mint'],
  ]) {
    const { error: profileError } = await user.client
      .from('profiles')
      .insert({ id: user.id, display_name: name, locale: 'vi' });
    if (profileError) throw profileError;
    const { error: avatarError } = await user.client
      .from('avatars')
      .insert({ user_id: user.id, preset_id: preset });
    if (avatarError) throw avatarError;
  }

  const inviteCode = await rpc(alice.client, 'create_pairing_invitation');
  assert(typeof inviteCode === 'string' && inviteCode.length === 12, 'Invite code must be 12 chars.');

  const previewRows = await rpc(bob.client, 'preview_pairing_invitation', { p_code: inviteCode });
  const preview = previewRows?.[0];
  assert(preview?.inviter_name === 'Alice', 'Pairing preview must expose inviter name.');

  const coupleId = await rpc(bob.client, 'redeem_pairing_invitation', {
    p_invitation_id: preview.invitation_id,
    p_code: inviteCode,
  });
  assert(coupleId, 'Pairing must return a couple id.');

  const aliceCouple = (await rpc(alice.client, 'get_active_couple_state'))?.[0];
  const bobCouple = (await rpc(bob.client, 'get_active_couple_state'))?.[0];
  assert(aliceCouple?.partner_name === 'Bob', 'Alice must see Bob as partner.');
  assert(bobCouple?.partner_name === 'Alice', 'Bob must see Alice as partner.');

  const initialSpace = (await rpc(alice.client, 'get_couple_space'))?.[0];
  assert(initialSpace?.pet_mood === 'happy', 'A new shared pet must start happy.');
  const repeatedSpace = (await rpc(alice.client, 'get_couple_space'))?.[0];
  assert(
    repeatedSpace.updated_at === initialSpace.updated_at,
    'Reading shared space must not write or change updated_at.',
  );
  const updatedSpace = (
    await rpc(alice.client, 'update_couple_space', {
      p_room_theme: 'garden',
      p_pet_type: 'bunny',
      p_pet_name: 'Mochi',
      p_couple_outfit: 'cozy',
      p_expected_updated_at: initialSpace.updated_at,
    })
  )?.[0];
  assert(updatedSpace?.room_theme === 'garden', 'Shared space update must persist the selected theme.');
  const staleSpaceUpdate = await bob.client.rpc('update_couple_space', {
    p_room_theme: 'night',
    p_pet_type: 'cat',
    p_pet_name: 'Stale',
    p_couple_outfit: 'party',
    p_expected_updated_at: initialSpace.updated_at,
  });
  assert(staleSpaceUpdate.error, 'A stale shared-space update must be rejected.');

  const arbitraryUpload = await alice.client.storage
    .from('voice-clips')
    .upload(`${alice.id}/${randomUUID()}.m4a`, new Uint8Array([1, 2, 3]), {
      contentType: 'audio/mp4',
    });
  assert(arbitraryUpload.error, 'Voice upload without a reservation must be rejected.');
  const reservation = (await rpc(alice.client, 'reserve_voice_upload'))?.[0];
  assert(reservation?.storage_path, 'Voice reservation must return a storage path.');
  const reservedUpload = await alice.client.storage
    .from('voice-clips')
    .upload(reservation.storage_path, new Uint8Array([1, 2, 3]), { contentType: 'audio/mp4' });
  if (reservedUpload.error) throw reservedUpload.error;
  const voiceInteraction = (
    await rpc(alice.client, 'send_voice_action', {
      p_reservation_id: reservation.reservation_id,
      p_duration_ms: 1000,
      p_client_event_id: randomUUID(),
      p_client_created_at: new Date().toISOString(),
    })
  )?.[0];
  assert(voiceInteraction?.action_type === 'VOICE', 'Reserved voice upload must finalize as VOICE.');

  const postcardJob = await rpc(alice.client, 'claim_postcard_generation');
  assert(postcardJob, 'Postcard generation must create a quota job.');
  const duplicatePostcardJob = await alice.client.rpc('claim_postcard_generation');
  assert(duplicatePostcardJob.error, 'Concurrent postcard generation must be rejected.');
  await rpc(admin, 'complete_postcard_generation', {
    p_job_id: postcardJob,
    p_succeeded: false,
    p_last_error: 'Smoke test',
  });

  await rpc(bob.client, 'register_device', {
    p_expo_push_token: `ExponentPushToken[smoke-${randomUUID()}]`,
    p_device_fingerprint: randomUUID(),
    p_platform: 'android',
  });
  await rpc(alice.client, 'update_current_mood', { p_mood: 'angry' });

  const sentRows = await rpc(alice.client, 'send_interaction', {
    p_target_type: 'partner',
    p_target_region: 'head',
    p_gesture_type: 'tap',
    p_client_event_id: randomUUID(),
    p_client_created_at: new Date().toISOString(),
  });
  const sent = sentRows?.[0];
  assert(sent?.action_type === 'BONK', 'Angry head intent must resolve to BONK.');
  assert(sent?.actor_mood === 'angry', 'Interaction must snapshot sender mood.');

  const peeked = (await rpc(bob.client, 'peek_latest_interaction'))?.[0];
  assert(peeked?.id === sent.id, 'Receiver must peek the latest interaction.');
  await rpc(bob.client, 'acknowledge_interaction', { p_interaction_id: peeked.id });
  const afterAck = await rpc(bob.client, 'peek_latest_interaction');
  assert(!afterAck?.length, 'Acknowledged interaction must not replay.');

  const { data: pendingDelivery, error: deliveryError } = await admin
    .from('notification_deliveries')
    .select('id, status')
    .eq('interaction_id', sent.id)
    .single();
  if (deliveryError) throw deliveryError;
  assert(pendingDelivery.status === 'pending', 'Interaction must create a pending delivery.');

  await rpc(bob.client, 'set_action_enabled', { p_action_type: 'BONK', p_enabled: false });
  const { data: suppressedDelivery, error: suppressedError } = await admin
    .from('notification_deliveries')
    .select('status')
    .eq('id', pendingDelivery.id)
    .single();
  if (suppressedError) throw suppressedError;
  assert(suppressedDelivery.status === 'suppressed', 'Disabling BONK must suppress pending push.');

  const blockedResult = await alice.client.rpc('send_interaction', {
    p_target_type: 'partner',
    p_target_region: 'head',
    p_gesture_type: 'tap',
    p_client_event_id: randomUUID(),
    p_client_created_at: new Date().toISOString(),
  });
  assert(blockedResult.error, 'Disabled action must be rejected.');

  await rpc(bob.client, 'unmatch_current_couple');
  const afterUnmatch = await rpc(alice.client, 'get_active_couple_state');
  assert(!afterUnmatch?.length, 'Unmatch must remove active couple state.');

  const { error: expireError } = await admin
    .from('couples')
    .update({ purge_after: new Date(Date.now() - 1000).toISOString() })
    .eq('id', coupleId);
  if (expireError) throw expireError;
  let deletedCount;
  if (workerSecret) {
    const cleanupResponse = await fetch(`${url}/functions/v1/cleanup-ended-couples`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Worker-Secret': workerSecret },
      body: '{}',
    });
    assert(cleanupResponse.ok, 'Ended-couple cleanup worker must remove voice objects and metadata.');
    const cleanupResult = await cleanupResponse.json();
    deletedCount = cleanupResult.deletedInteractions;
  } else {
    await admin.storage.from('voice-clips').remove([reservation.storage_path]);
    deletedCount = await rpc(admin, 'cleanup_ended_couple_interactions');
  }
  assert(Number(deletedCount) >= 1, 'Cleanup must delete expired couple interactions.');
  const removedVoice = await admin.storage.from('voice-clips').download(reservation.storage_path);
  assert(removedVoice.error, 'Ended-couple cleanup must remove the voice object.');

  const deactivatedUser = await createTestUser('deactivated');
  users.push(deactivatedUser.id);
  const { error: deactivatedProfileError } = await deactivatedUser.client
    .from('profiles')
    .insert({ id: deactivatedUser.id, display_name: 'Inactive', locale: 'vi' });
  if (deactivatedProfileError) throw deactivatedProfileError;
  await rpc(deactivatedUser.client, 'deactivate_account');
  const inactiveCommand = await deactivatedUser.client.rpc('set_notification_content_mode', {
    p_content_mode: 'detailed',
  });
  assert(inactiveCommand.error, 'A deactivated account must not execute settings commands.');

  if (workerSecret) {
    const deletionUser = await createTestUser('delete');
    users.push(deletionUser.id);
    const { error: deletionProfileError } = await deletionUser.client
      .from('profiles')
      .insert({ id: deletionUser.id, display_name: 'Delete Me', locale: 'vi' });
    if (deletionProfileError) throw deletionProfileError;

    const { error: requestDeleteError } = await deletionUser.client.functions.invoke('delete-account', {
      method: 'POST',
    });
    if (requestDeleteError) throw requestDeleteError;

    const { data: pendingProfile, error: pendingError } = await admin
      .from('profiles')
      .select('account_status')
      .eq('id', deletionUser.id)
      .single();
    if (pendingError) throw pendingError;
    assert(pendingProfile.account_status === 'deletion_pending', 'Delete request must lock account.');

    const workerResponse = await fetch(`${url}/functions/v1/account-deletion-worker`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Worker-Secret': workerSecret },
      body: '{}',
    });
    assert(workerResponse.ok, 'Account deletion worker must accept the queued job.');

    const { data: deletedUser } = await admin.auth.admin.getUserById(deletionUser.id);
    assert(!deletedUser.user, 'Account deletion worker must remove the Auth user.');
    users.splice(users.indexOf(deletionUser.id), 1);
  }

  console.log('Local Supabase smoke test passed.');
} finally {
  await Promise.allSettled(users.map((userId) => admin.auth.admin.deleteUser(userId)));
}
