import { join } from 'node:path';
import type { HealthCategory } from '@mycli-cli/enterprise-core';

export interface ProjectHealthPathConfig {
  projectHealth?: string;
}

export interface ProjectHealthPaths {
  root: string;
  analyzers: string;
  reports: string;
}

export function resolveProjectHealthPaths(
  config: ProjectHealthPathConfig = {},
): ProjectHealthPaths {
  const root = config.projectHealth ?? 'src/project-health';
  return {
    root,
    analyzers: join(root, 'analyzers'),
    reports: join(root, 'reports'),
  };
}

export function getProjectHealthEnvLines(appName: string): string[] {
  return [
    `PROJECT_HEALTH_APP=${appName}`,
    'PROJECT_HEALTH_ENABLED=true',
    'PROJECT_HEALTH_REPORT=project-health-report.md',
  ];
}

export const ALL_HEALTH_CATEGORIES: HealthCategory[] = [
  'architecture',
  'security',
  'dependencies',
  'testing',
  'documentation',
  'deployment',
  'performance',
];

export const HEALTH_REPORT_FILE = 'project-health-report.md';
