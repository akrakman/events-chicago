/**
 * Chicago Shabbat Times & Parsha Utilities
 * Coordinates for Chicago: Lat 41.8781° N, Lon 87.6298° W (America/Chicago timezone)
 */

export interface ShabbatInfo {
  parsha: string;
  candleLightingStr: string;
  havdalahStr: string;
  fridayDateStr: string;
  saturdayDateStr: string;
}

// Fallback astronomical calculation for Chicago sunset if offline
function getChicagoSunTimes(date: Date) {
  // Approximate Chicago sunset time (varies between 4:20 PM in Dec to 8:30 PM in June)
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
  );
  // Solar declination approximation
  const rad = Math.PI / 180;
  const dec = -23.45 * Math.cos(((2 * Math.PI) / 365) * (dayOfYear + 10)) * rad;
  const lat = 41.8781 * rad;
  const hourAngle = Math.acos(-Math.tan(lat) * Math.tan(dec));
  const sunsetHoursUtc = 12 + (hourAngle / rad) / 15 + 87.6298 / 15;
  
  // Approximate Chicago standard vs daylight time
  const month = date.getMonth();
  const isDst = month >= 2 && month <= 10;
  const offsetHours = isDst ? -5 : -6;
  const sunsetLocal = (sunsetHoursUtc + offsetHours + 24) % 24;
  
  const sunsetHours = Math.floor(sunsetLocal);
  const sunsetMins = Math.floor((sunsetLocal - sunsetHours) * 60);

  // Candle lighting is 18 minutes before sunset
  let candleMins = sunsetMins - 18;
  let candleHours = sunsetHours;
  if (candleMins < 0) {
    candleMins += 60;
    candleHours -= 1;
  }

  // Havdalah is 42 minutes after sunset on Saturday
  let havdalahMins = sunsetMins + 42;
  let havdalahHours = sunsetHours;
  if (havdalahMins >= 60) {
    havdalahMins -= 60;
    havdalahHours += 1;
  }

  const fmt = (h: number, m: number) => {
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
  };

  return {
    candleLighting: fmt(candleHours, candleMins),
    havdalah: fmt(havdalahHours, havdalahMins),
  };
}

export async function getChicagoShabbatTimes(): Promise<ShabbatInfo> {
  const now = new Date();
  const day = now.getDay(); // 0 is Sunday, 5 is Friday, 6 is Saturday
  
  // Find upcoming or current Friday
  const daysUntilFriday = (5 - day + 7) % 7;
  const friday = new Date(now);
  friday.setDate(now.getDate() + (day === 6 ? -1 : daysUntilFriday));

  const saturday = new Date(friday);
  saturday.setDate(friday.getDate() + 1);

  const fridayDateStr = friday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const saturdayDateStr = saturday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  // Default fallback
  const fallbackTimes = getChicagoSunTimes(friday);
  let result: ShabbatInfo = {
    parsha: 'Weekly Torah Portion',
    candleLightingStr: fallbackTimes.candleLighting,
    havdalahStr: fallbackTimes.havdalah,
    fridayDateStr,
    saturdayDateStr,
  };

  try {
    const res = await fetch(
      'https://www.hebcal.com/shabbat?cfg=json&geonameid=4887398&M=on&b=18',
      { signal: AbortSignal.timeout(3000) }
    );
    if (res.ok) {
      const data = await res.json();
      const items = data.items || [];
      const candleItem = items.find((i: any) => i.category === 'candles');
      const havdalahItem = items.find((i: any) => i.category === 'havdalah');
      const parshaItem = items.find((i: any) => i.category === 'parashat');

      if (candleItem?.title) {
        const match = candleItem.title.match(/(\d+:\d+\s*[ap]m)/i);
        if (match) result.candleLightingStr = match[1].toUpperCase();
      }
      if (havdalahItem?.title) {
        const match = havdalahItem.title.match(/(\d+:\d+\s*[ap]m)/i);
        if (match) result.havdalahStr = match[1].toUpperCase();
      }
      if (parshaItem?.title) {
        result.parsha = parshaItem.title.replace(/^Parashat\s+/i, 'Parshat ');
      }
    }
  } catch {
    // Graceful offline fallback
  }

  return result;
}
