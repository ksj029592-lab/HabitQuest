import { ACHIEVEMENTS, qualifies } from "./catalog";
describe("achievement catalog", () => {
  it("defines exactly 20 unique achievement/title/trophy triples", () => {
    expect(ACHIEVEMENTS).toHaveLength(20);
    for (const key of ["id", "titleId", "trophyId"] as const)
      expect(new Set(ACHIEVEMENTS.map((i) => i[key])).size).toBe(20);
  });
  it.each(ACHIEVEMENTS)(
    "$id respects its threshold and unknown evidence",
    (item) => {
      expect(qualifies(item.target, item.target - 1)).toBe(false);
      expect(qualifies(item.target, item.target)).toBe(true);
      expect(qualifies(item.target, null)).toBe(false);
    },
  );
});
