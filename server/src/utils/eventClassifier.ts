/**
 * Event classification and normalization utility for Chicago Jewish community events.
 */

export interface EventMetadata {
  organization: string;
  orgGroup: string;
  neighborhood: string | null;
  categories: string[];
}

export function classifyEvent(
  title: string,
  description?: string | null,
  location?: string | null,
  hostName?: string | null,
  sourceName?: string | null
): EventMetadata {
  const t = (title || '').toLowerCase();
  const d = (description || '').toLowerCase();
  const l = (location || '').toLowerCase();
  const h = (hostName || '').toLowerCase();
  const s = (sourceName || '').toLowerCase();
  const combined = `${t} ${d} ${l} ${h} ${s}`;

  // 1. Organization & Org Group
  let organization = hostName?.trim() || sourceName?.trim() || 'Community Organizer';
  let orgGroup = 'Other Community';

  if (combined.includes('moishe') || combined.includes('moho')) {
    orgGroup = 'Moishe House';
    if (combined.includes('wrigley')) organization = 'Moishe House: Wrigleyville';
    else if (combined.includes('lincoln park') || combined.includes('lp moho')) organization = 'Moishe House: Lincoln Park';
    else if (combined.includes('wicker park') || combined.includes('mohowicker')) organization = 'Moishe House: Wicker Park';
    else if (combined.includes('lakeview moishe pod') || combined.includes('gmi91wtnnz4dkca7aiy4')) organization = 'Lakeview Moishe Pod';
    else if (combined.includes('lakeview') || combined.includes('lakeviewmoishe')) organization = 'Moishe House: Lakeview';
    else if (combined.includes('streeterville') || combined.includes('mpod.streeterville')) organization = 'Moishe Pod: Streeterville';
    else if (combined.includes('rsj')) organization = 'RSJ Moishe House Chicago';
    else organization = 'Moishe House';
  } else if (combined.includes('chabad')) {
    orgGroup = 'Chabad';
    if (combined.includes('east lakeview')) organization = 'Chabad East Lakeview';
    else if (combined.includes('lakeview')) organization = 'Chabad Lakeview';
    else if (combined.includes('lincoln park')) organization = 'Chabad Lincoln Park';
    else if (combined.includes('loop')) organization = 'Chabad of the Loop';
    else organization = 'Chabad';
  } else if (combined.includes('base') || combined.includes('silverstein')) {
    orgGroup = 'Silverstein Base';
    if (combined.includes('logan square') || combined.includes('lgsq')) organization = 'Base Logan Square';
    else if (combined.includes('andersonville') || combined.includes('anvl')) organization = 'Base Andersonville';
    else if (combined.includes('lincoln park')) organization = 'Base Lincoln Park';
    else if (combined.includes('loop')) organization = 'Base Loop';
    else if (combined.includes('metrochihillel') || combined.includes('metro chicago hillel')) organization = 'Metro Chicago Hillel';
    else organization = 'Silverstein Base Chicago';
  } else if (combined.includes('mishkan')) {
    orgGroup = 'Mishkan Chicago';
    organization = 'Mishkan Chicago';
  } else if (combined.includes('onetable')) {
    orgGroup = 'OneTable';
    organization = 'OneTable';
  } else if (combined.includes('juf') || combined.includes('yld') || combined.includes('young leadership')) {
    orgGroup = 'JUF / YLD';
    organization = 'JUF Young Leadership Division';
  } else if (combined.includes('jcua') || combined.includes('urban affairs') || combined.includes('kol or')) {
    orgGroup = 'JCUA';
    organization = 'JCUA (Jewish Council on Urban Affairs)';
  } else if (combined.includes('anshe emet')) {
    orgGroup = 'Anshe Emet';
    organization = combined.includes('yad') ? 'Anshe Emet YAD' : 'Anshe Emet Synagogue';
  } else if (combined.includes('kam isaiah israel') || combined.includes('kamii')) {
    orgGroup = 'Synagogues & Congregations';
    organization = 'KAM Isaiah Israel';
  } else if (combined.includes('makom shalom')) {
    orgGroup = 'Synagogues & Congregations';
    organization = 'Makom Shalom Mitziut';
  } else if (combined.includes('repair the world') || combined.includes('sharsheret x repair')) {
    orgGroup = 'Civic & Social Justice';
    organization = 'Repair the World Chicago';
  } else if (combined.includes('temple beth-el') || combined.includes('beth-el')) {
    orgGroup = 'Synagogues & Congregations';
    organization = 'Temple Beth-El';
  } else if (combined.includes('rodfei zedek')) {
    orgGroup = 'Synagogues & Congregations';
    organization = 'Congregation Rodfei Zedek';
  } else if (combined.includes('chitribe')) {
    orgGroup = 'ChiTribe';
    organization = hostName && hostName !== 'ChiTribe' ? hostName : 'ChiTribe';
  }

  // 2. Neighborhood
  let neighborhood: string | null = null;
  if (combined.includes('lakeview') || combined.includes('lake view') || combined.includes('wrigley')) {
    neighborhood = 'Lakeview / Wrigleyville';
  } else if (combined.includes('lincoln park') || combined.includes('old town')) {
    neighborhood = 'Lincoln Park / Old Town';
  } else if (combined.includes('wicker park') || combined.includes('bucktown') || combined.includes('logan square')) {
    neighborhood = 'Wicker Park / Bucktown';
  } else if (combined.includes('streeterville') || combined.includes('gold coast') || combined.includes('river north')) {
    neighborhood = 'Streeterville / River North';
  } else if (combined.includes('loop') || combined.includes('downtown') || combined.includes('fulton')) {
    neighborhood = 'Downtown / Loop';
  } else if (combined.includes('hyde park') || combined.includes('south side') || combined.includes('5200 s hyde park')) {
    neighborhood = 'Hyde Park';
  } else if (combined.includes('andersonville') || combined.includes('rogers park') || combined.includes('edgewater')) {
    neighborhood = 'Andersonville / Rogers Park';
  } else if (combined.includes('skokie') || combined.includes('northbrook') || combined.includes('highland park') || combined.includes('evanston') || combined.includes('suburb')) {
    neighborhood = 'Suburbs / Chicagoland';
  } else if (combined.includes('virtual') || combined.includes('zoom') || combined.includes('online')) {
    neighborhood = 'Virtual / Online';
  }

  // 3. Category Tags
  const categories: string[] = [];
  if (combined.includes('shabbat') || combined.includes('shabbos') || combined.includes('kabbalat') || combined.includes('havdalah')) {
    categories.push('Shabbat');
  }
  if (
    combined.includes('sukkot') ||
    combined.includes('sukkah') ||
    combined.includes('lulav') ||
    combined.includes('simchat torah') ||
    combined.includes('holiday') ||
    combined.includes('hanukkah') ||
    combined.includes('purim') ||
    combined.includes('passover') ||
    combined.includes('rosh hashanah') ||
    combined.includes('yom kippur')
  ) {
    categories.push('Holiday');
  }
  if (
    combined.includes('party') ||
    combined.includes('social') ||
    combined.includes('mixer') ||
    combined.includes('happy hour') ||
    combined.includes('spooky') ||
    combined.includes('halloween') ||
    combined.includes('trivia') ||
    combined.includes('game')
  ) {
    categories.push('Social');
  }
  if (
    combined.includes('dinner') ||
    combined.includes('food') ||
    combined.includes('wine') ||
    combined.includes('tasting') ||
    combined.includes('candy') ||
    combined.includes('baking') ||
    combined.includes('bagel') ||
    combined.includes('brunch') ||
    combined.includes('cafe')
  ) {
    categories.push('Food & Drink');
  }
  if (
    combined.includes('volunteer') ||
    combined.includes('food drive') ||
    combined.includes('just harvest') ||
    combined.includes('love fridge') ||
    combined.includes('donate') ||
    combined.includes('service') ||
    combined.includes('tikkun olam')
  ) {
    categories.push('Volunteering');
  }
  if (
    combined.includes('class') ||
    combined.includes('learning') ||
    combined.includes('torah') ||
    combined.includes('talk') ||
    combined.includes('history') ||
    combined.includes('democracy') ||
    combined.includes('genealogical')
  ) {
    categories.push('Learning');
  }
  if (
    combined.includes('concert') ||
    combined.includes('orchestra') ||
    combined.includes('music') ||
    combined.includes('movie') ||
    combined.includes('film') ||
    combined.includes('art') ||
    combined.includes('mahjong')
  ) {
    categories.push('Arts & Culture');
  }
  if (
    combined.includes('marathon') ||
    combined.includes('yoga') ||
    combined.includes('sweat') ||
    combined.includes('fitness') ||
    combined.includes('running') ||
    combined.includes('sports')
  ) {
    categories.push('Wellness & Sports');
  }

  if (categories.length === 0) {
    categories.push('Community Gathering');
  }

  return {
    organization,
    orgGroup,
    neighborhood,
    categories,
  };
}

/**
 * Normalizes title for deduplication comparison.
 */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
