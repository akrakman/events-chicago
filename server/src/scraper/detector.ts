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

  // ChiTribe
  if (hostname.includes('chitribe.org')) {
    return {
      platform: 'CHITRIBE',
      subPlatform: 'CHITRIBE',
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
    if (host.includes('chitribe.org')) return 'CHITRIBE';
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
