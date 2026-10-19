import type { TFunction } from 'i18next';

import type { ActionType } from '@/types/domain';

export function getReactionText(action: ActionType, t: TFunction) {
  const keyByAction: Record<ActionType, string> = {
    HEAD_PAT: 'reaction.headPat.default',
    BONK: 'reaction.bonk.default',
    PUSH_AWAY: 'reaction.pushAway.default',
    HUG: 'reaction.hug.default',
    HUNGRY: 'reaction.hungry.default',
    MISS_YOU: 'reaction.missYou.default',
    CHEEK_POKE: 'reaction.cheekPoke.default',
    KISS: 'reaction.kiss.default',
    SLEEPY: 'reaction.sleepy.default',
    VOICE: 'reaction.voice.default',
  };

  return t(keyByAction[action]);
}
