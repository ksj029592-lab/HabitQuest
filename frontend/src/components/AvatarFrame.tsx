/**
 * 프로필 아바타 + 테두리(Border) + 장식(Decoration) 시각화 공통 컴포넌트
 */
import React from 'react';

export const AVATARS = ['🧑‍💻', '👨‍💼', '👩‍🎨', '🧔', '👩‍🚀', '👨‍🎓', '🦸‍♂️', '🧙‍♀️'];

export const SPECIAL_AVATARS: Record<string, { name: string; emoji: string; bg: string }> = {
  warrior: { name: '🌟 갓생 전사', emoji: '⚔️', bg: 'from-amber-500 to-red-600' },
  fox: { name: '🦊 럭키 포인터', emoji: '🦊', bg: 'from-orange-400 to-amber-500' },
  astronaut: { name: '🚀 스페이스 탐험가', emoji: '🚀', bg: 'from-blue-600 to-indigo-800' },
  dragon: { name: '🐉 드래곤 마스터', emoji: '🐉', bg: 'from-emerald-500 to-teal-700' },
};

export const BORDER_STYLES: Record<string, { name: string; class: string }> = {
  gold_ring: {
    name: '황금 링',
    class: 'ring-4 ring-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.6)] border-yellow-300',
  },
  fire_ring: {
    name: '불꽃 링',
    class: 'ring-4 ring-red-500 shadow-[0_0_15px_rgba(239,68,68,0.7)] border-red-400 animate-pulse',
  },
  cyber_ring: {
    name: '사이버 네온 링',
    class: 'ring-4 ring-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.7)] border-cyan-300',
  },
  crystal_ring: {
    name: '크리스탈 링',
    class: 'ring-4 ring-purple-400 shadow-[0_0_20px_rgba(192,132,252,0.8)] border-purple-300',
  },
};

export const DECORATION_STYLES: Record<string, { name: string; emoji: string; position: string }> = {
  crown: { name: '왕관', emoji: '👑', position: '-top-3 left-1/2 -translate-x-1/2 drop-shadow-md z-20' },
  aura: { name: '신성한 후광', emoji: '✨', position: '-top-2 -right-2 drop-shadow-md z-20 animate-spin-slow' },
  wings: { name: '천사의 날개', emoji: '🪽', position: '-top-2 -left-2 drop-shadow-md z-20' },
  flame: { name: '전설의 불꽃', emoji: '🔥', position: '-bottom-1 -right-1 drop-shadow-md z-20 animate-bounce' },
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
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-2xl',
    xl: 'text-3.5xl',
  };

  const borderInfo = equippedBorder ? BORDER_STYLES[equippedBorder] : null;
  const decInfo = equippedDecoration ? DECORATION_STYLES[equippedDecoration] : null;
  const specialAvatar = specialAvatarId ? SPECIAL_AVATARS[specialAvatarId] : null;

  return (
    <div
      onClick={onClick}
      className={`relative inline-flex items-center justify-center shrink-0 ${onClick ? 'cursor-pointer hover:scale-105 transition-transform' : ''} ${className}`}
    >
      {/* 아바타 테두리 링 & 배경 오버레이 */}
      <div
        className={`${sizeClasses[size]} flex items-center justify-center overflow-hidden transition-all duration-300 border border-white/30 shadow-lg ${
          borderInfo ? borderInfo.class : 'bg-gradient-to-tr from-purple-500 to-pink-500'
        } ${specialAvatar ? `bg-gradient-to-tr ${specialAvatar.bg}` : ''}`}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover rounded-inherit" />
        ) : specialAvatar ? (
          <span className="drop-shadow-md">{specialAvatar.emoji}</span>
        ) : (
          <span className="drop-shadow-md">{AVATARS[avatarIndex % AVATARS.length]}</span>
        )}
      </div>

      {/* 장식 오버레이 (왕관, 후광, 날개, 불꽃 등) */}
      {decInfo && (
        <span className={`absolute ${decInfo.position} ${decSizeClasses[size]} select-none pointer-events-none`}>
          {decInfo.emoji}
        </span>
      )}
    </div>
  );
};
