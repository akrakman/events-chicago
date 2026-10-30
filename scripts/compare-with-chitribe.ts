import { runChiTribeParityCheck } from '../server/src/services/parityChecker';
import { prisma } from '../server/src/db';

async function main() {
  const report = await runChiTribeParityCheck();

  console.log(`\n================================================================`);
  console.log(`🔍 CHITRIBE INDEPENDENCE & PARITY VERIFICATION REPORT`);
  console.log(`================================================================`);
  console.log(`Depends on chitribe.org:         ${report.dependsOnChiTribe ? '❌ YES' : '✅ NO (100% Independent)'}`);
  console.log(`ChiTribe Monitored Sources:      ${report.chiTribeSourcesCount}`);
  console.log(`ChiTribe Items / URLs in DB:     ${report.chiTribeItemsCount}`);
  console.log(`----------------------------------------------------------------`);
  console.log(`ChiTribe Benchmark Events:       ${report.chiTribeTotalEvents}`);
  console.log(`Our Compiled Primary Events:     ${report.ourTotalEvents} (${report.ourUniqueEvents} unique titles)`);
  console.log(`Matched ChiTribe Events:         ${report.matchedCount} / ${report.chiTribeTotalEvents} (${report.parityPercentage}%)`);
  console.log(`Missing from Our App:            ${report.missingFromOurAppCount}`);
  console.log(`Extra Events We Have Over ChiTribe: +${report.additionalEventsInOurAppCount} additional events/links`);
  console.log(`================================================================\n`);

  if (report.missingEvents.length > 0) {
    console.log('⚠️ Missing events:');
    report.missingEvents.forEach((m) => console.log(`  - [${m.date?.slice(0, 10) || 'TBD'}] ${m.title} (${m.hostName})`));
  } else {
    console.log('✅ All ChiTribe events are covered by our direct primary sources!');
  }

  console.log(`\n✨ Sample of +${report.additionalEventsInOurAppCount} Additional Events Found by Our Direct Poller (Not on ChiTribe):`);
  report.additionalEventsSample.slice(0, 15).forEach((e) => {
    console.log(`  • [${e.date?.slice(0, 10) || 'Upcoming'}] ${e.title} — via ${e.sourceName}`);
  });

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
