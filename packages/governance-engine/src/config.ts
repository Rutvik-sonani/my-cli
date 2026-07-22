import { join } from 'node:path';
import type { GovernancePolicy, GovernanceRule } from '@mycli/enterprise-core';

export interface GovernancePathConfig {
  governance?: string;
}

export interface GovernancePaths {
  root: string;
  policy: string;
  rules: string;
  checker: string;
}

export function resolveGovernancePaths(config: GovernancePathConfig = {}): GovernancePaths {
  const root = config.governance ?? 'src/governance';

  return {
    root,
    policy: join(root, 'policy'),
    rules: join(root, 'rules'),
    checker: join(root, 'checker'),
  };
}

export function getGovernanceEnvLines(appName: string): string[] {
  return [
    `GOVERNANCE_APP=${appName}`,
    'GOVERNANCE_ENABLED=true',
    'GOVERNANCE_POLICY_PATH=company-policy.json',
    'GOVERNANCE_STRICT=true',
  ];
}

export function createDefaultCompanyRules(): GovernanceRule[] {
  return [
    {
      id: 'req-database-postgres',
      category: 'database',
      title: 'PostgreSQL required',
      description: 'Every project must use PostgreSQL as the primary database.',
      required: true,
      expect: { database: 'postgresql' },
    },
    {
      id: 'req-docker',
      category: 'infrastructure',
      title: 'Docker required',
      description: 'Projects must include Docker packaging.',
      required: true,
      featureKey: 'docker',
      expect: { pathExists: ['Dockerfile', 'docker-compose.yml'] },
    },
    {
      id: 'req-auth',
      category: 'authentication',
      title: 'Authentication required',
      description: 'Projects must enable authentication.',
      required: true,
      featureKey: 'auth',
    },
    {
      id: 'req-rbac',
      category: 'authentication',
      title: 'RBAC required',
      description: 'Projects must enable role-based access control.',
      required: true,
      featureKey: 'rbac',
    },
    {
      id: 'req-security',
      category: 'security',
      title: 'Security platform required',
      description: 'Projects must enable the security platform.',
      required: true,
      featureKey: 'security',
      expect: { pathExists: ['src/security'] },
    },
    {
      id: 'req-audit',
      category: 'audit',
      title: 'Audit logs required',
      description: 'Projects must enable audit logging.',
      required: true,
      featureKey: 'audit',
      expect: { pathExists: ['src/audit'] },
    },
    {
      id: 'req-tests',
      category: 'testing',
      title: 'Tests required',
      description: 'Projects must include automated tests.',
      required: true,
      featureKey: 'testing',
      expect: { packageScripts: ['test'], pathExists: ['tests'] },
    },
    {
      id: 'req-cicd',
      category: 'cicd',
      title: 'CI/CD required',
      description: 'Projects must include continuous integration workflows.',
      required: true,
      expect: { pathExists: ['.github/workflows', '.gitlab-ci.yml'] },
    },
    {
      id: 'req-docs',
      category: 'documentation',
      title: 'Documentation required',
      description: 'Projects must include core documentation files.',
      required: true,
      expect: { pathExists: ['README.md', 'SECURITY.md'] },
    },
  ];
}

export function createDefaultCompanyPolicy(company: string): GovernancePolicy {
  return {
    id: 'company-default',
    name: 'Company Engineering Standards',
    version: '1.0.0',
    company,
    rules: createDefaultCompanyRules(),
  };
}
