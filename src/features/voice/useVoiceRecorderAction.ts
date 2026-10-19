import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import * as Crypto from 'expo-crypto';
import { useEffect, useRef, useState } from 'react';

import type { Interaction } from '@/types/domain';

import {
  reserveVoiceUpload,
  sendVoiceAction,
  uploadVoiceClip,
} from './voiceApi';

export function useVoiceRecorderAction(onSent: (interaction: Interaction) => void) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 200);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startedAt = useRef(0);
  const stopping = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    return () => {
      mounted.current = false;
      if (timer.current) clearTimeout(timer.current);
      if (recorder.isRecording) void recorder.stop().catch(() => undefined);
      void setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => undefined);
    };
  }, [recorder]);

  async function start(permissionError: string) {
    try {
      setError('');
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setError(permissionError);
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      stopping.current = false;
      startedAt.current = Date.now();
      recorder.record();
      timer.current = setTimeout(() => void stop(), 10000);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to start recording');
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => undefined);
    }
  }

  async function stop() {
    if (stopping.current) return;
    stopping.current = true;
    if (timer.current) clearTimeout(timer.current);
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) throw new Error('Recording file unavailable');
      const durationMs = Math.min(10000, Math.max(250, Date.now() - startedAt.current));
      if (mounted.current) setSending(true);
      const reservation = await reserveVoiceUpload();
      await uploadVoiceClip(reservation.storage_path, uri);
      const clientEventId = Crypto.randomUUID();
      let interaction: Interaction;
      try {
        interaction = await sendVoiceAction({
          reservationId: reservation.reservation_id,
          durationMs,
          clientEventId,
        });
      } catch {
        interaction = await sendVoiceAction({
          reservationId: reservation.reservation_id,
          durationMs,
          clientEventId,
        });
      }
      if (mounted.current) onSent(interaction);
    } catch (nextError) {
      if (mounted.current) {
        setError(nextError instanceof Error ? nextError.message : 'Unable to send voice action');
      }
    } finally {
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => undefined);
      stopping.current = false;
      if (mounted.current) setSending(false);
    }
  }

  return { recorderState, sending, error, start, stop };
}
