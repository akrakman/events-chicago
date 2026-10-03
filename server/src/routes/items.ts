import { FastifyPluginAsync } from 'fastify';
import { prisma } from '../db';

export const itemRoutes: FastifyPluginAsync = async (fastify) => {
  // Get aggregated items across all jobs with filtering & search
  fastify.get('/api/items', async (request, reply) => {
    const {
      itemType,
      platform,
      search,
      jobId,
      limit = '100',
      offset = '0',
    } = request.query as {
      itemType?: string;
      platform?: string;
      search?: string;
      jobId?: string;
      limit?: string;
      offset?: string;
    };

    try {
      const whereClause: any = {};

      if (itemType && itemType !== 'ALL') {
        whereClause.itemType = itemType.toUpperCase();
      }

      if (platform && platform !== 'ALL') {
        whereClause.platform = { equals: platform };
      }

      if (jobId) {
        whereClause.jobId = jobId;
      }

      if (search && search.trim() !== '') {
        const query = search.trim();
        whereClause.OR = [
          { title: { contains: query } },
          { url: { contains: query } },
          { description: { contains: query } },
          { hostName: { contains: query } },
          { location: { contains: query } },
        ];
      }

      const [items, totalCount] = await Promise.all([
        prisma.extractedItem.findMany({
          where: whereClause,
          orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
          take: Math.min(parseInt(limit, 10) || 100, 200),
          skip: parseInt(offset, 10) || 0,
          include: {
            job: {
              select: {
                id: true,
                url: true,
                title: true,
                platform: true,
                method: true,
                author: true,
                avatarUrl: true,
              },
            },
          },
        }),
        prisma.extractedItem.count({ where: whereClause }),
      ]);

      return reply.send({
        items,
        totalCount,
        limit: parseInt(limit, 10) || 100,
        offset: parseInt(offset, 10) || 0,
      });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // Delete single item
  fastify.delete('/api/items/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      await prisma.extractedItem.delete({
        where: { id },
      });
      return reply.send({ success: true, message: 'Item deleted' });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // Get aggregator statistics
  fastify.get('/api/stats', async (_request, reply) => {
    try {
      const [totalJobs, totalItems, eventCount, linkCount, socialCount, platformStats] = await Promise.all([
        prisma.scrapeJob.count(),
        prisma.extractedItem.count(),
        prisma.extractedItem.count({ where: { itemType: 'EVENT' } }),
        prisma.extractedItem.count({ where: { itemType: 'LINK' } }),
        prisma.extractedItem.count({ where: { itemType: 'SOCIAL' } }),
        prisma.extractedItem.groupBy({
          by: ['platform'],
          _count: {
            id: true,
          },
          orderBy: {
            _count: {
              id: 'desc',
            },
          },
          take: 10,
        }),
      ]);

      return reply.send({
        totalJobs,
        totalItems,
        eventCount,
        linkCount,
        socialCount,
        platformStats: platformStats.map((p) => ({
          platform: p.platform,
          count: p._count.id,
        })),
      });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });
};
