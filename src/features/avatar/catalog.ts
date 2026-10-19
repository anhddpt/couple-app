import type { AvatarConfig } from '@/types/domain';

export const avatarCatalog = {
  skin: {
    skin_peach: { label: 'Peach', color: '#F2C7A5' },
    skin_warm: { label: 'Warm', color: '#DDAA7D' },
    skin_light: { label: 'Light', color: '#F0C8AC' },
    skin_deep: { label: 'Deep', color: '#9A6248' },
  },
  hair: {
    hair_chocolate: { label: 'Chocolate', color: '#4A3028' },
    hair_midnight: { label: 'Midnight', color: '#2F2422' },
    hair_copper: { label: 'Copper', color: '#B36D4F' },
    hair_honey: { label: 'Honey', color: '#9A6A2F' },
  },
  eyes: {
    eyes_round: { label: 'Round', face: '• ᴗ •' },
    eyes_soft: { label: 'Soft', face: '⌒ ᴗ ⌒' },
    eyes_bright: { label: 'Bright', face: '◕ ᴗ ◕' },
  },
  mouth: {
    mouth_smile: { label: 'Smile', value: 'ᴗ' },
    mouth_calm: { label: 'Calm', value: '‿' },
    mouth_grin: { label: 'Grin', value: '▽' },
  },
  outfit: {
    outfit_coral: { label: 'Coral', color: '#C34F62' },
    outfit_sunny: { label: 'Sunny', color: '#D88935' },
    outfit_mint: { label: 'Mint', color: '#4B876A' },
    outfit_sky: { label: 'Sky', color: '#4C78A8' },
  },
  accessory: {
    accessory_star: { label: 'Star', value: '★' },
    accessory_leaf: { label: 'Leaf', value: '◆' },
    accessory_heart: { label: 'Heart', value: '♥' },
  },
} as const;

export type AvatarCategory = keyof typeof avatarCatalog;

export function normalizeAvatarConfig(config: AvatarConfig): AvatarConfig {
  return {
    version: 2,
    skin: config.skin in avatarCatalog.skin ? config.skin : 'skin_peach',
    hair: config.hair in avatarCatalog.hair ? config.hair : 'hair_chocolate',
    eyes: config.eyes in avatarCatalog.eyes ? config.eyes : 'eyes_round',
    mouth: config.mouth in avatarCatalog.mouth ? config.mouth : 'mouth_smile',
    outfit: config.outfit in avatarCatalog.outfit ? config.outfit : 'outfit_coral',
    accessory:
      config.accessory && config.accessory in avatarCatalog.accessory ? config.accessory : null,
  };
}
