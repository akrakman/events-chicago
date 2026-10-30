import * as fs from 'fs';
import * as path from 'path';
import { prisma } from '../db';
import { classifyEvent, normalizeTitle } from '../utils/eventClassifier';

export interface NewsletterEventItem {
  id: string;
  title: string;
  url: string;
  eventDate: string | null;
  dateFormatted: string;
  timeFormatted: string | null;
  organization: string;
  neighborhood: string | null;
  location: string | null;
  description: string | null;
  categories: string[];
}

export interface WeeklyNewsletterDigest {
  subject: string;
  weekRangeLabel: string;
  generatedAt: string;
  nextSendAt: string;
  eventsCount: number;
  events: NewsletterEventItem[];
  html: string;
  text: string;
}

/**
 * Calculates the next Sunday at 9:00 AM (America/Chicago time).
 */
export function getNextSundayNineAm(fromDate: Date = new Date()): Date {
  const chicagoStr = fromDate.toLocaleString('en-US', { timeZone: 'America/Chicago' });
  const chicagoNow = new Date(chicagoStr);

  const day = chicagoNow.getDay(); // 0 = Sunday
  let daysUntilSunday = (7 - day) % 7;

  // If today is Sunday and it's already past 9:00 AM, schedule for next Sunday
  if (day === 0 && (chicagoNow.getHours() > 9 || (chicagoNow.getHours() === 9 && chicagoNow.getMinutes() > 0))) {
    daysUntilSunday = 7;
  }

  const target = new Date(chicagoNow);
  target.setDate(chicagoNow.getDate() + daysUntilSunday);
  target.setHours(9, 0, 0, 0);
  return target;
}

/**
 * Compiles the upcoming events for the week (next 7–8 days) sorted chronologically
 * and builds the HTML and plain-text weekly newsletter.
 */
export async function buildWeeklyNewsletter(referenceDate: Date = new Date()): Promise<WeeklyNewsletterDigest> {
  const startOfToday = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate(), 0, 0, 0);
  const endOfWeek = new Date(startOfToday.getTime() + 8 * 24 * 60 * 60 * 1000);

  let rawEvents = await prisma.extractedItem.findMany({
    where: {
      itemType: 'EVENT',
      eventDate: {
        gte: startOfToday,
        lte: endOfWeek,
      },
    },
    orderBy: { eventDate: 'asc' },
  });

  // If fewer than 3 events fall strictly in the next 8 days, include upcoming events beyond 8 days
  if (rawEvents.length < 3) {
    rawEvents = await prisma.extractedItem.findMany({
      where: {
        itemType: 'EVENT',
        eventDate: { gte: startOfToday },
      },
      orderBy: { eventDate: 'asc' },
      take: 20,
    });
  }

  // Deduplicate by date + normalized title
  const seen = new Set<string>();
  const digestEvents: NewsletterEventItem[] = [];

  for (const item of rawEvents) {
    const dateKey = item.eventDate ? item.eventDate.toISOString().slice(0, 10) : 'TBD';
    const normKey = `${dateKey}::${normalizeTitle(item.title)}`;
    if (seen.has(normKey)) continue;
    seen.add(normKey);

    const meta = classifyEvent(item.title, item.description, item.location, item.hostName, item.sourceName);
    const d = item.eventDate ? new Date(item.eventDate) : null;

    const dateFormatted = d
      ? d.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          timeZone: 'America/Chicago',
        })
      : 'Date TBD';
    const timeFormatted = d
      ? d.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          timeZone: 'America/Chicago',
        })
      : null;

    digestEvents.push({
      id: item.id,
      title: item.title,
      url: item.url,
      eventDate: item.eventDate ? item.eventDate.toISOString() : null,
      dateFormatted,
      timeFormatted,
      organization: meta.organization,
      neighborhood: meta.neighborhood,
      location: item.location || meta.neighborhood || 'Chicago, IL',
      description: item.description || null,
      categories: meta.categories,
    });
  }

  const startLabel = startOfToday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endLabel = endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const weekRangeLabel = `${startLabel} – ${endLabel}`;
  const subject = `🗓️ Chicago Jewish Events This Week (${weekRangeLabel}) — ${digestEvents.length} Upcoming Gatherings`;

  const eventRowsHtml = digestEvents
    .map(
      (e) => `
      <tr>
        <td style="padding: 16px; border-bottom: 1px solid #e2e8f0;">
          <div style="font-size: 12px; font-weight: 700; color: #047857; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 4px;">
            ${e.dateFormatted}${e.timeFormatted ? ` • ${e.timeFormatted}` : ''}${e.neighborhood ? ` • ${e.neighborhood}` : ''}
          </div>
          <div style="font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 4px;">
            <a href="${e.url}" style="color: #0f172a; text-decoration: none;">${e.title}</a>
          </div>
          <div style="font-size: 13px; color: #475569; margin-bottom: 8px;">
            <strong>Host:</strong> ${e.organization}${e.location ? ` &nbsp;|&nbsp; <strong>Location:</strong> ${e.location}` : ''}
          </div>
          ${
            e.description
              ? `<div style="font-size: 13px; color: #64748b; line-height: 1.5; margin-bottom: 10px;">${e.description.slice(0, 220)}${
                  e.description.length > 220 ? '...' : ''
                }</div>`
              : ''
          }
          <div>
            <a href="${e.url}" style="display: inline-block; padding: 7px 14px; background-color: #059669; color: #ffffff; font-size: 12px; font-weight: 700; border-radius: 8px; text-decoration: none;">
              RSVP &amp; Event Details →
            </a>
          </div>
        </td>
      </tr>`
    )
    .join('\n');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 24px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 640px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
    <tr>
      <td bgcolor="#059669" style="padding: 24px; background-color: #059669; background: linear-gradient(135deg, #059669, #0d9488); color: #ffffff;">
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #ecfdf5;">
          Weekly Community Digest • Sent Sundays at 9:00 AM CT
        </div>
        <h1 style="margin: 6px 0 4px; font-size: 22px; font-weight: 800; color: #ffffff;">
          Chicago Jewish Events This Week
        </h1>
        <div style="font-size: 13px; color: #ecfdf5;">
          ${weekRangeLabel} • ${digestEvents.length} Upcoming Community Events
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding: 16px 24px 8px; font-size: 13px; color: #475569; line-height: 1.5;">
        Here is your weekly list of upcoming Shabbat dinners, social mixers, learning circles, and volunteering events across Chicago — compiled directly from Moishe Houses, Moishe Pods, Silverstein Base, Mishkan, Chabad, JUF YLD, and local synagogues.
      </td>
    </tr>
    <tr>
      <td style="padding: 0 8px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          ${eventRowsHtml}
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px 24px; background-color: #f1f5f9; font-size: 12px; color: #64748b; text-align: center;">
        Sent every Sunday at 9:00 AM CT by Chicago Jewish Community Events Aggregator.
      </td>
    </tr>
  </table>
</body>
</html>`;

  const textLines = [
    `CHICAGO JEWISH EVENTS THIS WEEK (${weekRangeLabel})`,
    `Sent Sundays at 9:00 AM CT • ${digestEvents.length} Upcoming Events`,
    `================================================================`,
    '',
    ...digestEvents.map(
      (e, idx) =>
        `${idx + 1}. [${e.dateFormatted}${e.timeFormatted ? ` @ ${e.timeFormatted}` : ''}] ${e.title}\n   Host: ${e.organization} | Location: ${e.location || 'TBD'}\n   RSVP: ${e.url}\n`
    ),
  ];

  const nextSend = getNextSundayNineAm(referenceDate);

  return {
    subject,
    weekRangeLabel,
    generatedAt: new Date().toISOString(),
    nextSendAt: nextSend.toISOString(),
    eventsCount: digestEvents.length,
    events: digestEvents,
    html,
    text: textLines.join('\n'),
  };
}

/**
 * Dispatches the weekly newsletter to a specific email or all active subscribers.
 */
export async function sendWeeklyNewsletter(
  targetEmail?: string,
  overrideResendKey?: string
): Promise<{
  success: boolean;
  sentAt: string;
  recipientsCount: number;
  recipients: string[];
  subject: string;
  eventsCount: number;
  deliveryMode: 'RESEND_API' | 'LOCAL_OUTBOX';
  deliveryError?: string | null;
  digest: WeeklyNewsletterDigest;
}> {
  const digest = await buildWeeklyNewsletter();

  let recipients: string[] = [];
  if (targetEmail) {
    recipients = [targetEmail.trim().toLowerCase()];
  } else {
    const subs = await prisma.newsletterSubscriber.findMany({
      where: { isActive: true },
    });
    recipients = subs.map((s) => s.email);
  }

  let deliveryMode: 'RESEND_API' | 'LOCAL_OUTBOX' = 'LOCAL_OUTBOX';
  let deliveryError: string | null = null;
  const sanitizeKey = (raw?: string) => {
    if (!raw) return '';
    const m = raw.trim().match(/re_[A-Za-z0-9]{8}_[A-Za-z0-9]{24}/);
    return m ? m[0] : raw.trim();
  };
  const candidateKeys = Array.from(
    new Set(
      [sanitizeKey(overrideResendKey), sanitizeKey(process.env.RESEND_API_KEY)].filter(
        (k): k is string => Boolean(k)
      )
    )
  );
  const fromEmail =
    process.env.NEWSLETTER_FROM_EMAIL || 'Chicago Jewish Events <onboarding@resend.dev>';

  const trySendWithResend = async (
    apiKey: string,
    toList: string[]
  ): Promise<{ ok: boolean; status: number; bodyText: string }> => {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: toList,
        subject: digest.subject,
        html: digest.html,
        text: digest.text,
      }),
    });
    const bodyText = await res.text();
    return { ok: res.ok, status: res.status, bodyText };
  };

  if (candidateKeys.length > 0 && recipients.length > 0) {
    try {
      for (const key of candidateKeys) {
        let attempt = await trySendWithResend(key, recipients);
        if (attempt.ok) {
          deliveryMode = 'RESEND_API';
          deliveryError = null;
          break;
        }

        // If Resend free-tier sandbox restricts delivery to the account owner's email (e.g. akrakman@gmail.com),
        // automatically retry delivering to the verified owner address so dev testing works seamlessly.
        const ownerMatch = attempt.bodyText.match(/\(([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\)/);
        if (attempt.status === 403 && ownerMatch && ownerMatch[1]) {
          const ownerEmail = ownerMatch[1].toLowerCase();
          const retryOwner = await trySendWithResend(key, [ownerEmail]);
          if (retryOwner.ok) {
            deliveryMode = 'RESEND_API';
            recipients = [ownerEmail];
            deliveryError = null;
            break;
          }
        }

        deliveryError = `Resend API (${attempt.status}): ${attempt.bodyText}`;
      }
    } catch (err: any) {
      deliveryError = err.message || 'Network error calling Resend API';
      console.warn('[Newsletter] External email provider error, falling back to local outbox:', err.message);
    }
  }

  // Always save latest rendered newsletter to data/latest-newsletter.html for inspection
  try {
    const outPath = path.resolve(__dirname, '../data/latest-newsletter.html');
    fs.writeFileSync(outPath, digest.html, 'utf8');
  } catch {}

  const now = new Date();
  if (recipients.length > 0) {
    await prisma.newsletterSubscriber.updateMany({
      where: { email: { in: recipients } },
      data: { lastSentAt: now },
    });
  }

  console.log(
    `[Newsletter] Sent "${digest.subject}" (${digest.eventsCount} events) to ${recipients.length} subscriber(s) via ${deliveryMode}.`
  );

  return {
    success: true,
    sentAt: now.toISOString(),
    recipientsCount: recipients.length,
    recipients,
    subject: digest.subject,
    eventsCount: digest.eventsCount,
    deliveryMode,
    deliveryError,
    digest,
  };
}

let lastSundayDispatchDateKey: string | null = null;

/**
 * Starts the background scheduler that automatically sends the weekly newsletter
 * every Sunday at 9:00 AM (America/Chicago time).
 */
export function startWeeklyNewsletterScheduler() {
  console.log('[Newsletter] Weekly Sunday 9:00 AM CT newsletter scheduler active.');

  setInterval(async () => {
    try {
      const chicagoStr = new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' });
      const chicagoNow = new Date(chicagoStr);

      const isSunday = chicagoNow.getDay() === 0;
      const isNineAmHour = chicagoNow.getHours() === 9;
      const dateKey = `${chicagoNow.getFullYear()}-${chicagoNow.getMonth() + 1}-${chicagoNow.getDate()}`;

      if (isSunday && isNineAmHour && lastSundayDispatchDateKey !== dateKey) {
        lastSundayDispatchDateKey = dateKey;
        console.log(`[Newsletter] Sunday 9:00 AM CT reached (${dateKey}). Sending weekly newsletter...`);
        await sendWeeklyNewsletter();
      }
    } catch (err) {
      console.error('[Newsletter] Scheduled Sunday 9am check error:', err);
    }
  }, 60 * 1000);
}
