import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { scrapeRoutes } from './routes/scrape';
import { jobRoutes } from './routes/jobs';
import { itemRoutes } from './routes/items';
import { sampleRoutes } from './routes/samples';
import { eventRoutes } from './routes/events';
import { startDailyPollingScheduler } from './services/eventPoller';

const fastify = Fastify({
  logger: true,
});

async function main() {
  await fastify.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // Health check
  fastify.get('/api/health', async () => {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  });

  // Register domain routes
  await fastify.register(eventRoutes);
  await fastify.register(scrapeRoutes);
  await fastify.register(jobRoutes);
  await fastify.register(itemRoutes);
  await fastify.register(sampleRoutes);

  // Initialize automated daily polling background scheduler
  await startDailyPollingScheduler();

  const port = parseInt(process.env.PORT || '3001', 10);
  const host = process.env.HOST || '0.0.0.0';

  try {
    const address = await fastify.listen({ port, host });
    fastify.log.info(`🚀 Link Aggregator Server running at ${address}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

main();
