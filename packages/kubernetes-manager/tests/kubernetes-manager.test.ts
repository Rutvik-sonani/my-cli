import { access, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createFileSystem } from '@mycli/filesystem';
import { afterEach, describe, expect, it } from 'vitest';
import { createKubernetesManager } from '../src/index.js';
import { featureTemplatesRoot } from './helpers.js';

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

describe('KubernetesManager', () => {
  let dir: string;

  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it('generates Kubernetes manifests', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-k8s-'));
    const fs = createFileSystem(dir);
    const k8s = createKubernetesManager({
      cwd: dir,
      filesystem: fs,
      templatesRoot: featureTemplatesRoot(),
    });

    const result = await k8s.setup({ appName: 'shop', port: 3000, replicas: 3 });

    expect(result.files).toContain('k8s/deployment.yaml');
    expect(result.files).toContain('k8s/service.yaml');
    expect(result.files).toContain('k8s/ingress.yaml');
    expect(result.files).toContain('K8S.md');

    const deployment = await readFile(join(dir, 'k8s/deployment.yaml'), 'utf8');
    expect(deployment).toContain('kind: Deployment');
    expect(deployment).toContain('name: shop');
    expect(deployment).toContain('replicas: 3');
    expect(deployment).toContain('/health');
  });

  it('generates Helm chart', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-helm-'));
    const fs = createFileSystem(dir);
    const k8s = createKubernetesManager({
      cwd: dir,
      filesystem: fs,
      templatesRoot: featureTemplatesRoot(),
    });

    const result = await k8s.setupHelm({ appName: 'shop' });

    expect(result.files).toContain('helm/shop/Chart.yaml');
    expect(result.files).toContain('helm/shop/values.yaml');
    expect(result.files).toContain('helm/shop/templates/deployment.yaml');
    expect(result.files).toContain('HELM.md');

    const chart = await readFile(join(dir, 'helm/shop/Chart.yaml'), 'utf8');
    expect(chart).toContain('name: shop');

    const values = await readFile(join(dir, 'helm/shop/values.yaml'), 'utf8');
    expect(values).toContain('replicaCount');
  });

  it('supports dry-run', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-k8s-dry-'));
    const fs = createFileSystem(dir);
    const k8s = createKubernetesManager({
      cwd: dir,
      filesystem: fs,
      templatesRoot: featureTemplatesRoot(),
    });

    await k8s.setup({ appName: 'dry', dryRun: true });
    expect(await fileExists(join(dir, 'k8s/deployment.yaml'))).toBe(false);
  });
});
