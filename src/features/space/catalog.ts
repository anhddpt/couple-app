import type { CoupleOutfit, PetType, RoomTheme } from '@/types/domain';

export const roomThemeCatalog: Record<RoomTheme, { background: string; surface: string; labelKey: string }> = {
  sunset: { background: '#FFF0E8', surface: '#FFD6C6', labelKey: 'space.themeSunset' },
  night: { background: '#E9E8F5', surface: '#D8D5EE', labelKey: 'space.themeNight' },
  garden: { background: '#EDF7E8', surface: '#CDE8C6', labelKey: 'space.themeGarden' },
};

export const petCatalog: Record<PetType, { symbol: string; labelKey: string }> = {
  cat: { symbol: 'ᓚᘏᗢ', labelKey: 'space.petCat' },
  dog: { symbol: 'U・ᴥ・U', labelKey: 'space.petDog' },
  bunny: { symbol: '૮꒰ ˶• ༝ •˶꒱ა', labelKey: 'space.petBunny' },
};

export const outfitCatalog: Record<CoupleOutfit, { color: string; symbol: string; labelKey: string }> = {
  classic: { color: '#C34F62', symbol: '♥', labelKey: 'space.outfitClassic' },
  cozy: { color: '#5C7C6D', symbol: '◆', labelKey: 'space.outfitCozy' },
  party: { color: '#8A5CB8', symbol: '★', labelKey: 'space.outfitParty' },
};
