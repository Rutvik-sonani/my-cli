import { describe, expect, it } from 'vitest';
import { OrganizationPlatform, createOrganizationPlatform, slugify } from '../src/index.js';

describe('organization platform runtime', () => {
  it('creates company hierarchy with roles and permissions', () => {
    const platform = createOrganizationPlatform();
    const org = platform.organizations.create('Acme Corp');
    expect(org.slug).toBe('acme-corp');

    const eng = platform.teams.create(org.id, 'Engineering');
    const owner = platform.members.add(org.id, {
      userId: 'u1',
      email: 'owner@acme.com',
      role: 'owner',
    });
    platform.members.assignTeam(owner.id, eng.id);
    const project = platform.projects.create(org.id, 'Billing Service', { teamId: eng.id });

    expect(project.slug).toBe('billing-service');
    expect(platform.permissions.can(owner.id, 'role:assign')).toBe(true);
    expect(platform.teams.listByOrganization(org.id)).toHaveLength(1);
    expect(platform.members.listByOrganization(org.id)[0]?.teamIds).toContain(eng.id);
  });

  it('restricts viewer role permissions', () => {
    const platform = new OrganizationPlatform();
    const org = platform.organizations.create('Beta');
    const viewer = platform.members.add(org.id, {
      userId: 'v1',
      email: 'v@beta.com',
      role: 'viewer',
    });
    expect(platform.permissions.can(viewer.id, 'org:read')).toBe(true);
    expect(platform.permissions.can(viewer.id, 'project:write')).toBe(false);
    expect(() => platform.permissions.assert(viewer.id, 'org:delete')).toThrow(/Permission denied/);
  });

  it('slugifies names', () => {
    expect(slugify('Hello World!')).toBe('hello-world');
  });
});
