import type { AvatarConfig, AvatarPreset } from '@/types/domain';

export const avatarPresets: Record<
  AvatarPreset,
  { id: AvatarPreset; skin: string; hair: string; outfit: string; label: string }
> = {
  coral: {
    id: 'coral',
    skin: '#F2C7A5',
    hair: '#4A3028',
    outfit: '#C34F62',
    label: 'Coral',
  },
  sunny: {
    id: 'sunny',
    skin: '#DDAA7D',
    hair: '#2F2422',
    outfit: '#D88935',
    label: 'Sunny',
  },
  mint: {
    id: 'mint',
    skin: '#F0C8AC',
    hair: '#B36D4F',
    outfit: '#4B876A',
    label: 'Mint',
  },
};

export const defaultAvatarConfigs: Record<AvatarPreset, AvatarConfig> = {
  coral: {
    version: 2,
    skin: 'skin_peach',
    hair: 'hair_chocolate',
    eyes: 'eyes_round',
    mouth: 'mouth_smile',
    outfit: 'outfit_coral',
    accessory: null,
  },
  sunny: {
    version: 2,
    skin: 'skin_warm',
    hair: 'hair_midnight',
    eyes: 'eyes_soft',
    mouth: 'mouth_smile',
    outfit: 'outfit_sunny',
    accessory: 'accessory_star',
  },
  mint: {
    version: 2,
    skin: 'skin_light',
    hair: 'hair_copper',
    eyes: 'eyes_round',
    mouth: 'mouth_calm',
    outfit: 'outfit_mint',
    accessory: 'accessory_leaf',
  },
};
