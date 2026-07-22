import { describe, expect, expectTypeOf, it } from 'vitest';
import type {
  ArchitectureStyle,
  CommandHandler,
  CommandMessage,
  DocumentationKind,
  GovernanceCheckStatus,
  GovernanceReport,
  HealthStatus,
  IdentityProtocol,
  MarketplaceTemplate,
  ProjectHealthReport,
  QueryMessage,
  SearchProviderId,
  TenancyStrategy,
  UpgradeReport,
} from '../src/index.js';

describe('@mycli-cli/enterprise-core', () => {
  it('exports architecture style union values usable at runtime checks', () => {
    const styles: ArchitectureStyle[] = [
      'mvc',
      'modular-monolith',
      'clean-architecture',
      'hexagonal',
      'domain-driven-design',
      'microservice',
      'monolith',
      'monorepo',
      'polyrepo',
    ];
    expect(styles).toHaveLength(9);
    expect(styles).toContain('hexagonal');
  });

  it('models CQRS command/query handler contracts', async () => {
    type CreateUser = CommandMessage & { type: 'CreateUser'; email: string };
    type GetUser = QueryMessage & { type: 'GetUser'; id: string };

    const handleCreate: CommandHandler<CreateUser, { id: string }> = async (command) => {
      expect(command.type).toBe('CreateUser');
      return { id: 'u_1' };
    };

    const result = await handleCreate({ type: 'CreateUser', email: 'a@b.co' });
    expect(result.id).toBe('u_1');

    expectTypeOf<GetUser>().toMatchTypeOf<QueryMessage>();
  });

  it('models governance report shape', () => {
    const report: GovernanceReport = {
      id: 'gov_1',
      policyId: 'default',
      generatedAt: new Date('2026-01-01T00:00:00.000Z'),
      projectName: 'demo',
      results: [
        {
          ruleId: 'auth.required',
          status: 'pass' satisfies GovernanceCheckStatus,
          title: 'Auth enabled',
          message: 'features.auth is true',
        },
      ],
      summary: { pass: 1, fail: 0, warning: 0, skipped: 0 },
      compliant: true,
    };

    expect(report.compliant).toBe(true);
    expect(report.summary.pass).toBe(1);
  });

  it('covers marketplace, migration, health, and documentation unions', () => {
    const template: MarketplaceTemplate = {
      id: 'tpl_api',
      name: 'API Starter',
      version: '1.0.0',
      description: 'Minimal API',
      author: 'mycli',
      tags: ['api'],
      visibility: 'public',
      compatibility: '>=1.0.0',
      requirements: {},
    };
    expect(template.visibility).toBe('public');

    const strategies: TenancyStrategy[] = ['shared-db', 'schema-per-tenant', 'db-per-tenant'];
    expect(strategies).toContain('shared-db');

    const protocols: IdentityProtocol[] = ['oauth2', 'oidc', 'saml', 'ldap'];
    expect(protocols).toContain('oidc');

    const searchProviders: SearchProviderId[] = ['elasticsearch', 'meilisearch', 'algolia'];
    expect(searchProviders).toContain('meilisearch');

    const health: HealthStatus[] = ['pass', 'warn', 'fail', 'info'];
    expect(health).toContain('pass');

    const docs: DocumentationKind[] = [
      'architecture',
      'security',
      'compliance',
      'operations',
      'scaling',
      'disaster-recovery',
      'api-guide',
    ];
    expect(docs).toContain('api-guide');

    const upgrade: UpgradeReport = {
      id: 'up_1',
      generatedAt: new Date(),
      projectName: 'demo',
      fromVersion: '1.0.0',
      toVersion: '1.1.0',
      scopes: ['project'],
      dryRun: false,
      actions: [],
      summary: { applied: 0, skipped: 0, planned: 0, failed: 0 },
    };
    expect(upgrade.scopes).toEqual(['project']);

    const projectHealth: ProjectHealthReport = {
      id: 'ph_1',
      generatedAt: new Date(),
      projectName: 'demo',
      findings: [],
      summary: { pass: 0, warn: 0, fail: 0, info: 0 },
      score: 100,
      readyForProduction: true,
    };
    expect(projectHealth.readyForProduction).toBe(true);
  });
});
