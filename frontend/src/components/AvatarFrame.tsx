/**
 * 프로필 아바타 + 테두리(Border) + 장식(Decoration) 시각화 공통 컴포넌트
 */
import React from 'react';
import { AvatarBorder, AvatarPin, AvatarPortrait } from './FieldArt';

export const BORDER_STYLES: Record<string, {
  name: string;
  price?: number;
  rarity: 'rare' | 'epic' | 'legendary';
  desc: string;
}> = {
  season_laurel: { name: '시즌 월계관 테두리', rarity: 'legendary', desc: '시즌 상위 1% 보상' },
  gold_ring: {
    name: '황금 링',
    price: 400,
    rarity: 'rare',
    desc: '금속 광택이 흐르는 황금 프레임',
  },
  fire_ring: {
    name: '불꽃 링',
    price: 500,
    rarity: 'epic',
    desc: '붉은 불꽃과 주황빛이 교차하는 프레임',
  },
  cyber_ring: {
    name: '사이버 네온 링',
    price: 600,
    rarity: 'epic',
    desc: '분절된 네온 회로를 두른 프레임',
  },
  crystal_ring: {
    name: '크리스탈 링',
    price: 800,
    rarity: 'legendary',
    desc: '빛을 나누는 보랏빛 크리스탈 조각',
  },
  rainbow_ring: {
    name: '무지개 테두리',
    rarity: 'legendary',
    desc: '일곱 빛깔이 이어지는 무지개 프레임',
  },
  gold_frame: {
    name: '금색 테두리',
    rarity: 'rare',
    desc: '두 줄의 금빛 선으로 완성한 클래식 프레임',
  },
};

export const SHOP_BORDER_ITEMS = Object.entries(BORDER_STYLES).flatMap(([id, border]) =>
  typeof border.price === 'number' ? [{ id, name: border.name, price: border.price, rarity: border.rarity, desc: border.desc }] : [],
);

export const resolveBorderId = (value?: string | null): string | null => {
  if (!value) return null;
  const id = value.replace(/^border_/, '');
  if (Object.prototype.hasOwnProperty.call(BORDER_STYLES, id)) return id;
  const legacyNames: Record<string, string> = {
    '금색 테두리': 'gold_frame',
    '무지개 테두리': 'rainbow_ring',
  };
  return (Object.prototype.hasOwnProperty.call(legacyNames, value) ? legacyNames[value] : null) || Object.keys(BORDER_STYLES).find((key) => BORDER_STYLES[key].name === value) || null;
};

interface AvatarFrameProps {
  avatarIndex?: number;
  avatarUrl?: string | null;
  specialAvatarId?: string | null;
  equippedBorder?: string | null;
  equippedDecoration?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
}

export const AvatarFrame: React.FC<AvatarFrameProps> = ({
  avatarIndex = 0,
  avatarUrl,
  specialAvatarId,
  equippedBorder,
  equippedDecoration,
  size = 'md',
  className = '',
  onClick,
}) => {
  const sizeClasses = { sm: 'w-8 h-8', md: 'w-11 h-11', lg: 'w-16 h-16', xl: 'w-24 h-24' };
  const borderId = resolveBorderId(equippedBorder);

  return (
    <div onClick={onClick} className={`hq-avatar ${sizeClasses[size]} ${className}`} data-border-id={borderId ?? undefined}>
      <div className="hq-avatar-surface">
        {avatarUrl
          ? <img src={avatarUrl} alt="프로필 사진" className="w-full h-full object-cover" />
          : <AvatarPortrait index={avatarIndex} special={specialAvatarId} />}
        {borderId && <AvatarBorder id={borderId} />}
      </div>
      {equippedDecoration && <AvatarPin id={equippedDecoration} />}
    </div>
  );
};
