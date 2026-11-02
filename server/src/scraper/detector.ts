import { PlatformType } from '../types';

export function detectPlatform(rawUrl: string): {
  platform: PlatformType;
  subPlatform: string;
  normalizedUrl: string;
} {
  let urlObj: URL;
  let normalizedUrl = rawUrl.trim();
  if (!/^https?:\/\//i.test(normalizedUrl)) {
    normalizedUrl = 'https://' + normalizedUrl;
  }

  try {
    urlObj = new URL(normalizedUrl);
  } catch {
    return {
      platform: 'GENERIC',
      subPlatform: 'GENERIC',
      normalizedUrl,
    };
  }

  const hostname = urlObj.hostname.toLowerCase();

  // Linktree
  if (hostname.includes('linktr.ee') || hostname.includes('linktree.')) {
    return {
      platform: 'LINKTREE',
      subPlatform: 'LINKTREE',
      normalizedUrl: urlObj.toString(),
    };
  }

  // Partiful
  if (hostname.includes('partiful.com')) {
    return {
      platform: 'PARTIFUL',
      subPlatform: 'PARTIFUL',
      normalizedUrl: urlObj.toString(),
    };
  }

  // Heylo
  if (hostname.includes('heylo.com') || hostname.includes('heylo.group')) {
    return {
      platform: 'HEYLO',
      subPlatform: 'HEYLO',
      normalizedUrl: urlObj.toString(),
    };
  }

  // Mishkan
  if (hostname.includes('mishkanchicago.org') || urlObj.pathname.includes('/tribe/events')) {
    return {
      platform: 'MISHKAN',
      subPlatform: 'MISHKAN',
      normalizedUrl: urlObj.toString(),
    };
  }

  // Chabad / Jewish CMS
  if (
    hostname.includes('chabad') ||
    hostname.includes('jewishlakeview') ||
    hostname.includes('jewishbucktown') ||
    hostname.includes('jewishdowntown') ||
    urlObj.pathname.includes('articlecco_cdo') ||
    urlObj.pathname.includes('section_cdo')
  ) {
    return {
      platform: 'CHABAD',
      subPlatform: 'CHABAD',
      normalizedUrl: urlObj.toString(),
    };
  }

  // Synagogues
  if (
    hostname.includes('ansheemet') ||
    hostname.includes('kamii.org') ||
    hostname.includes('irz.org') ||
    hostname.includes('makomshalom') ||
    hostname.includes('nssbethel') ||
    hostname.includes('templebeth-el') ||
    hostname.includes('centralavenuesynagogue') ||
    hostname.includes('chicagoloopsynagogue') ||
    hostname.includes('kolhadash') ||
    hostname.includes('shulcloud')
  ) {
    return {
      platform: 'SYNAGOGUE',
      subPlatform: 'SYNAGOGUE',
      normalizedUrl: urlObj.toString(),
    };
  }

  // JUF / YLD
  if (hostname.includes('juf.org')) {
    return {
      platform: 'JUF',
      subPlatform: 'JUF',
      normalizedUrl: urlObj.toString(),
    };
  }

  // Community Organizations
  if (
    hostname.includes('werepair.org') ||
    hostname.includes('israelifilmchi') ||
    hostname.includes('jcua.org') ||
    hostname.includes('shalvacares') ||
    hostname.includes('ajustharvest') ||
    hostname.includes('jgsi.org')
  ) {
    return {
      platform: 'COMMUNITY',
      subPlatform: 'COMMUNITY',
      normalizedUrl: urlObj.toString(),
    };
  }

  // Socials
  if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
    return { platform: 'SOCIAL', subPlatform: 'TWITTER', normalizedUrl: urlObj.toString() };
  }
  if (hostname.includes('instagram.com')) {
    return { platform: 'SOCIAL', subPlatform: 'INSTAGRAM', normalizedUrl: urlObj.toString() };
  }
  if (hostname.includes('github.com')) {
    return { platform: 'SOCIAL', subPlatform: 'GITHUB', normalizedUrl: urlObj.toString() };
  }
  if (hostname.includes('linkedin.com')) {
    return { platform: 'SOCIAL', subPlatform: 'LINKEDIN', normalizedUrl: urlObj.toString() };
  }
  if (hostname.includes('threads.net')) {
    return { platform: 'SOCIAL', subPlatform: 'THREADS', normalizedUrl: urlObj.toString() };
  }
  if (hostname.includes('tiktok.com')) {
    return { platform: 'SOCIAL', subPlatform: 'TIKTOK', normalizedUrl: urlObj.toString() };
  }
  if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
    return { platform: 'SOCIAL', subPlatform: 'YOUTUBE', normalizedUrl: urlObj.toString() };
  }
  if (hostname.includes('bsky.app') || hostname.includes('bluesky.')) {
    return { platform: 'SOCIAL', subPlatform: 'BLUESKY', normalizedUrl: urlObj.toString() };
  }

  return {
    platform: 'GENERIC',
    subPlatform: hostname.replace(/^www\./, ''),
    normalizedUrl: urlObj.toString(),
  };
}

export function inferItemPlatform(linkUrl: string): string {
  try {
    const host = new URL(linkUrl).hostname.toLowerCase();
    if (host.includes('twitter.com') || host.includes('x.com')) return 'TWITTER';
    if (host.includes('instagram.com')) return 'INSTAGRAM';
    if (host.includes('youtube.com') || host.includes('youtu.be')) return 'YOUTUBE';
    if (host.includes('spotify.com')) return 'SPOTIFY';
    if (host.includes('tiktok.com')) return 'TIKTOK';
    if (host.includes('github.com')) return 'GITHUB';
    if (host.includes('linkedin.com')) return 'LINKEDIN';
    if (host.includes('partiful.com')) return 'PARTIFUL';
    if (host.includes('heylo.com') || host.includes('heylo.group')) return 'HEYLO';
    if (host.includes('onetable.org')) return 'ONETABLE';
    if (host.includes('mishkanchicago.org')) return 'MISHKAN';
    if (host.includes('juf.org')) return 'JUF';
    if (host.includes('discord.gg') || host.includes('discord.com')) return 'DISCORD';
    if (host.includes('patreon.com')) return 'PATREON';
    if (host.includes('substack.com')) return 'SUBSTACK';
    if (host.includes('twitch.tv')) return 'TWITCH';
    if (host.includes('apple.com')) return 'APPLE';
    return host.replace(/^www\./, '');
  } catch {
    return 'GENERIC';
  }
}
