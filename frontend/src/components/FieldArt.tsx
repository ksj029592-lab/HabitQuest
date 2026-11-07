import type { ReactNode } from 'react';

const marks = {
  journal: <><path d="M5 4h13a1 1 0 0 1 1 1v14H6a2 2 0 0 1-2-2V6a2 2 0 0 1 1-2Z"/><path d="M8 4v15M11 10l2 2 3-4M11 15h5"/></>,
  map: <><path d="m3 6 6-2 6 2 6-2v14l-6 2-6-2-6 2ZM9 4v14m6-12v14"/><path d="m5.5 12 2-2m9 3 2-2"/></>,
  satchel: <><path d="M4 9h16v11H4zM8 9V7a4 4 0 0 1 8 0v2M4 12l5 3h6l5-3"/><path d="M10 13h4v4h-4z"/></>,
  badge: <><path d="M4 4h16v16H4z"/><circle cx="12" cy="10" r="2.6"/><path d="M7 17c0-4 10-4 10 0"/></>,
  flag: <><path d="M5 21V4m0 1c5-4 8 3 14 0v9c-6 3-9-4-14 0M3 21h5"/><path d="m10 8 2 1-2 1"/></>,
  compass: <><path d="m12 2 8 5 2 5-2 5-8 5-8-5-2-5 2-5Z"/><path d="m15.5 8.5-2 5-5 2 2-5Z"/></>,
  check: <><path d="M4 5h16v14H4z"/><path d="m8 12 3 3 5-6"/></>,
  flame: <><path d="M12 21a7 7 0 0 1-6-10l2 2c-1-4 3-6 4-10 3 2 5 6 4 10l2-2a7 7 0 0 1-6 10Z"/><path d="M10 18c0-2 2-3 2-5 2 2 3 4 1 6"/></>,
  coin: <><path d="m12 3 7 3 2 6-2 6-7 3-7-3-2-6 2-6Z"/><path d="m12 7 3 5-3 5-3-5Z"/></>,
  spark: <><path d="m12 3 2 6 6 3-6 2-2 7-2-7-6-2 6-3Z"/></>,
};

export function FieldIcon({ name, size = 20, className }: { name: keyof typeof marks; size?: number; className?: string }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{marks[name]}</svg>;
}

export function TrailSketch() {
  return <svg className="hq-trail-sketch" viewBox="0 0 220 110" fill="none" aria-hidden="true">
    <path d="M9 92 51 49l21 19 32-39 27 31 29-18 51 51M35 94l25-24 11 8 17-13 17-5 17 20 27-12 28 26" stroke="#89836b" strokeWidth="1.3" strokeLinejoin="round"/>
    <path d="M17 105C56 86 99 112 129 90s-4-27 8-42 35-16 48-34" stroke="#a24a37" strokeWidth="1.8" strokeDasharray="3 5" strokeLinecap="round"/>
    <path d="M184 24V7l17 4-17 5" fill="#d89668" stroke="#864332" strokeWidth="1.4" strokeLinejoin="round"/>
    <path d="m34 71 4-12 5 12m-10 0h11m142 11 5-14 6 14m-12 0h13M67 38h12m-6-6v12" stroke="#526655" strokeWidth="1.4" strokeLinecap="round"/>
    <circle cx="155" cy="19" r="8" fill="#e1b66d" stroke="#967146" strokeWidth="1.3"/>
  </svg>;
}

type Portrait = { ground: string; art: ReactNode };
const portraits: Portrait[] = [
  { ground: '#edd9ad', art: <><path fill="#c87950" d="M16 45c-8-12-6-22 1-23 6-1 10 3 13 7h12c3-4 8-8 13-6 7 3 7 12-1 23l-3 12H19Z"/><path fill="#efd0a4" d="M20 43c5-7 9 2 16 2s11-9 16-2c0 10-7 15-16 15s-16-5-16-15Z"/><path fill="#a44b39" d="M21 60h31l4 12H17Z"/><path d="M31 47h10l-5 5Z" fill="#573a2c"/><path d="M18 23 13 15m6 6 6-9" fill="none"/></> },
  { ground: '#d6dfc8', art: <><path fill="#d7c9ad" d="M24 34c-12-12-13-25-7-25 7-1 12 9 14 19h10c3-13 8-20 14-18 6 2 2 15-6 24 7 6 10 18 3 24-8 6-24 6-32 0-7-6-4-18 4-24Z"/><path fill="#9c685c" stroke="none" d="M23 23c-5-8-7-12-5-11 3 0 7 6 9 13Zm24 2c3-9 6-13 8-12 1 1-1 7-5 12Z"/><path d="m33 50 3 3 3-3m-3 3v4"/><path fill="#68836b" d="M25 61h22l7 11H18Z"/></> },
  { ground: '#cbd9d4', art: <><path fill="#736552" d="M14 30l1-12 12 8a30 30 0 0 1 18 0l12-8 1 12c9 16 2 34-22 34S5 46 14 30Z"/><path fill="#f1ddaf" d="M17 42c0-11 14-12 19-3 5-9 19-8 19 3 0 11-9 16-19 16S17 53 17 42Z"/><path fill="#bf8351" d="m33 48 3-4 3 4-3 4Z"/><path d="M22 62h28l4 10H18" fill="#496c6b"/></> },
  { ground: '#e2cfc0', art: <><path fill="#626e68" d="M17 37c-6-9-4-16 2-17 4-1 8 2 9 8h16c1-6 5-9 9-8 6 1 8 8 2 17 12 18-1 27-19 27S5 55 17 37Z"/><path fill="#eee2c9" d="m28 27 8 8 8-8 3 17 9 8c-4 8-14 10-20 10s-16-2-20-10l9-8Z"/><path d="m33 50 3 3 3-3Z" fill="#483d34"/><path d="M26 64 18 72h36l-8-8Z" fill="#9d594a"/></> },
  { ground: '#d9dbbd', art: <><path fill="#a97854" d="M18 32c-8-3-10-9-8-14 7 1 14 5 16 12h20c2-7 9-11 16-12 2 5 0 11-8 14l-3 19c-1 9-8 13-15 13s-14-4-15-13Z"/><path fill="#e5c49c" d="M25 49c4-8 19-8 22 0 1 10-4 13-11 13s-12-3-11-13Z"/><path d="M24 24c-4-4-6-12-4-16m2 10-8-5m34 11c4-4 6-12 4-16m-2 10 8-5" stroke="#574a36"/><path d="m33 52 3 3 3-3Z" fill="#574a36"/><path fill="#52745e" d="M25 64h22l6 8H19Z"/></> },
  { ground: '#ded0d9', art: <><path fill="#796476" d="m15 35 3-16 13 9h11l13-9 3 16c6 17-4 26-22 26S9 52 15 35Z"/><path fill="#d7b8b2" d="m19 33 2-9 8 6m14 0 9-6 2 9"/><path fill="#f1d7ba" d="M19 49c8-11 11 0 17 0s10-11 17 0c-2 8-9 11-17 11s-15-3-17-11Z"/><path d="m32 49 4 3 4-3m-20 1-9-1m10 5-8 2m39-6 9-1m-10 5 8 2"/><path fill="#8a5860" d="M25 62h22l8 10H17Z"/></> },
  { ground: '#dad2b8', art: <><path fill="#896346" d="m12 43-4-9 9-4-1-11 11 3 5-10 8 8 10-5 3 10 11 2-3 11 6 8-8 11H18Z"/><path fill="#ead0a7" d="M17 46c2-10 11-16 19-16s17 6 19 16c1 10-8 16-19 16s-20-6-19-16Z"/><path fill="#59432e" d="m32 51 4 4 4-4Z"/><path fill="#a77a42" d="M26 62h20l8 10H18Z"/></> },
  { ground: '#d6d8c9', art: <><path fill="#897d62" d="m13 37 3-18 14 11h12l14-11 3 18c8 16-2 24-23 24S5 53 13 37Z"/><path fill="#545449" d="M17 38c7-9 14-4 19 0 5-4 12-9 19 0l-6 11H23Z"/><path fill="#e8d1a3" d="M22 49c9-6 19-6 28 0-2 7-7 11-14 11s-12-4-14-11Z"/><path d="m32 51 4 3 4-3Z" fill="#514338"/><path fill="#657e6e" d="M25 62h22l7 10H18Z"/></> },
];

const specials: Record<string, Portrait> = {
  warrior: { ground: '#e8c59d', art: <><path fill="#9b6548" d="M16 44c0-10 8-16 20-16s20 6 20 16c0 13-9 19-20 19s-20-6-20-19Z"/><path fill="#d5aa6b" d="M12 42c0-17 10-26 24-26s24 9 24 26l-10-4-14 7-14-7Z"/><path fill="#964937" d="M31 17V9l5 3 5-3v8l-5 13Z"/><path fill="#e3bd94" d="M20 45h32c1 11-6 16-16 16s-17-5-16-16Z"/><path fill="#8b4735" d="m20 65 16-6 16 6 3 7H17Z"/></> },
  fox: { ground: '#f0d3ad', art: <><path fill="#b8643a" d="m11 21 18 10h14l18-10-3 24c-5 9-13 15-22 18-9-3-17-9-22-18Z"/><path fill="#f4e2bd" d="M15 42c11-3 14 6 21 7 7-1 10-10 21-7-4 11-15 17-21 19-6-2-17-8-21-19Z"/><path fill="#5d4b33" d="m32 51 4 3 4-3Z"/><path fill="#406658" d="m22 64 13-4 15 4 5 8H17Z"/><path d="m55 59 4-4m-1 8 6-2" stroke="#a45332"/></> },
  astronaut: { ground: '#c8d9dd', art: <><path fill="#9d593e" d="M26 60h20l10 12H16Z"/><circle cx="36" cy="39" r="24" fill="#e4d8bd"/><path fill="#435d60" d="M18 40c0-12 8-19 18-19s18 7 18 19-7 17-18 17-18-5-18-17Z"/><path fill="#cabb91" d="M23 41c3-8 22-8 26 0-1 9-7 12-13 12s-12-3-13-12Z"/><path d="m22 31 5-5m3-2 4-1m23-10v12m-5-6h10" stroke="#827954"/><path d="M30 63h12" stroke="#e4d8bd"/></> },
  dragon: { ground: '#d3dfc1', art: <><path fill="#496f55" d="m16 48-8-12 13 2-5-11 12 4 8-11 9 10 12-4-4 12 12-2-8 12-6 12H21Z"/><path fill="#c1cc8e" d="M19 45c1-10 8-15 17-15s16 5 17 15c1 12-6 17-17 17s-18-5-17-17Z"/><path fill="#d69d59" d="m23 32-3-13c7 0 11 6 11 10m10 0c0-4 4-10 11-10l-3 13"/><path d="m31 49 2 2m8-2-2 2m-8 5 5 2 5-2"/><path fill="#53745a" d="m23 63 13-2 13 2 6 9H17Z"/></> },
};

export function AvatarPortrait({ index, special }: { index: number; special?: string | null }) {
  const portrait = (special && Object.prototype.hasOwnProperty.call(specials, special) ? specials[special] : null) || portraits[index % portraits.length] || portraits[0];
  return <svg viewBox="0 0 72 72" className="hq-avatar-art" aria-hidden="true">
    <path d="M0 0h72v72H0z" fill={portrait.ground}/>
    <path d="M6 59 22 11M15 63 32 9m19 52 14-41m-7 44 9-25" stroke="#443c3024" strokeWidth="1"/>
    <g stroke="#483b31" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round">{portrait.art}</g>
    <path d="M27 43h.2m17.6 0h.2" stroke="#3e3328" strokeWidth="2.65" strokeLinecap="round"/>
  </svg>;
}

const frames: Record<string, { ink: string; paper: string; pattern: ReactNode }> = {
  gold_ring: { ink: '#7e5425', paper: '#e3b878', pattern: <path d="M4 17 17 4m30 0 13 13m0 30L47 60M17 60 4 47"/> },
  fire_ring: { ink: '#7d3b34', paper: '#d78d6a', pattern: <path d="m5 18 5-9 5 4 5-8m39 13-5-9-5 4-5-8M5 46l5 9 5-4 5 8m39-13-5 9-5-4-5 8"/> },
  cyber_ring: { ink: '#345451', paper: '#a1b5a2', pattern: <path d="M4 18h9V4m38 0v9h9M4 46h9v14m38 0v-9h9"/> },
  crystal_ring: { ink: '#5f496b', paper: '#c7accb', pattern: <path d="m5 13 8-8 8 3-8 7Zm54 0-8-8-8 3 8 7ZM5 51l8 8 8-3-8-7Zm54 0-8 8-8-3 8-7Z"/> },
  rainbow_ring: { ink: '#6f5246', paper: '#dec39b', pattern: <><path d="M10 7h19" stroke="#aa5545"/><path d="M35 7h19" stroke="#988144"/><path d="M10 57h19" stroke="#558073"/><path d="M35 57h19" stroke="#8c6380"/></> },
  gold_frame: { ink: '#876b3b', paper: '#e0cba2', pattern: <rect x="7" y="7" width="50" height="50" rx="8"/> },
  season_laurel: { ink: '#496348', paper: '#c9d09d', pattern: <path d="M10 49c-6-9-6-18 0-27m44 27c6-9 6-18 0-27M8 44l5-5M7 36l4-5m45 13-5-5m6-3-4-5M22 6h20m-20 52h20"/> },
};

export function AvatarBorder({ id }: { id: string }) {
  const frame = Object.prototype.hasOwnProperty.call(frames, id) ? frames[id] : undefined;
  if (!frame) return null;
  return <svg className="hq-avatar-engraving" viewBox="0 0 64 64" aria-hidden="true" fill="none">
    <rect x="3.5" y="3.5" width="57" height="57" rx="10" stroke={frame.paper} strokeWidth="6"/>
    <rect x="2" y="2" width="60" height="60" rx="11" stroke={frame.ink} strokeWidth="1.2"/>
    <g stroke={frame.ink} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">{frame.pattern}</g>
  </svg>;
}

const pins: Record<string, ReactNode> = {
  crown: <path fill="#d5a056" d="m4 7 4 3 4-6 4 6 4-3-2 11H6Z"/>,
  aura: <><circle cx="12" cy="12" r="5" fill="#deab68"/><path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.5 5.5l2 2m9 9 2 2m0-13-2 2m-9 9-2 2"/></>,
  wings: <path fill="#a6bdbe" d="M12 16C7 19 3 15 3 6c5 2 8 4 9 8 1-4 4-6 9-8 0 9-4 13-9 10Z"/>,
  flame: <path fill="#c77351" d="M12 21c-6 0-9-4-7-8l3 2C7 10 12 7 12 3c4 3 6 7 4 12l3-2c2 4-1 8-7 8Z"/>,
};

export function AvatarPin({ id }: { id: string }) {
  if (!Object.prototype.hasOwnProperty.call(pins, id)) return null;
  return <svg viewBox="0 0 24 24" aria-hidden="true" className="hq-avatar-pin"><circle cx="12" cy="12" r="11" fill="#fcf0d9" stroke="#554433"/><g stroke="#604936" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">{pins[id]}</g></svg>;
}
