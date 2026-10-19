import type { TFunction } from 'i18next';

import { getReactionText } from './reactions';

const returnKey = ((key: string) => key) as TFunction;

describe('getReactionText', () => {
  it.each([
    ['HEAD_PAT', 'reaction.headPat.default'],
    ['BONK', 'reaction.bonk.default'],
    ['PUSH_AWAY', 'reaction.pushAway.default'],
    ['HUG', 'reaction.hug.default'],
    ['HUNGRY', 'reaction.hungry.default'],
    ['MISS_YOU', 'reaction.missYou.default'],
    ['CHEEK_POKE', 'reaction.cheekPoke.default'],
    ['KISS', 'reaction.kiss.default'],
    ['SLEEPY', 'reaction.sleepy.default'],
    ['VOICE', 'reaction.voice.default'],
  ] as const)('maps %s to %s', (action, key) => {
    expect(getReactionText(action, returnKey)).toBe(key);
  });
});
