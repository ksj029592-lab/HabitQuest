import { PrismaClient } from '@prisma/client';
import { settleSeason } from './season-settlement';

async function main() {
  const [yearMonth, mode, ...rest] = process.argv.slice(2);
  if (!process.env.DATABASE_URL || !yearMonth || (mode && mode !== '--apply') || rest.length) {
    throw new Error('Set DATABASE_URL and use: npm run season:settle -- YYYY-MM [--apply]');
  }
  const db = new PrismaClient();
  try {
    console.log(await settleSeason(db, yearMonth, mode === '--apply'));
  } finally {
    await db.$disconnect();
  }
}

void main().catch(() => {
  console.error('Settlement could not complete. Check the database, month, and command arguments.');
  process.exitCode = 1;
});
