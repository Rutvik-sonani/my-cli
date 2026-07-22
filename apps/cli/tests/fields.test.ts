import { describe, expect, it } from 'vitest';
import { parseFields } from '../src/utils/fields.js';

describe('parseFields (CLI re-export)', () => {
  it('parses field specs', () => {
    expect(parseFields('name:string,price:number,category:relation')).toEqual([
      { name: 'name', type: 'string', optional: false, relation: false, related: undefined },
      { name: 'price', type: 'number', optional: false, relation: false, related: undefined },
      {
        name: 'category',
        type: 'relation',
        optional: false,
        relation: true,
        related: undefined,
      },
    ]);
  });
});
