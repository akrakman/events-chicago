import { seedDefaultSources, pollAllSources } from '../server/src/services/eventPoller';
import { prisma } from '../server/src/db';

async function main() {
  console.log('--- 1. Seeding Default Sources (and pruning legacy sources) ---');
  await seedDefaultSources();

  console.log('\n--- 2. Checking Monitored Sources in DB ---');
  const sources = await prisma.monitoredSource.findMany();
  console.log(`Found ${sources.length} sources in DB:`);
  sources.forEach((s) => console.log(` - [${s.platform}] ${s.name} (${s.url})`));

  console.log('\n--- 3. Polling all 12 primary sources ---');
  const res = await pollAllSources();
  console.log('Poll completed:', JSON.stringify(res, null, 2));

  console.log('\n--- 4. Checking Extracted Events ---');
  const totalEvents = await prisma.extractedItem.count();
  const chitribeCount = await prisma.extractedItem.count({ where: { platform: 'CHITRIBE' } });
  console.log(`Total extracted items in DB: ${totalEvents}`);
  console.log(`ChiTribe items remaining in DB: ${chitribeCount}`);

  const upcomingEvents = await prisma.extractedItem.findMany({
    where: { eventDate: { gte: new Date('2026-01-01') } },
    orderBy: { eventDate: 'asc' },
    select: { title: true, hostName: true, eventDate: true, url: true },
  });
  console.log(`\nFound ${upcomingEvents.length} dated events. Sample:`);
  upcomingEvents.slice(0, 15).forEach((e) => {
    console.log(` - [${e.eventDate?.toISOString().slice(0, 10)}] ${e.title} (Host: ${e.hostName})`);
  });

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
