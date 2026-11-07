import { Coins, Frame, Crown, RotateCw, ShieldCheck, ShoppingBag, UserRound } from 'lucide-react';
import { PersonaGameState } from '@types';
import { AvatarFrame, SHOP_BORDER_ITEMS } from './AvatarFrame';
import { Button } from './Button';

export const PROFILE_DECORATIONS = [
  { id: 'aura', name: '신성한 후광', price: 300 },
  { id: 'crown', name: '왕관', price: 500 },
  { id: 'wings', name: '천사의 날개', price: 400 },
  { id: 'flame', name: '전설의 불꽃', price: 350 },
];

export const SPECIAL_AVATAR_ITEMS = [
  { id: 'warrior', name: '갓생 전사', price: 500 },
  { id: 'fox', name: '럭키 포인터', price: 600 },
  { id: 'astronaut', name: '스페이스 탐험가', price: 700 },
  { id: 'dragon', name: '드래곤 마스터', price: 1000 },
];

const tickets = [
  { id: 'protection_ticket', name: '스트릭 방지권', price: 1000, detail: '연속 기록 1회 보호 · 주간 최대 2회 구매', icon: ShieldCheck },
  { id: 'reroll_ticket', name: '퀘스트 리롤 티켓', price: 300, detail: '완료한 퀘스트는 유지하고 진행 중인 퀘스트만 교체', icon: RotateCw },
] as const;

export function RewardShop({ persona, busy, onBuy }: { persona: PersonaGameState; busy: boolean; onBuy: (id: string) => void }) {
  const groups = [
    { name: '특별 아바타', icon: UserRound, items: SPECIAL_AVATAR_ITEMS.map((item) => ({ ...item, productId: `avatar_${item.id}`, equipped: persona.specialAvatarId === item.id, preview: <AvatarFrame specialAvatarId={item.id} size="lg" /> })) },
    { name: '프로필 테두리', icon: Frame, items: SHOP_BORDER_ITEMS.map((item) => ({ ...item, productId: `border_${item.id}`, equipped: persona.equippedBorder === item.id, preview: <AvatarFrame equippedBorder={item.id} avatarIndex={persona.avatarIndex} size="lg" /> })) },
    { name: '프로필 장식', icon: Crown, items: PROFILE_DECORATIONS.map((item) => ({ ...item, productId: item.id, equipped: persona.equippedDecoration === item.id, preview: <AvatarFrame equippedDecoration={item.id} avatarIndex={persona.avatarIndex} size="lg" /> })) },
  ];
  const availability = (price: number, owned: number, limit: number, equipped = false) => {
    if (equipped) return '장착 중';
    if (owned >= limit) return limit === 1 ? '보유 중' : '보유 한도 도달';
    return persona.gold < price ? '골드 부족' : '구매 가능';
  };

  return (
    <section className="hq-shop-page">
      <div className="hq-section-heading"><div><h2><ShoppingBag size={23} aria-hidden="true" /> 보상 상점</h2></div><strong className="hq-balance"><Coins size={17} aria-hidden="true" /> {persona.gold.toLocaleString()} G</strong></div>
      <p className="hq-activity-caption">모은 골드로 실천을 돕는 티켓과 프로필 아이템을 구매할 수 있어요.</p>
      <section aria-labelledby="tickets-title">
        <h3 id="tickets-title" className="hq-shop-heading">기능성 티켓</h3>
        <div className="hq-shop-tickets">
          {tickets.map(({ id, name, price, detail, icon: Icon }) => {
            const owned = persona.inventory.find((item) => item.itemType === id)?.quantity ?? 0;
            const status = availability(price, owned, 3);
            return <article className="hq-shop-ticket" key={id}>
              <span className="hq-shop-ticket-icon"><Icon size={24} aria-hidden="true" /></span>
              <div><h4>{name}</h4><p>{detail}</p><strong>{price.toLocaleString()} G</strong><span className="hq-item-status">보유 {owned}/3개 · {status}</span></div>
              <Button size="small" disabled={busy || status !== '구매 가능'} aria-label={`${name} 구매`} onClick={() => onBuy(id)}>구매</Button>
            </article>;
          })}
        </div>
      </section>
      {groups.map(({ name, icon: Icon, items }) => <section key={name}>
        <h3 className="hq-shop-heading"><Icon size={18} aria-hidden="true" /> {name}</h3>
        <div className="hq-shop-grid">{items.map((item) => {
          const owned = persona.inventory.find((entry) => entry.itemType === 'cosmetic' && (entry.itemId ?? entry.name) === item.productId)?.quantity ?? 0;
          const status = availability(item.price, owned, 1, item.equipped);
          return <article className="hq-shop-item" key={item.productId}>
            {item.preview}<h4>{item.name}</h4><strong>{item.price.toLocaleString()} G</strong>
            <span className="hq-item-status">보유 {owned}개 · {status}</span>
            <Button size="small" disabled={busy || status !== '구매 가능'} aria-label={`${item.name} 구매`} onClick={() => onBuy(item.productId)}>구매</Button>
          </article>;
        })}</div>
      </section>)}
    </section>
  );
}
