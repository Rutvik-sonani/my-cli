import type { FileSystem } from '@mycli-cli/filesystem';
import type { TemplateEngine } from '@mycli-cli/template-engine';

const ENTERPRISE_FILES = [
  {
    template: 'features/enterprise-saas/ENTERPRISE_SAAS.md.ejs',
    out: 'ENTERPRISE_SAAS.md',
  },
  {
    template: 'features/enterprise-saas/docs/ENTERPRISE_SAAS.md.ejs',
    out: 'docs/ENTERPRISE_SAAS.md',
  },
  {
    template: 'features/enterprise-saas/src/modules/organizations/organization.service.ts.ejs',
    out: 'src/modules/organizations/organization.service.ts',
  },
  {
    template: 'features/enterprise-saas/src/modules/teams/team.service.ts.ejs',
    out: 'src/modules/teams/team.service.ts',
  },
  {
    template: 'features/enterprise-saas/src/modules/billing/billing.service.ts.ejs',
    out: 'src/modules/billing/billing.service.ts',
  },
] as const;

export async function setupEnterpriseSaas(options: {
  fs: FileSystem;
  templates: TemplateEngine;
  appName: string;
  dryRun?: boolean;
}): Promise<string[]> {
  const written: string[] = [];
  const data = { appName: options.appName };

  for (const file of ENTERPRISE_FILES) {
    const content = await options.templates.renderFile(file.template, { data });
    if (!options.dryRun) {
      await options.fs.write(file.out, content);
    }
    written.push(file.out);
  }

  return written;
}

export async function writeDefaultDeploymentDoc(options: {
  fs: FileSystem;
  templates: TemplateEngine;
  appName: string;
  dryRun?: boolean;
}): Promise<string> {
  const content = await options.templates.renderFile('features/deploy/DEPLOYMENT.md.ejs', {
    data: {
      appName: options.appName,
      provider: 'railway',
      environment: 'production',
    },
  });
  if (!options.dryRun) {
    await options.fs.write('DEPLOYMENT.md', content);
  }
  return 'DEPLOYMENT.md';
}
