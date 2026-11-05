/**
 * 프로필 아바타 + 테두리(Border) + 장식(Decoration) 시각화 공통 컴포넌트
 */
import React from 'react';
import { Crown, Feather, Flame, GraduationCap, Mountain, Orbit, Origami, Palette, Rocket, Shield, Sprout, Sun, Swords, BookOpen, type LucideIcon } from 'lucide-react';

export const AVATARS = [Sprout, BookOpen, Palette, Mountain, Orbit, GraduationCap, Shield, Sun];

export const SPECIAL_AVATARS: Record<string, { name: string; icon: LucideIcon; bg: string }> = {
  warrior: { name: '갓생 전사', icon: Swords, bg: 'bg-amber-50 text-amber-700' },
  fox: { name: '럭키 포인터', icon: Origami, bg: 'bg-rose-50 text-rose-700' },
  astronaut: { name: '스페이스 탐험가', icon: Rocket, bg: 'bg-sky-50 text-sky-700' },
  dragon: { name: '드래곤 마스터', icon: Flame, bg: 'bg-emerald-50 text-emerald-700' },
};

export const BORDER_STYLES: Record<string, {
  name: string;
  class: string;
  price?: number;
  rarity: 'rare' | 'epic' | 'legendary';
  desc: string;
}> = {
  gold_ring: {
    name: '황금 링',
    class: 'hq-border-gold',
    price: 400,
    rarity: 'rare',
    desc: '금속 광택이 흐르는 황금 프레임',
  },
  fire_ring: {
    name: '불꽃 링',
    class: 'hq-border-fire',
    price: 500,
    rarity: 'epic',
    desc: '붉은 불꽃과 주황빛이 교차하는 프레임',
  },
  cyber_ring: {
    name: '사이버 네온 링',
    class: 'hq-border-cyber',
    price: 600,
    rarity: 'epic',
    desc: '분절된 네온 회로를 두른 프레임',
  },
  crystal_ring: {
    name: '크리스탈 링',
    class: 'hq-border-crystal',
    price: 800,
    rarity: 'legendary',
    desc: '빛을 나누는 보랏빛 크리스탈 조각',
  },
  rainbow_ring: {
    name: '무지개 테두리',
    class: 'hq-border-rainbow',
    rarity: 'legendary',
    desc: '일곱 빛깔이 이어지는 무지개 프레임',
  },
  gold_frame: {
    name: '금색 테두리',
    class: 'hq-border-classic-gold',
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
  if (BORDER_STYLES[id]) return id;
  const legacyNames: Record<string, string> = {
    '금색 테두리': 'gold_frame',
    '무지개 테두리': 'rainbow_ring',
  };
  return legacyNames[value] || Object.keys(BORDER_STYLES).find((key) => BORDER_STYLES[key].name === value) || null;
};

export const DECORATION_STYLES: Record<string, { name: string; icon: LucideIcon; position: string }> = {
  crown: { name: '왕관', icon: Crown, position: '-top-3 left-1/2 -translate-x-1/2 text-amber-600 z-20' },
  aura: { name: '신성한 후광', icon: Sun, position: '-top-2 -right-2 text-amber-600 z-20' },
  wings: { name: '천사의 날개', icon: Feather, position: '-top-2 -left-2 text-sky-700 z-20' },
  flame: { name: '전설의 불꽃', icon: Flame, position: '-bottom-1 -right-1 text-rose-600 z-20' },
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
  // 규격 정의
  const sizeClasses = {
    sm: 'w-8 h-8 text-base rounded-xl',
    md: 'w-11 h-11 text-xl rounded-2xl',
    lg: 'w-16 h-16 text-3xl rounded-3xl',
    xl: 'w-24 h-24 text-5xl rounded-3xl',
  };

  const decSizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8',
  };

  const borderId = resolveBorderId(equippedBorder);
  const borderInfo = borderId ? BORDER_STYLES[borderId] : null;
  const decInfo = equippedDecoration ? DECORATION_STYLES[equippedDecoration] : null;
  const specialAvatar = specialAvatarId ? SPECIAL_AVATARS[specialAvatarId] : null;
  const AvatarIcon = specialAvatar?.icon || AVATARS[avatarIndex % AVATARS.length] || Sprout;
  const DecorationIcon = decInfo?.icon;

  return (
    <div
      onClick={onClick}
      className={`relative inline-flex items-center justify-center shrink-0 ${onClick ? 'cursor-pointer hover:scale-105 transition-transform' : ''} ${className}`}
    >
      {/* 아바타 테두리 링 & 배경 오버레이 */}
      <div
        data-border-id={borderId || undefined}
        className={`hq-avatar-surface ${sizeClasses[size]} flex items-center justify-center overflow-hidden ${
          borderInfo ? `hq-avatar-border ${borderInfo.class}` : ''
        } ${specialAvatar ? specialAvatar.bg : 'bg-teal-50 text-teal-800'}`}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover rounded-inherit" />
        ) : (
          <AvatarIcon className="w-[56%] h-[56%]" strokeWidth={1.6} aria-hidden="true" />
        )}
      </div>

      {/* 장식 오버레이 (왕관, 후광, 날개, 불꽃 등) */}
      {decInfo && DecorationIcon && (
        <span className={`absolute ${decInfo.position} ${decSizeClasses[size]} select-none pointer-events-none`}>
          <DecorationIcon className="w-full h-full" strokeWidth={1.7} aria-hidden="true" />
        </span>
      )}
    </div>
  );
};
