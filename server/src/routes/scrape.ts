import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { orchestrateScrape } from '../scraper';
import { prisma } from '../db';
import { ScrapeModePreference } from '../types';

const ScrapeSchema = z.object({
  url: z.string().min(1, 'Target URL is required'),
  mode: z.enum(['auto', 'cheerio', 'playwright']).optional().default('auto'),
});

export const scrapeRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/api/scrape', async (request, reply) => {
    const parseResult = ScrapeSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Invalid request body',
        details: parseResult.error.flatten(),
      });
    }

    const { url, mode } = parseResult.data;

    try {
      const result = await orchestrateScrape(url, mode as ScrapeModePreference);

      const status = result.errorMessage && result.items.length === 0 ? 'FAILED' : 'COMPLETED';

      // Store in SQLite database using Prisma
      const job = await prisma.scrapeJob.create({
        data: {
          url: result.url,
          platform: result.platform,
          method: result.method,
          status,
          durationMs: result.durationMs,
          title: result.title,
          description: result.description,
          author: result.author,
          avatarUrl: result.avatarUrl,
          errorMessage: result.errorMessage,
          rawPayload: result.rawPayload,
          items: {
            create: result.items.map((item) => ({
              title: item.title,
              url: item.url,
              itemType: item.itemType,
              platform: item.platform,
              description: item.description,
              imageUrl: item.imageUrl,
              icon: item.icon,
              eventDate: item.eventDate,
              eventEndDate: item.eventEndDate,
              location: item.location,
              hostName: item.hostName,
              rsvpCount: item.rsvpCount,
              isPinned: !!item.isPinned,
              metadata: item.metadata ? JSON.stringify(item.metadata) : null,
            })),
          },
        },
        include: {
          items: true,
        },
      });

      return reply.status(200).send({
        success: true,
        job,
      });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({
        success: false,
        error: err.message || 'Scraping operation failed',
      });
    }
  });
};
