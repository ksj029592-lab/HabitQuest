export interface CosmeticDefinition {
  name: string;
  price: number | null;
  rarity: string;
  slot: 'border' | 'avatar' | 'decoration' | 'title' | 'background';
  value: string;
}

export const COSMETICS: Record<string, CosmeticDefinition> = {
  border_season_laurel: { name: '시즌 월계관 테두리', price: null, rarity: 'legendary', slot: 'border', value: 'season_laurel' },
  season_grove: { name: '시즌의 숲 배경', price: null, rarity: 'epic', slot: 'background', value: 'season_grove' },
  border_gold_ring: { name: '황금 링', price: 400, rarity: 'rare', slot: 'border', value: 'gold_ring' },
  border_fire_ring: { name: '불꽃 링', price: 500, rarity: 'epic', slot: 'border', value: 'fire_ring' },
  border_cyber_ring: { name: '사이버 네온 링', price: 600, rarity: 'epic', slot: 'border', value: 'cyber_ring' },
  border_crystal_ring: { name: '크리스탈 링', price: 800, rarity: 'legendary', slot: 'border', value: 'crystal_ring' },
  border_rainbow_ring: { name: '무지개 테두리', price: null, rarity: 'legendary', slot: 'border', value: 'rainbow_ring' },
  border_gold_frame: { name: '금색 테두리', price: null, rarity: 'rare', slot: 'border', value: 'gold_frame' },
  avatar_warrior: { name: '갓생 전사', price: 500, rarity: 'rare', slot: 'avatar', value: 'warrior' },
  avatar_fox: { name: '럭키 포인터', price: 600, rarity: 'epic', slot: 'avatar', value: 'fox' },
  avatar_astronaut: { name: '스페이스 탐험가', price: 700, rarity: 'epic', slot: 'avatar', value: 'astronaut' },
  avatar_dragon: { name: '드래곤 마스터', price: 1000, rarity: 'legendary', slot: 'avatar', value: 'dragon' },
  crown: { name: '왕관', price: 500, rarity: 'rare', slot: 'decoration', value: 'crown' },
  aura: { name: '신성한 후광', price: 300, rarity: 'rare', slot: 'decoration', value: 'aura' },
  wings: { name: '천사의 날개', price: 400, rarity: 'rare', slot: 'decoration', value: 'wings' },
  flame: { name: '전설의 불꽃', price: 350, rarity: 'rare', slot: 'decoration', value: 'flame' },
  '성장의 새싹': { name: '성장의 새싹', price: null, rarity: 'common', slot: 'title', value: '성장의 새싹' },
  '부지런한': { name: '부지런한', price: null, rarity: 'rare', slot: 'title', value: '부지런한' },
  '전설의': { name: '전설의', price: null, rarity: 'legendary', slot: 'title', value: '전설의' },
  '전설의 퀘스터': { name: '전설의 퀘스터', price: null, rarity: 'legendary', slot: 'title', value: '전설의 퀘스터' },
  '일주일의 실천': { name: '일주일의 실천', price: null, rarity: 'rare', slot: 'title', value: '일주일의 실천' },
  '백일의 꾸준함': { name: '백일의 꾸준함', price: null, rarity: 'legendary', slot: 'title', value: '백일의 꾸준함' },
};

export function getCosmetic(itemId: string): CosmeticDefinition | undefined {
  if (Object.prototype.hasOwnProperty.call(COSMETICS, itemId)) return COSMETICS[itemId];
  const seasonTitle = /^season_top10_(20\d{2}-(?:0[1-9]|1[0-2]))$/.exec(itemId);
  if (!seasonTitle) return undefined;
  const name = `${seasonTitle[1]} 시즌 Top 10%`;
  return { name, price: null, rarity: 'epic', slot: 'title', value: name };
}

export const LEVEL_MILESTONES = [
  { level: 2, name: '첫 발걸음', gold: 100, itemIds: [] },
  { level: 5, name: '습관의 새싹', gold: 150, itemIds: ['성장의 새싹'] },
  { level: 10, name: '꾸준함의 시작', gold: 200, itemIds: ['border_gold_frame'] },
  { level: 15, name: '빛나는 실천', gold: 300, itemIds: ['border_gold_ring'] },
  { level: 20, name: '나만의 리듬', gold: 350, itemIds: ['border_cyber_ring'] },
  { level: 30, name: '갓생의 길', gold: 400, itemIds: ['avatar_warrior'] },
  { level: 40, name: '단단한 성장', gold: 500, itemIds: ['border_crystal_ring'] },
  { level: 50, name: '전설의 모험가', gold: 800, itemIds: ['border_rainbow_ring', '전설의 퀘스터'] },
];

export const DAY_MILESTONES = [
  { days: 3, gold: 100, itemIds: [] },
  { days: 7, gold: 200, itemIds: ['일주일의 실천'] },
  { days: 14, gold: 300, itemIds: ['crown'] },
  { days: 30, gold: 500, itemIds: ['border_fire_ring'] },
  { days: 60, gold: 700, itemIds: ['border_rainbow_ring'] },
  { days: 100, gold: 1000, itemIds: ['avatar_dragon', '백일의 꾸준함'] },
];