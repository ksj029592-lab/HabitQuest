/**
 * 랭킹 페이지 (AvatarFrame 및 내 캐릭터 실시간 연동)
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header, AvatarFrame } from '@components';
import { useSessionStore } from '@store';
import { rankingApi } from '@api';
import { Award, ChartNoAxesCombined, CheckCheck, Flame, Medal, Trophy } from 'lucide-react';

interface PersonaRanking {
  id: string;
  name: string;
  level: number;
  score: number;
  totalQuestsCompleted: number;
  currentStreak: number;
  bestStreak: number;
  monthlySuccessRate: number;
  gold: number;
  equippedTitle: string | null;
  equippedBorder: string | null;
  equippedDecoration: string | null;
  avatarIndex: number;
  avatarUrl?: string | null;
  specialAvatarId?: string | null;
  isCurrent?: boolean;
}

const PERSONA_RANKINGS: PersonaRanking[] = [
  {
    id: 'beginner',
    name: '새로운 도전',
    level: 1,
    score: 0,
    totalQuestsCompleted: 0,
    currentStreak: 0,
    bestStreak: 0,
    monthlySuccessRate: 0,
    gold: 0,
    equippedTitle: null,
    equippedBorder: null,
    equippedDecoration: null,
    avatarIndex: 0,
  },
  {
    id: 'active',
    name: '꾸준한 참여자',
    level: 15,
    score: 0,
    totalQuestsCompleted: 156,
    currentStreak: 23,
    bestStreak: 45,
    monthlySuccessRate: 85,
    gold: 2500,
    equippedTitle: '부지런한',
    equippedBorder: '금색 테두리',
    equippedDecoration: null,
    avatarIndex: 2,
  },
  {
    id: 'advanced',
    name: '전설의 퀘스터',
    level: 45,
    score: 0,
    totalQuestsCompleted: 1203,
    currentStreak: 89,
    bestStreak: 120,
    monthlySuccessRate: 95,
    gold: 8000,
    equippedTitle: '전설의',
    equippedBorder: '무지개 테두리',
    equippedDecoration: null,
    avatarIndex: 4,
  },
];

const calculateSeasonScore = (persona: PersonaRanking, seasonRankingPoints = 0) =>
  persona.level * 100 +
  persona.totalQuestsCompleted * 10 +
  persona.bestStreak * 5 +
  persona.currentStreak * 2 +
  seasonRankingPoints;

export const RankingPage: React.FC = () => {
  const navigate = useNavigate();
  const session = useSessionStore((state) => state.session);
  const [rankings, setRankings] = useState<PersonaRanking[]>([]);
  const [expandedPersona, setExpandedPersona] = useState<string | null>(null);

  useEffect(() => {
    let allRankers = PERSONA_RANKINGS.map((persona) => ({ ...persona }));

    if (session && session.personaData) {
      const p = session.personaData;
      const currentPersonaRanking: PersonaRanking = {
        ...(PERSONA_RANKINGS.find((persona) => persona.id === session.personaId) || PERSONA_RANKINGS[0]),
        name: p.persona?.name || '나의 페르소나',
        level: p.level || 1,
        totalQuestsCompleted: p.stats?.totalQuestsCompleted || 0,
        currentStreak: p.streak?.currentStreak || 0,
        bestStreak: p.streak?.bestStreak || 0,
        monthlySuccessRate: p.stats?.monthlySuccessRate || 0,
        gold: p.gold || 0,
        equippedTitle: p.equippedTitle || null,
        equippedBorder: p.equippedBorder || null,
        equippedDecoration: p.equippedDecoration || null,
        avatarIndex: p.avatarIndex || 0,
        avatarUrl: p.avatarUrl || null,
        specialAvatarId: p.specialAvatarId || null,
        isCurrent: true,
        score: 0,
      };

      allRankers = allRankers.map((persona) =>
        persona.id === currentPersonaRanking.id ? currentPersonaRanking : persona
      );
    }

    const loadRanking = async () => {
      try {
        const response = await rankingApi.getCurrentSeasonRanking();
        if (response.success && response.data?.length) {
          const serverRankings = response.data.map((entry) => ({
            ...PERSONA_RANKINGS.find((persona) => persona.id === entry.personaId),
            id: entry.personaId || entry.userId,
            name: entry.name,
            level: entry.level,
            score: entry.points,
            isCurrent: entry.userId === session?.personaData.userId,
            totalQuestsCompleted: 0,
            currentStreak: 0,
            bestStreak: 0,
            monthlySuccessRate: 0,
            gold: 0,
            equippedTitle: null,
            equippedBorder: null,
            equippedDecoration: null,
            avatarIndex: 0,
          } as PersonaRanking));
          setRankings(serverRankings);
          return;
        }
      } catch (error) {
        console.error('Ranking API failed; using local ranking fallback:', error);
      }

      const withScores = allRankers.map((p) => ({
        ...p,
        score: calculateSeasonScore(p, p.isCurrent ? session?.personaData.seasonRankingPoints : 0),
      }));
      setRankings([...withScores].sort((a, b) => b.score - a.score));
    };

    loadRanking();
  }, [session]);

  return (
    <div className="hq-app flex flex-col">
      {/* 헤더 */}
      <Header
        title="시즌 랭킹 순위표"
        subtitle="전국 퀘스터들과 경쟁해 상위 랭킹에 도전하세요!"
        onBackPress={() => navigate('/home')}
      />

      {/* 랭킹 리스트 */}
      <div className="hq-legacy flex-1 overflow-y-auto px-5 py-8 space-y-3 max-w-3xl mx-auto w-full pb-20">
        {rankings.map((persona, index) => {
          const isTop3 = index < 3;
          const cardBg = persona.isCurrent
            ? 'bg-gradient-to-r from-purple-900/60 via-indigo-900/50 to-slate-900/70 border-purple-400/50 shadow-purple-900/40'
            : isTop3
            ? 'bg-gradient-to-r from-slate-900/90 via-slate-900/80 to-slate-950/90 border-amber-400/30 shadow-xl'
            : 'bg-white/5 border-white/10 hover:bg-white/10';

          return (
            <div key={persona.id} className="space-y-2">
              <div
                onClick={() =>
                  setExpandedPersona(expandedPersona === persona.id ? null : persona.id)
                }
                className={`w-full rounded-2xl p-4 border backdrop-blur-xl transition-all duration-300 hover:scale-[1.01] active:scale-95 cursor-pointer shadow-lg ${cardBg}`}
              >
                <div className="flex items-center justify-between gap-3">
                  {/* 순위 메달 & 아바타 오버레이 렌더링 */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 flex justify-center shrink-0" aria-label={`${index + 1}위`}>
                      {isTop3 ? <Medal size={28} strokeWidth={1.6} className={index === 0 ? 'text-amber-600' : index === 1 ? 'text-gray-500' : 'text-rose-700'} aria-hidden="true" /> : <span>{index + 1}</span>}
                    </div>

                    {/* 공통 AvatarFrame 컴포넌트로 프로필 사진, 테두리, 장식 시각적 통합 표현 */}
                    <AvatarFrame
                      avatarIndex={persona.avatarIndex}
                      avatarUrl={persona.avatarUrl}
                      specialAvatarId={persona.specialAvatarId}
                      equippedBorder={persona.equippedBorder}
                      equippedDecoration={persona.equippedDecoration}
                      size="lg"
                    />

                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-purple-300 font-extrabold">#{index + 1}위</span>
                        {persona.isCurrent && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/40 text-purple-100 border border-purple-300 font-bold">
                            ME
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-extrabold text-white flex items-center gap-1.5 mt-0.5">
                        {persona.equippedTitle && (
                          <span className="text-purple-300">{persona.equippedTitle}</span>
                        )}
                        {persona.name}
                      </h3>
                      <p className="text-xs text-slate-300 font-medium">
                        Lv.{persona.level}
                      </p>
                    </div>
                  </div>

                  {/* 점수 & 펼침 버튼 */}
                  <div className="text-right shrink-0">
                    <div className="text-xl font-black bg-gradient-to-r from-yellow-300 via-amber-300 to-yellow-500 bg-clip-text text-transparent">
                      {persona.score.toLocaleString()} P
                    </div>
                    <span className="text-[10px] text-slate-400">시즌 점수</span>
                  </div>
                </div>
              </div>

              {/* 상세 정보 펼침 모달/카드 */}
              {expandedPersona === persona.id && (
                <div className="bg-slate-900/90 rounded-2xl p-4 space-y-2 border border-white/10 text-xs shadow-2xl animate-fadeIn">
                  <div className="grid grid-cols-2 gap-2 text-slate-300">
                    <div className="bg-white/5 p-2 rounded-xl border border-white/10 flex justify-between">
                      <span className="inline-flex items-center gap-1"><Flame size={14} aria-hidden="true" />현재 연속 출석:</span>
                      <span className="font-bold text-orange-400">{persona.currentStreak}일</span>
                    </div>
                    <div className="bg-white/5 p-2 rounded-xl border border-white/10 flex justify-between">
                      <span className="inline-flex items-center gap-1"><Award size={14} aria-hidden="true" />최고 연속 출석:</span>
                      <span className="font-bold text-red-400">{persona.bestStreak}일</span>
                    </div>
                    <div className="bg-white/5 p-2 rounded-xl border border-white/10 flex justify-between">
                      <span className="inline-flex items-center gap-1"><CheckCheck size={14} aria-hidden="true" />완료 퀘스트:</span>
                      <span className="font-bold text-purple-300">{persona.totalQuestsCompleted}개</span>
                    </div>
                    <div className="bg-white/5 p-2 rounded-xl border border-white/10 flex justify-between">
                      <span className="inline-flex items-center gap-1"><ChartNoAxesCombined size={14} aria-hidden="true" />월간 달성률:</span>
                      <span className="font-bold text-emerald-400">{persona.monthlySuccessRate}%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 하단 점수 안내 바 */}
      <div className="shrink-0 px-4 py-3 bg-slate-900/90 border-t border-white/10 text-center">
        <p className="text-[11px] text-slate-400">
          <Trophy size={14} className="inline-block mr-1" aria-hidden="true" /> 시즌 점수 계산 공식: (레벨 × 100) + (완료 퀘스트 × 10) + (최고연속 × 5) + (현재연속 × 2)
        </p>
      </div>
    </div>
  );
};
