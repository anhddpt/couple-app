import * as Crypto from 'expo-crypto';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AppButton } from '@/components/AppButton';
import { useAuth } from '@/providers/AuthProvider';
import { deleteUploadedVoiceClip, sendVoiceAction, uploadVoiceClip } from '@/services/supabase/api';
import type { Interaction } from '@/types/domain';

export function VoiceRecorderButton({ onSent }: { onSent: (interaction: Interaction) => void }) {
  const { t } = useTranslation();
  const { session } = useAuth();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 200);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedAt = useRef(0);
  const stopping = useRef(false);

  async function start() {
    setError('');
    const permission = await AudioModule.requestRecordingPermissionsAsync();
    if (!permission.granted) {
      setError(t('voice.permissionDenied'));
      return;
    }
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    stopping.current = false;
    startedAt.current = Date.now();
    recorder.record();
    timer.current = setTimeout(() => void stop(), 10000);
  }

  async function stop() {
    if (stopping.current) return;
    stopping.current = true;
    if (timer.current) clearTimeout(timer.current);
    await recorder.stop();
    const uri = recorder.uri;
    const durationMs = Math.min(10000, Math.max(250, Date.now() - startedAt.current));
    if (!uri || !session) {
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      stopping.current = false;
      return;
    }
    let storagePath = '';
    try {
      setSending(true);
      storagePath = await uploadVoiceClip(session.user.id, uri);
      const interaction = await sendVoiceAction({
        storagePath,
        durationMs,
        clientEventId: Crypto.randomUUID(),
      });
      onSent(interaction);
    } catch (nextError) {
      if (storagePath) await deleteUploadedVoiceClip(storagePath).catch(() => undefined);
      setError(nextError instanceof Error ? nextError.message : t('error.generic'));
    } finally {
      setSending(false);
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      stopping.current = false;
    }
  }

  return (
    <AppButton
      accessibilityHint={error || undefined}
      label={
        recorderState.isRecording
          ? t('voice.stop', { seconds: Math.ceil(recorderState.durationMillis / 1000) })
          : error || t('voice.record')
      }
      variant={recorderState.isRecording ? 'danger' : 'secondary'}
      loading={sending}
      onPress={recorderState.isRecording ? stop : start}
    />
  );
}
