import type { FastifyPluginAsync } from 'fastify';

/**
 * Stand-in auth routes mirroring what `my add auth` generates.
 * Replace with the generated module in a real project.
 */
export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: { email?: string; password?: string } }>('/login', async (request, reply) => {
    const email = request.body?.email?.trim();
    if (!email || !request.body?.password) {
      return reply.code(400).send({
        error: { code: 'VALIDATION_FAILED', message: 'email and password are required' },
      });
    }

    return {
      accessToken: 'demo-access-token',
      tokenType: 'Bearer',
      user: { id: 'u_demo', email },
    };
  });

  app.get('/me', async () => ({
    id: 'u_demo',
    email: 'shopper@example.com',
  }));
};
