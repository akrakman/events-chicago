import * as cheerio from 'cheerio';

async function main() {
  const res = await fetch('https://chitribe.org/events/sukkot-co-working/', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    },
  });
  const html = await res.text();
  const $ = cheerio.load(html);

  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).html() || '{}');
      console.log('JSON-LD Event on ChiTribe:');
      console.log(JSON.stringify(data, null, 2));
    } catch {}
  });
}

main().catch(console.error);
