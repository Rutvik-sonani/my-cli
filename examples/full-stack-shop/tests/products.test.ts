import { describe, expect, it } from 'vitest';
import { getProduct, listProducts } from '../src/modules/products/store.js';

describe('full-stack-shop products', () => {
  it('lists catalog items', () => {
    const items = listProducts();
    expect(items.length).toBeGreaterThan(0);
    expect(items[0]).toMatchObject({ id: expect.any(String), name: expect.any(String) });
  });

  it('finds a product by id', () => {
    expect(getProduct('p_1')?.name).toBe('Starter Hoodie');
    expect(getProduct('missing')).toBeUndefined();
  });
});
