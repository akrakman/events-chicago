import * as cheerio from 'cheerio';
import { detectPlatform, inferItemPlatform } from './detector';
import { ParsedItem, PlatformType, ScrapeResult } from '../types';

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36';

export async function scrapeWithCheerio(url: string, timeoutMs = 10000): Promise<ScrapeResult | null> {
  const startTime = Date.now();
  const { platform, subPlatform, normalizedUrl } = detectPlatform(url);

  let html: string;
  try {
    const response = await fetch(normalizedUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
      },
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'follow',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    html = await response.text();
  } catch (err: any) {
    return {
      url: normalizedUrl,
      platform,
      method: 'CHEERIO_STATIC',
      durationMs: Date.now() - startTime,
      items: [],
      errorMessage: `Cheerio fetch failed: ${err.message || String(err)}`,
    };
  }

  const $ = cheerio.load(html);

  // 1. Check for Next.js __NEXT_DATA__
  let nextData: any = null;
  const nextDataScript = $('script#__NEXT_DATA__').html();
  if (nextDataScript) {
    try {
      nextData = JSON.parse(nextDataScript);
    } catch {
      nextData = null;
    }
  }

  // 2. Check for JSON-LD scripts
  const jsonLdList: any[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const content = $(el).html();
      if (content) {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          jsonLdList.push(...parsed);
        } else {
          jsonLdList.push(parsed);
        }
      }
    } catch {}
  });

  // Basic metadata from meta tags
  const ogTitle = $('meta[property="og:title"]').attr('content') || $('meta[name="twitter:title"]').attr('content') || $('title').text().trim() || null;
  const ogDesc = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || null;
  const ogImage = $('meta[property="og:image"]').attr('content') || $('meta[name="twitter:image"]').attr('content') || null;
  const authorMeta = $('meta[name="author"]').attr('content') || null;

  const durationMs = Date.now() - startTime;
  const method = nextData ? 'CHEERIO_NEXT_DATA' : 'CHEERIO_STATIC';

  // Platform specific parsing
  switch (platform) {
    case 'LINKTREE':
      return parseLinktree({
        normalizedUrl,
        $,
        nextData,
        ogTitle,
        ogDesc,
        ogImage,
        durationMs,
        method,
      });

    case 'PARTIFUL':
      return parsePartiful({
        normalizedUrl,
        $,
        nextData,
        jsonLdList,
        ogTitle,
        ogDesc,
        ogImage,
        durationMs,
        method,
      });

    case 'SOCIAL':
      return parseSocial({
        normalizedUrl,
        subPlatform,
        $,
        nextData,
        jsonLdList,
        ogTitle,
        ogDesc,
        ogImage,
        authorMeta,
        durationMs,
        method,
      });

    case 'GENERIC':
    default:
      return parseGeneric({
        normalizedUrl,
        $,
        nextData,
        jsonLdList,
        ogTitle,
        ogDesc,
        ogImage,
        authorMeta,
        durationMs,
        method,
      });
  }
}

// -------------------------------------------------------------
// Linktree Parser
// -------------------------------------------------------------
function parseLinktree(params: {
  normalizedUrl: string;
  $: cheerio.CheerioAPI;
  nextData: any;
  ogTitle: string | null;
  ogDesc: string | null;
  ogImage: string | null;
  durationMs: number;
  method: 'CHEERIO_NEXT_DATA' | 'CHEERIO_STATIC';
}): ScrapeResult {
  const { normalizedUrl, $, nextData, ogTitle, ogDesc, ogImage, durationMs, method } = params;
  const items: ParsedItem[] = [];

  let title = ogTitle;
  let description = ogDesc;
  let author: string | null = null;
  let avatarUrl = ogImage;

  // Extract from Next.js hydration payload if present
  if (nextData?.props?.pageProps) {
    const pageProps = nextData.props.pageProps;

    const account = pageProps.account || pageProps.user || {};
    if (account.username) author = `@${account.username}`;
    if (account.profilePictureUrl || account.avatar) avatarUrl = account.profilePictureUrl || account.avatar;
    if (account.description || account.bio) description = account.description || account.bio;
    if (account.pageTitle) title = account.pageTitle;

    // Links array in Linktree Next data
    const links = pageProps.links || pageProps.account?.links || [];
    if (Array.isArray(links)) {
      for (const link of links) {
        if (!link || !link.url) continue;
        const linkUrl = link.url.trim();
        const linkTitle = link.title || link.name || linkUrl;
        const subPlat = inferItemPlatform(linkUrl);

        items.push({
          title: linkTitle,
          url: linkUrl,
          itemType: subPlat === 'PARTIFUL' ? 'EVENT' : 'LINK',
          platform: subPlat,
          description: link.description || null,
          imageUrl: link.thumbnailUrl || link.imageUrl || null,
          icon: link.type || null,
          isPinned: !!link.pinned,
          metadata: {
            id: link.id,
            type: link.type,
            position: link.position,
          },
        });
      }
    }

    // Social links in Linktree Next data
    const socialLinks = pageProps.socialLinks || pageProps.account?.socialLinks || [];
    if (Array.isArray(socialLinks)) {
      for (const soc of socialLinks) {
        if (!soc || !soc.url) continue;
        const socUrl = soc.url.trim();
        const socPlatform = soc.type?.toUpperCase() || inferItemPlatform(socUrl);

        items.push({
          title: `${soc.type || 'Social'} profile`,
          url: socUrl,
          itemType: 'SOCIAL',
          platform: socPlatform,
          icon: soc.type || null,
          metadata: soc,
        });
      }
    }
  }

  // DOM fallback if nextData had no links
  if (items.length === 0) {
    $('a[data-testid="LinkButton"], a[data-testid="LinkUrl"], a[href*="linktr.ee/"]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
      const text = $(el).text().trim() || href;
      const subPlat = inferItemPlatform(href);

      items.push({
        title: text,
        url: href,
        itemType: 'LINK',
        platform: subPlat,
      });
    });

    // Bio and avatar from DOM
    if (!avatarUrl) {
      avatarUrl = $('img[data-testid="ProfileImage"], img[alt*="profile"], img[alt*="avatar"]').attr('src') || null;
    }
    if (!title) {
      title = $('h1, [data-testid="ProfileHeader"]').text().trim() || null;
    }
    if (!description) {
      description = $('[data-testid="ProfileDescription"], p').first().text().trim() || null;
    }
  }

  return {
    url: normalizedUrl,
    platform: 'LINKTREE',
    method,
    durationMs,
    title: title || 'Linktree Profile',
    description,
    author: author || (title ? title.replace(/^@/, '') : null),
    avatarUrl,
    rawPayload: nextData ? JSON.stringify(nextData) : null,
    items,
  };
}

// -------------------------------------------------------------
// Partiful Parser
// -------------------------------------------------------------
function parsePartiful(params: {
  normalizedUrl: string;
  $: cheerio.CheerioAPI;
  nextData: any;
  jsonLdList: any[];
  ogTitle: string | null;
  ogDesc: string | null;
  ogImage: string | null;
  durationMs: number;
  method: 'CHEERIO_NEXT_DATA' | 'CHEERIO_STATIC';
}): ScrapeResult {
  const { normalizedUrl, $, nextData, jsonLdList, ogTitle, ogDesc, ogImage, durationMs, method } = params;
  const items: ParsedItem[] = [];

  let title = ogTitle;
  let description = ogDesc;
  let author: string | null = null;
  let avatarUrl = ogImage;
  let eventDate: string | null = null;
  let eventEndDate: string | null = null;
  let location: string | null = null;
  let rsvpCount: number | null = null;

  // Check JSON-LD Event schema
  const eventLd = jsonLdList.find((item) => item['@type'] === 'Event' || item.type === 'Event');
  if (eventLd) {
    if (eventLd.name) title = eventLd.name;
    if (eventLd.description) description = eventLd.description;
    if (eventLd.startDate) eventDate = eventLd.startDate;
    if (eventLd.endDate) eventEndDate = eventLd.endDate;
    if (eventLd.image) avatarUrl = typeof eventLd.image === 'string' ? eventLd.image : eventLd.image?.url;
    if (eventLd.organizer) {
      author = typeof eventLd.organizer === 'string' ? eventLd.organizer : eventLd.organizer.name;
    }
    if (eventLd.location) {
      if (typeof eventLd.location === 'string') location = eventLd.location;
      else if (eventLd.location.name) location = eventLd.location.name;
      else if (eventLd.location.address) {
        location = typeof eventLd.location.address === 'string' ? eventLd.location.address : eventLd.location.address.streetAddress;
      }
    }
  }

  // Check Next.js __NEXT_DATA__
  if (nextData?.props?.pageProps) {
    const pageProps = nextData.props.pageProps;
    const evt = pageProps.event || pageProps.party || pageProps.pageData || {};

    if (evt.title || evt.name) title = evt.title || evt.name;
    if (evt.description) description = evt.description;
    if (evt.startDate || evt.startDateTime) eventDate = evt.startDate || evt.startDateTime;
    if (evt.endDate || evt.endDateTime) eventEndDate = evt.endDate || evt.endDateTime;
    if (evt.locationName || evt.location) location = evt.locationName || evt.location;
    if (evt.hostName || evt.host?.name) author = evt.hostName || evt.host?.name;
    if (evt.coverPhotoUrl || evt.coverPhoto) avatarUrl = evt.coverPhotoUrl || evt.coverPhoto;
    if (typeof evt.rsvpCount === 'number') rsvpCount = evt.rsvpCount;
    else if (Array.isArray(evt.rsvps)) rsvpCount = evt.rsvps.length;
    else if (Array.isArray(evt.guests)) rsvpCount = evt.guests.length;

    // Check for links within event description or host social links
    if (Array.isArray(evt.links)) {
      for (const l of evt.links) {
        if (!l?.url) continue;
        items.push({
          title: l.title || l.url,
          url: l.url,
          itemType: 'LINK',
          platform: inferItemPlatform(l.url),
        });
      }
    }
  }

  // Fallback to DOM elements
  if (!title) {
    title = $('h1').first().text().trim() || 'Partiful Event';
  }
  if (!author) {
    const hostEl = $('[data-testid*="host"], [class*="host"], [class*="Host"]').first().text().trim();
    if (hostEl) author = hostEl;
  }
  if (author) {
    author = author.replace(/^Hosted\s+by\s*([A-Z]{2})?\s*/i, '').trim();
  }

  // Add the primary event itself as the main item in items
  items.unshift({
    title: title || 'Partiful Event',
    url: normalizedUrl,
    itemType: 'EVENT',
    platform: 'PARTIFUL',
    description,
    imageUrl: avatarUrl,
    eventDate,
    eventEndDate,
    location,
    hostName: author,
    rsvpCount,
    isPinned: true,
    metadata: {
      isPrimaryEvent: true,
      hasJsonLd: !!eventLd,
    },
  });

  // Extract any external links found in event page (e.g. venmo, playlist, address map, socials)
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    if (href.startsWith('#') || href.startsWith('javascript:') || href.includes('partiful.com/legal')) return;

    try {
      const fullUrl = new URL(href, normalizedUrl).toString();
      if (!fullUrl.includes('partiful.com') || fullUrl.includes('/e/')) {
        const linkPlat = inferItemPlatform(fullUrl);
        const linkText = $(el).text().trim() || fullUrl;
        if (items.some((i) => i.url === fullUrl)) return;

        items.push({
          title: linkText,
          url: fullUrl,
          itemType: linkPlat === 'PARTIFUL' ? 'EVENT' : ['TWITTER', 'INSTAGRAM', 'SPOTIFY', 'DISCORD'].includes(linkPlat) ? 'SOCIAL' : 'LINK',
          platform: linkPlat,
        });
      }
    } catch {}
  });

  return {
    url: normalizedUrl,
    platform: 'PARTIFUL',
    method,
    durationMs,
    title: title || 'Partiful Event',
    description,
    author,
    avatarUrl,
    rawPayload: nextData ? JSON.stringify(nextData) : eventLd ? JSON.stringify(eventLd) : null,
    items,
  };
}

// -------------------------------------------------------------
// Social Profile Parser
// -------------------------------------------------------------
function parseSocial(params: {
  normalizedUrl: string;
  subPlatform: string;
  $: cheerio.CheerioAPI;
  nextData: any;
  jsonLdList: any[];
  ogTitle: string | null;
  ogDesc: string | null;
  ogImage: string | null;
  authorMeta: string | null;
  durationMs: number;
  method: 'CHEERIO_NEXT_DATA' | 'CHEERIO_STATIC';
}): ScrapeResult {
  const { normalizedUrl, subPlatform, $, nextData, jsonLdList, ogTitle, ogDesc, ogImage, authorMeta, durationMs, method } = params;
  const items: ParsedItem[] = [];

  let title = ogTitle;
  let description = ogDesc;
  let author = authorMeta;
  let avatarUrl = ogImage;

  // JSON-LD Profile/Person
  const personLd = jsonLdList.find((item) => item['@type'] === 'Person' || item['@type'] === 'ProfilePage');
  if (personLd) {
    if (personLd.name) author = personLd.name;
    if (personLd.description) description = personLd.description;
    if (personLd.image) avatarUrl = typeof personLd.image === 'string' ? personLd.image : personLd.image?.url;
    if (Array.isArray(personLd.sameAs)) {
      for (const sameUrl of personLd.sameAs) {
        items.push({
          title: `${inferItemPlatform(sameUrl)} profile`,
          url: sameUrl,
          itemType: 'SOCIAL',
          platform: inferItemPlatform(sameUrl),
        });
      }
    }
  }

  // GitHub specific fast cheerio parsing
  if (subPlatform === 'GITHUB') {
    const vcardName = $('.vcard-fullname').text().trim();
    const vcardUser = $('.vcard-username').text().trim();
    const vcardBio = $('.user-profile-bio').text().trim();
    const vcardAvatar = $('img.avatar-user').attr('src');
    if (vcardName) title = `${vcardName} (${vcardUser})`;
    if (vcardUser) author = vcardUser;
    if (vcardBio) description = vcardBio;
    if (vcardAvatar) avatarUrl = vcardAvatar;

    // Website link in GitHub bio
    $('li[data-test-selector="profile-website-url"] a, .vcard-details a[rel="nofollow me"]').each((_, el) => {
      const href = $(el).attr('href');
      if (href) {
        items.push({
          title: $(el).text().trim() || href,
          url: href,
          itemType: 'LINK',
          platform: inferItemPlatform(href),
          isPinned: true,
        });
      }
    });

    // Pinned repositories / projects
    $('.pinned-item-list-item').each((_, el) => {
      const repoLink = $(el).find('a[data-hydro-click]').first() || $(el).find('a').first();
      const href = repoLink.attr('href');
      const repoTitle = $(el).find('.repo').text().trim() || $(el).find('span.text-bold').text().trim();
      const repoDesc = $(el).find('.pinned-item-desc').text().trim();
      if (href) {
        const fullUrl = new URL(href, 'https://github.com').toString();
        items.push({
          title: repoTitle || fullUrl,
          url: fullUrl,
          itemType: 'LINK',
          platform: 'GITHUB',
          description: repoDesc || null,
          isPinned: true,
        });
      }
    });
  }

  // Add the social profile itself as an extracted profile item
  items.unshift({
    title: title || `${subPlatform} Profile`,
    url: normalizedUrl,
    itemType: 'SOCIAL',
    platform: subPlatform,
    description,
    imageUrl: avatarUrl,
    hostName: author,
    isPinned: true,
  });

  return {
    url: normalizedUrl,
    platform: 'SOCIAL',
    method,
    durationMs,
    title: title || `${subPlatform} Profile`,
    description,
    author: author || title,
    avatarUrl,
    rawPayload: nextData ? JSON.stringify(nextData) : jsonLdList.length > 0 ? JSON.stringify(jsonLdList) : null,
    items,
  };
}

// -------------------------------------------------------------
// Generic Parser
// -------------------------------------------------------------
function parseGeneric(params: {
  normalizedUrl: string;
  $: cheerio.CheerioAPI;
  nextData: any;
  jsonLdList: any[];
  ogTitle: string | null;
  ogDesc: string | null;
  ogImage: string | null;
  authorMeta: string | null;
  durationMs: number;
  method: 'CHEERIO_NEXT_DATA' | 'CHEERIO_STATIC';
}): ScrapeResult {
  const { normalizedUrl, $, nextData, jsonLdList, ogTitle, ogDesc, ogImage, authorMeta, durationMs, method } = params;
  const items: ParsedItem[] = [];

  const title = ogTitle || $('title').text().trim() || 'Aggregated Page';
  const description = ogDesc || $('meta[name="description"]').attr('content') || null;
  const author = authorMeta || null;
  const avatarUrl = ogImage || $('link[rel="icon"]').attr('href') || null;

  // Collect links on the page
  const seenUrls = new Set<string>();
  seenUrls.add(normalizedUrl);

  $('a[href]').each((_, el) => {
    const rawHref = $(el).attr('href');
    if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('javascript:') || rawHref.startsWith('mailto:')) {
      return;
    }

    try {
      const fullUrl = new URL(rawHref, normalizedUrl).toString();
      if (seenUrls.has(fullUrl)) return;
      seenUrls.add(fullUrl);

      const linkText = $(el).text().trim() || $(el).attr('title') || fullUrl;
      const subPlat = inferItemPlatform(fullUrl);
      const isSocial = ['TWITTER', 'INSTAGRAM', 'GITHUB', 'LINKEDIN', 'TIKTOK', 'YOUTUBE', 'BLUESKY'].includes(subPlat);
      const isEvent = subPlat === 'PARTIFUL' || fullUrl.includes('/event') || fullUrl.includes('/events');

      items.push({
        title: linkText.length > 120 ? linkText.substring(0, 117) + '...' : linkText,
        url: fullUrl,
        itemType: isEvent ? 'EVENT' : isSocial ? 'SOCIAL' : 'LINK',
        platform: subPlat,
      });
    } catch {}
  });

  return {
    url: normalizedUrl,
    platform: 'GENERIC',
    method,
    durationMs,
    title,
    description,
    author,
    avatarUrl,
    rawPayload: nextData ? JSON.stringify(nextData) : jsonLdList.length > 0 ? JSON.stringify(jsonLdList) : null,
    items: items.slice(0, 50), // Cap generic to top 50 items to keep feed snappy
  };
}
