// 난이도별 랭킹 포인트 (쉬움 < 보통 < 어려움)
export const RANKING_POINT_BY_DIFFICULTY: Record<string, number> = {
  easy: 10,
  normal: 20,
  hard: 30,
};

export const getRankingPointReward = (difficulty: string): number =>
  RANKING_POINT_BY_DIFFICULTY[difficulty] ?? RANKING_POINT_BY_DIFFICULTY.easy;
