import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../db';
import { getPollingState, pollAllSources, pollSource } from '../services/eventPoller';
import { z } from 'zod';
import { detectPlatform } from '../scraper/detector';
import { classifyEvent, normalizeTitle } from '../utils/eventClassifier';

export const eventRoutes: FastifyPluginAsync = async (fastify) => {
  // 1. Get upcoming events sorted by date ascending with smart filters and de-duplication
  fastify.get('/api/events/upcoming', async (request, reply) => {
    const {
      filter = 'upcoming',
      search,
      platform,
      organization,
      neighborhood,
      category,
    } = request.query as {
      filter?: 'upcoming' | 'past' | 'all' | 'weekend' | 'week' | 'month';
      search?: string;
      platform?: string;
      organization?: string;
      neighborhood?: string;
      category?: string;
    };

    try {
      const now = new Date();
      // Allow events from the current day (start of today)
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const whereClause: any = {
        itemType: 'EVENT',
      };

      if (filter === 'upcoming') {
        whereClause.OR = [
          { eventDate: { gte: startOfToday } },
          { eventDate: null },
        ];
      } else if (filter === 'weekend') {
        // Calculate upcoming weekend (Friday through Sunday)
        const dayOfWeek = now.getDay();
        const diffToFriday = dayOfWeek === 0 ? -2 : dayOfWeek === 6 ? -1 : 5 - dayOfWeek;
        const fridayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToFriday, 0, 0, 0);
        const sundayEnd = new Date(fridayStart.getFullYear(), fridayStart.getMonth(), fridayStart.getDate() + 2, 23, 59, 59);

        whereClause.eventDate = {
          gte: fridayStart,
          lte: sundayEnd,
        };
      } else if (filter === 'week') {
        const next7Days = new Date(startOfToday.getTime() + 7 * 24 * 60 * 60 * 1000);
        whereClause.eventDate = {
          gte: startOfToday,
          lte: next7Days,
        };
      } else if (filter === 'month') {
        const next30Days = new Date(startOfToday.getTime() + 30 * 24 * 60 * 60 * 1000);
        whereClause.eventDate = {
          gte: startOfToday,
          lte: next30Days,
        };
      } else if (filter === 'past') {
        whereClause.eventDate = { lt: startOfToday };
      }

      if (platform && platform !== 'ALL') {
        whereClause.platform = platform.toUpperCase();
      }

      if (search && search.trim() !== '') {
        const query = search.trim();
        whereClause.AND = [
          {
            OR: [
              { title: { contains: query } },
              { hostName: { contains: query } },
              { location: { contains: query } },
              { description: { contains: query } },
              { sourceName: { contains: query } },
            ],
          },
        ];
      }

      const rawEvents = await prisma.extractedItem.findMany({
        where: whereClause,
        orderBy: [
          { isPinned: 'desc' },
          { createdAt: 'desc' },
        ],
      });

      // Sort chronologically ascending, putting confirmed dates first and TBD/null dates at the end
      const sortedEvents = rawEvents.sort((a, b) => {
        if (a.eventDate && b.eventDate) {
          return new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime();
        }
        if (a.eventDate && !b.eventDate) return -1;
        if (!a.eventDate && b.eventDate) return 1;
        return 0;
      });

      // De-duplicate cross-posted events that share the same date (YYYY-MM-DD) and normalized title
      const eventMap = new Map<string, any>();
      const dedupedEvents: any[] = [];

      for (const item of sortedEvents) {
        const meta = classifyEvent(
          item.title,
          item.description,
          item.location,
          item.hostName,
          item.sourceName
        );

        const enriched = {
          ...item,
          organization: meta.organization,
          orgGroup: meta.orgGroup,
          neighborhood: meta.neighborhood,
          categories: meta.categories,
          secondaryUrls: [] as Array<{ platform: string; url: string; sourceName: string }>,
        };

        const dateKey = item.eventDate ? new Date(item.eventDate).toISOString().slice(0, 10) : 'NO_DATE';
        const titleKey = normalizeTitle(item.title);
        const dedupKey = `${dateKey}::${titleKey}`;

        if (eventMap.has(dedupKey)) {
          const existing = eventMap.get(dedupKey);
          // Add secondary link if it's from a different platform or URL
          if (item.url !== existing.url && !existing.secondaryUrls.some((s: any) => s.url === item.url)) {
            existing.secondaryUrls.push({
              platform: item.platform,
              url: item.url,
              sourceName: item.sourceName || item.platform,
            });
          }
          // Preserve richest description and images
          if ((!existing.description || existing.description.length < 30) && item.description && item.description.length > 30) {
            existing.description = item.description;
          }
          if (!existing.imageUrl && item.imageUrl) {
            existing.imageUrl = item.imageUrl;
          }
        } else {
          eventMap.set(dedupKey, enriched);
          dedupedEvents.push(enriched);
        }
      }

      // Filter by Organization
      let filteredEvents = dedupedEvents;
      if (organization && organization !== 'ALL') {
        const orgQuery = organization.toLowerCase();
        filteredEvents = filteredEvents.filter(
          (e) =>
            e.organization.toLowerCase() === orgQuery ||
            e.orgGroup.toLowerCase() === orgQuery ||
            e.organization.toLowerCase().includes(orgQuery) ||
            e.hostName?.toLowerCase().includes(orgQuery)
        );
      }

      // Filter by Neighborhood
      if (neighborhood && neighborhood !== 'ALL') {
        filteredEvents = filteredEvents.filter((e) => e.neighborhood === neighborhood);
      }

      // Filter by Category
      if (category && category !== 'ALL') {
        filteredEvents = filteredEvents.filter((e) => e.categories?.includes(category));
      }

      // Extract all distinct filter facets for UI dropdowns
      const orgSet = new Set<string>();
      const groupSet = new Set<string>();
      const hoodSet = new Set<string>();
      const catSet = new Set<string>();

      for (const e of dedupedEvents) {
        if (e.organization) orgSet.add(e.organization);
        if (e.orgGroup) groupSet.add(e.orgGroup);
        if (e.neighborhood) hoodSet.add(e.neighborhood);
        if (e.categories) e.categories.forEach((c: string) => catSet.add(c));
      }

      return reply.send({
        events: filteredEvents,
        total: filteredEvents.length,
        filter,
        availableFilters: {
          organizations: Array.from(orgSet).sort(),
          orgGroups: Array.from(groupSet).sort(),
          neighborhoods: Array.from(hoodSet).sort(),
          categories: Array.from(catSet).sort(),
        },
      });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // 1B. Live iCal / Webcal Subscription Feed for Apple / Google Calendar
  fastify.get('/api/calendar.ics', async (_request, reply) => {
    try {
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const rawEvents = await prisma.extractedItem.findMany({
        where: {
          itemType: 'EVENT',
          eventDate: { gte: startOfToday },
        },
        orderBy: { eventDate: 'asc' },
      });

      const fmt = (d: Date) => d.toISOString().replace(/-|:|\.\d\d\d/g, '');

      const lines: string[] = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Jewish Events Chicago//NONSGML v1.0//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'X-WR-CALNAME:Jewish Events Chicago',
        'X-WR-TIMEZONE:America/Chicago',
        'X-WR-CALDESC:Chicago Jewish Community Events & Gatherings',
      ];

      for (const evt of rawEvents) {
        if (!evt.eventDate) continue;
        const start = new Date(evt.eventDate);
        const end = evt.eventEndDate ? new Date(evt.eventEndDate) : new Date(start.getTime() + 2 * 60 * 60 * 1000);
        const meta = classifyEvent(evt.title, evt.description, evt.location, evt.hostName, evt.sourceName);

        lines.push(
          'BEGIN:VEVENT',
          `UID:${evt.id}@jewishevents.chi`,
          `DTSTAMP:${fmt(new Date())}`,
          `DTSTART:${fmt(start)}`,
          `DTEND:${fmt(end)}`,
          `SUMMARY:${evt.title.replace(/\n/g, ' ')}`,
          `DESCRIPTION:${(evt.description || '').replace(/\n/g, '\\n')}\\n\\nOrganizer: ${meta.organization}\\nRSVP Link: ${evt.url}`,
          `LOCATION:${(evt.location || meta.neighborhood || meta.organization || '').replace(/\n/g, ' ')}`,
          `URL:${evt.url}`,
          'STATUS:CONFIRMED',
          'END:VEVENT'
        );
      }

      lines.push('END:VCALENDAR');

      return reply
        .header('Content-Type', 'text/calendar; charset=utf-8')
        .header('Content-Disposition', 'inline; filename="jewish-events-chicago.ics"')
        .header('Cache-Control', 'public, max-age=1800')
        .send(lines.join('\r\n'));
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // 2. Get list of monitored sources
  fastify.get('/api/sources', async (_request, reply) => {
    try {
      const sources = await prisma.monitoredSource.findMany({
        orderBy: { createdAt: 'asc' },
        include: {
          _count: {
            select: { jobs: true },
          },
        },
      });

      return reply.send({ sources });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // 3. Add a new monitored source URL
  const AddSourceSchema = z.object({
    url: z.string().min(1, 'Source URL is required'),
    name: z.string().optional(),
  });

  fastify.post('/api/sources', async (request, reply) => {
    const parse = AddSourceSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: 'Invalid URL provided' });
    }

    const { url, name } = parse.data;
    const { platform, normalizedUrl } = detectPlatform(url);

    try {
      const existing = await prisma.monitoredSource.findUnique({
        where: { url: normalizedUrl },
      });

      if (existing) {
        return reply.status(409).send({ error: 'Source already exists' });
      }

      const source = await prisma.monitoredSource.create({
        data: {
          url: normalizedUrl,
          name: name || null,
          platform,
          isActive: true,
        },
      });

      // Poll newly added source immediately in background
      pollSource(source.id).catch((err) =>
        fastify.log.error(`Failed to poll new source ${source.id}:`, err)
      );

      return reply.status(201).send({ source });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // 4. Delete a monitored source
  fastify.delete('/api/sources/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const source = await prisma.monitoredSource.findUnique({ where: { id } });
      if (!source) return reply.status(404).send({ error: 'Source not found' });

      // Delete associated events
      await prisma.extractedItem.deleteMany({
        where: { sourceUrl: source.url },
      });

      await prisma.monitoredSource.delete({ where: { id } });
      return reply.send({ success: true, message: 'Source deleted' });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // 5. Trigger immediate manual sync of all sources (non-blocking)
  fastify.post('/api/sources/sync', async (_request, reply) => {
    try {
      // Fire polling in background
      pollAllSources().catch((err) => {
        fastify.log.error('Background sync failed:', err);
      });

      return reply.send({
        success: true,
        message: 'Sync started in background',
        isSyncing: true,
      });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // 6. Get sync status & timing
  fastify.get('/api/sync/status', async (_request, reply) => {
    try {
      const { isPollingInProgress } = getPollingState();
      const latestSource = await prisma.monitoredSource.findFirst({
        where: { lastPolledAt: { not: null } },
        orderBy: { lastPolledAt: 'desc' },
      });
      const totalEvents = await prisma.extractedItem.count({ where: { itemType: 'EVENT' } });

      return reply.send({
        isSyncing: isPollingInProgress,
        lastPolledAt: latestSource?.lastPolledAt || null,
        totalEvents,
      });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });
};
