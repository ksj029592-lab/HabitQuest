export function seasonDates(yearMonth: string) {
  const [year, month] = yearMonth.split('-').map(Number);
  return {
    startAtKst: new Date(`${yearMonth}-01T00:00:00+09:00`),
    endAtKst: new Date(Date.UTC(year, month, 1) - 9 * 60 * 60 * 1000),
  };
}
