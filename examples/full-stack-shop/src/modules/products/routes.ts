import type { FastifyPluginAsync } from 'fastify';
import { getProduct, listProducts } from './store.js';

export const productRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', async () => ({ items: listProducts() }));

  app.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const product = getProduct(request.params.id);
    if (!product) {
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Product not found' } });
    }
    return product;
  });
};
