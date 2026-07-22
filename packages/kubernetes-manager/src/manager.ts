import { join } from 'node:path';
import { type FileSystem, createFileSystem } from '@mycli-cli/filesystem';
import { type TemplateEngine, createTemplateEngine } from '@mycli-cli/template-engine';
import type {
  HelmSetupOptions,
  HelmSetupResult,
  KubernetesSetupOptions,
  KubernetesSetupResult,
} from './types.js';

function buildK8sData(options: KubernetesSetupOptions): Record<string, unknown> {
  return {
    appName: options.appName,
    port: options.port ?? 3000,
    image: options.image ?? `${options.appName}:latest`,
    host: options.host ?? `${options.appName}.local`,
    replicas: options.replicas ?? 2,
    minReplicas: options.minReplicas ?? 1,
    maxReplicas: options.maxReplicas ?? 5,
    environment: options.environment ?? 'production',
    tlsEnabled: options.tlsEnabled ?? false,
    cpuRequest: options.cpuRequest ?? '100m',
    cpuLimit: options.cpuLimit ?? '500m',
    memoryRequest: options.memoryRequest ?? '128Mi',
    memoryLimit: options.memoryLimit ?? '512Mi',
  };
}

/**
 * Generates Kubernetes manifests and Helm charts via EJS templates.
 */
export class KubernetesManager {
  private readonly fs: FileSystem;
  private readonly templates: TemplateEngine;

  constructor(
    options: {
      cwd?: string;
      filesystem?: FileSystem;
      templateEngine?: TemplateEngine;
      templatesRoot?: string;
    } = {},
  ) {
    const cwd = options.cwd ?? process.cwd();
    this.fs = options.filesystem ?? createFileSystem(cwd);
    this.templates =
      options.templateEngine ??
      createTemplateEngine({
        filesystem: this.fs,
        templatesRoot: options.templatesRoot ?? 'templates',
      });
  }

  async setup(options: KubernetesSetupOptions): Promise<KubernetesSetupResult> {
    const cwd = options.cwd ?? this.fs.getRoot();
    const fs = createFileSystem(cwd);
    const data = buildK8sData(options);
    const written: string[] = [];

    const manifests = [
      'namespace.yaml',
      'deployment.yaml',
      'service.yaml',
      'ingress.yaml',
      'configmap.yaml',
      'hpa.yaml',
    ];

    for (const name of manifests) {
      const out = join('k8s', name);
      const content = await this.templates.renderFile(`features/kubernetes/${name}.ejs`, { data });
      if (!options.dryRun) {
        await fs.write(out, content);
      }
      written.push(out);
    }

    const doc = await this.templates.renderFile('features/kubernetes/K8S.md.ejs', { data });
    if (!options.dryRun) {
      await fs.write('K8S.md', doc);
    }
    written.push('K8S.md');

    return { files: written };
  }

  async setupHelm(options: HelmSetupOptions): Promise<HelmSetupResult> {
    const cwd = options.cwd ?? this.fs.getRoot();
    const fs = createFileSystem(cwd);
    const data = buildK8sData(options);
    const chartDir = join('helm', options.appName);
    const written: string[] = [];

    const chartFiles = [
      { template: 'features/helm/Chart.yaml.ejs', out: join(chartDir, 'Chart.yaml') },
      { template: 'features/helm/values.yaml.ejs', out: join(chartDir, 'values.yaml') },
      {
        template: 'features/helm/templates/deployment.yaml.ejs',
        out: join(chartDir, 'templates/deployment.yaml'),
      },
      {
        template: 'features/helm/templates/service.yaml.ejs',
        out: join(chartDir, 'templates/service.yaml'),
      },
      {
        template: 'features/helm/templates/ingress.yaml.ejs',
        out: join(chartDir, 'templates/ingress.yaml'),
      },
      {
        template: 'features/helm/templates/_helpers.tpl.ejs',
        out: join(chartDir, 'templates/_helpers.tpl'),
      },
    ];

    for (const file of chartFiles) {
      const content = await this.templates.renderFile(file.template, { data });
      if (!options.dryRun) {
        await fs.write(file.out, content);
      }
      written.push(file.out);
    }

    const doc = await this.templates.renderFile('features/helm/HELM.md.ejs', { data });
    if (!options.dryRun) {
      await fs.write('HELM.md', doc);
    }
    written.push('HELM.md');

    return { files: written };
  }
}

export function createKubernetesManager(options?: {
  cwd?: string;
  filesystem?: FileSystem;
  templateEngine?: TemplateEngine;
  templatesRoot?: string;
}): KubernetesManager {
  return new KubernetesManager(options);
}

export type {
  KubernetesSetupOptions,
  KubernetesSetupResult,
  HelmSetupOptions,
  HelmSetupResult,
} from './types.js';
