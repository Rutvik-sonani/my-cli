import Fastify from 'fastify';
import { authRoutes } from './modules/auth/routes.js';
import { productRoutes } from './modules/products/routes.js';

const app = Fastify({ logger: true });
const port = Number(process.env.PORT ?? 3000);

app.get('/health', async () => ({
  ok: true,
  service: 'shop',
  features: ['auth', 'products', 'docker'],
}));

await app.register(authRoutes, { prefix: '/auth' });
await app.register(productRoutes, { prefix: '/api/products' });

await app.listen({ port, host: '0.0.0.0' });
