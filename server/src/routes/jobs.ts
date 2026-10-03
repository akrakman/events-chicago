import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../db';
import { orchestrateScrape } from '../scraper';

export const jobRoutes: FastifyPluginAsync = async (fastify) => {
  // List jobs
  fastify.get('/api/jobs', async (request, reply) => {
    try {
      const jobs = await prisma.scrapeJob.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { items: true },
          },
        },
        take: 100,
      });

      return reply.send({
        jobs: jobs.map((j) => ({
          ...j,
          itemCount: j._count.items,
        })),
      });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // Get single job with items
  fastify.get('/api/jobs/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const job = await prisma.scrapeJob.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!job) {
        return reply.status(404).send({ error: 'Job not found' });
      }

      return reply.send({ job });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // Delete job
  fastify.delete('/api/jobs/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      await prisma.scrapeJob.delete({
        where: { id },
      });
      return reply.send({ success: true, message: 'Job deleted' });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // Rescrape job
  fastify.post('/api/jobs/:id/rescrape', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const existing = await prisma.scrapeJob.findUnique({ where: { id } });
      if (!existing) {
        return reply.status(404).send({ error: 'Job not found' });
      }

      const result = await orchestrateScrape(existing.url, 'auto');

      // Delete old items and update job
      await prisma.extractedItem.deleteMany({ where: { jobId: id } });

      const updatedJob = await prisma.scrapeJob.update({
        where: { id },
        data: {
          platform: result.platform,
          method: result.method,
          status: result.errorMessage && result.items.length === 0 ? 'FAILED' : 'COMPLETED',
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
        include: { items: true },
      });

      return reply.send({ success: true, job: updatedJob });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });
};
