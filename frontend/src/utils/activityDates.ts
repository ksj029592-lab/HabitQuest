export const getKstDate = (date = new Date()) => {
  const values = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date).map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};

export const shiftActivityDate = (date: string, days: number) => {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
};

export const shiftActivityMonth = (month: string, amount: number) => {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(Date.UTC(year, monthNumber - 1 + amount, 1)).toISOString().slice(0, 7);
};

export const currentActivityWeek = () => {
  const today = getKstDate();
  return shiftActivityDate(today, -((new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7));
};