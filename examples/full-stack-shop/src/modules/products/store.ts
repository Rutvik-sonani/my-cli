export interface Product {
  id: string;
  name: string;
  price: number;
  currency: string;
}

const catalog: Product[] = [
  { id: 'p_1', name: 'Starter Hoodie', price: 4800, currency: 'USD' },
  { id: 'p_2', name: 'CLI Stickers', price: 900, currency: 'USD' },
];

export function listProducts(): Product[] {
  return [...catalog];
}

export function getProduct(id: string): Product | undefined {
  return catalog.find((p) => p.id === id);
}
