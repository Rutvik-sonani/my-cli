import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveFeatureTemplatesRoot } from '../src/paths.js';

describe('resolveFeatureTemplatesRoot', () => {
  it('finds bundled feature templates in the monorepo', () => {
    const root = resolveFeatureTemplatesRoot();
    expect(existsSync(join(root, 'features', 'auth', 'token.service.ts.ejs'))).toBe(true);
    expect(existsSync(join(root, 'features', 'rbac', 'rbac.service.ts.ejs'))).toBe(true);
    expect(existsSync(join(root, 'features', 'database', 'prisma', 'schema.prisma.ejs'))).toBe(
      true,
    );
  });
});
