import { useAudioPlayer } from 'expo-audio';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AppButton } from '@/components/AppButton';

import { getVoiceClipUrl } from './voiceApi';

export function VoicePlayback({ interactionId }: { interactionId: string }) {
  const { t } = useTranslation();
  const [url, setUrl] = useState<string | null>(null);
  const player = useAudioPlayer(url, { downloadFirst: true });

  useEffect(() => {
    let active = true;
    void getVoiceClipUrl(interactionId)
      .then((value) => {
        if (active) setUrl(value);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [interactionId]);

  return (
    <AppButton
      label={url ? t('voice.play') : t('common.loading')}
      variant="secondary"
      disabled={!url}
      onPress={() => player.play()}
    />
  );
}
