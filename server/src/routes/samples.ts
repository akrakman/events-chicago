import { FastifyPluginAsync } from 'fastify';

export const sampleRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/api/samples', async (_request, reply) => {
    return reply.send({
      samples: [
        {
          label: 'Linktree (Creator / DJ)',
          url: 'https://linktr.ee/billieeilish',
          platform: 'LINKTREE',
          description: 'Artist Linktree with multiple dynamic music links, store links, and socials',
        },
        {
          label: 'Linktree (Tech Community)',
          url: 'https://linktr.ee/github',
          platform: 'LINKTREE',
          description: 'Official GitHub community Linktree profile with social links',
        },
        {
          label: 'GitHub Profile (Developer)',
          url: 'https://github.com/torvalds',
          platform: 'SOCIAL',
          description: 'GitHub profile with pinned projects, repositories, and socials',
        },
        {
          label: 'Partiful Event',
          url: 'https://partiful.com/e/example-event',
          platform: 'PARTIFUL',
          description: 'Public Partiful event page with RSVP count, date/time, and host details',
        },
        {
          label: 'Hacker News / Tech Site',
          url: 'https://news.ycombinator.com',
          platform: 'GENERIC',
          description: 'Generic aggregator page extracting links and metadata',
        },
      ],
    });
  });
};
