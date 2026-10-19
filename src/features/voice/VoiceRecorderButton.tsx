import { useTranslation } from 'react-i18next';

import { AppButton } from '@/components/AppButton';
import type { Interaction } from '@/types/domain';

import { useVoiceRecorderAction } from './useVoiceRecorderAction';

export function VoiceRecorderButton({ onSent }: { onSent: (interaction: Interaction) => void }) {
  const { t } = useTranslation();
  const { recorderState, sending, error, start, stop } = useVoiceRecorderAction(onSent);

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
      onPress={recorderState.isRecording ? stop : () => start(t('voice.permissionDenied'))}
    />
  );
}
