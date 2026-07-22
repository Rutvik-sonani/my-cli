import type { SecretEntry, SecretsProvider } from './types.js';

export type SyncExecutor = (
  command: string,
  args: string[],
  options: { cwd: string; input?: string },
) => Promise<{
  exitCode: number;
  stdout: string;
  stderr: string;
}>;

export function defaultSyncExecutor(
  command: string,
  args: string[],
  options: { cwd: string; input?: string },
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return import('execa').then(({ execa }) =>
    execa(command, args, {
      cwd: options.cwd,
      input: options.input,
      reject: false,
    }).then((result) => ({
      exitCode: result.exitCode ?? 1,
      stdout: result.stdout,
      stderr: result.stderr,
    })),
  );
}

export function providerSyncCommands(
  provider: SecretsProvider,
  entries: SecretEntry[],
  appName: string,
): string[] {
  switch (provider) {
    case 'railway':
      return entries.map((e) => `railway variables set ${e.key}=${e.value}`);
    case 'fly':
      return entries.map((e) => `fly secrets set ${e.key}=${e.value} --app ${appName}`);
    case 'vercel':
      return entries.map((e) => `vercel env add ${e.key} production`);
    case 'netlify':
      return entries.map((e) => `netlify env:set ${e.key} ${e.value}`);
    case 'aws':
      return entries.map(
        (e) =>
          `aws ssm put-parameter --name /${appName}/${e.key} --value ${e.value} --type SecureString --overwrite`,
      );
    case 'render':
      return entries.map((e) => `render env set ${e.key}=${e.value} --service ${appName}`);
    case 'digitalocean':
      return entries.map((e) => `doctl apps update ${appName} --spec - <<EOF\n# set ${e.key}\nEOF`);
    case 'gcp':
      return entries.map(
        (e) => `gcloud secrets create ${appName}-${e.key.toLowerCase()} --data-file=-`,
      );
    case 'azure':
      return entries.map(
        (e) => `az keyvault secret set --vault-name ${appName} --name ${e.key} --value ${e.value}`,
      );
    default:
      return entries.map((e) => `# ${provider} secret: ${e.key}=***`);
  }
}

export async function executeProviderSync(
  provider: SecretsProvider,
  entries: SecretEntry[],
  appName: string,
  cwd: string,
  exec: SyncExecutor = defaultSyncExecutor,
): Promise<{ commands: string[]; failures: string[] }> {
  const commands: string[] = [];
  const failures: string[] = [];

  for (const entry of entries) {
    let result: { exitCode: number; stdout: string; stderr: string };
    switch (provider) {
      case 'railway':
        commands.push(`railway variables set ${entry.key}=***`);
        result = await exec('railway', ['variables', 'set', `${entry.key}=${entry.value}`], {
          cwd,
        });
        break;
      case 'fly':
        commands.push(`fly secrets set ${entry.key}=*** --app ${appName}`);
        result = await exec(
          'fly',
          ['secrets', 'set', `${entry.key}=${entry.value}`, '--app', appName],
          { cwd },
        );
        break;
      case 'vercel':
        commands.push(`vercel env add ${entry.key} production`);
        result = await exec('vercel', ['env', 'add', entry.key, 'production', '--force'], {
          cwd,
          input: entry.value,
        });
        break;
      case 'netlify':
        commands.push(`netlify env:set ${entry.key} ***`);
        result = await exec('netlify', ['env:set', entry.key, entry.value], { cwd });
        break;
      case 'aws':
        commands.push(
          `aws ssm put-parameter --name /${appName}/${entry.key} --type SecureString --overwrite`,
        );
        result = await exec(
          'aws',
          [
            'ssm',
            'put-parameter',
            '--name',
            `/${appName}/${entry.key}`,
            '--value',
            entry.value,
            '--type',
            'SecureString',
            '--overwrite',
          ],
          { cwd },
        );
        break;
      case 'render':
        commands.push(`render env set ${entry.key}=*** --service ${appName}`);
        result = await exec(
          'render',
          ['env', 'set', `${entry.key}=${entry.value}`, '--service', appName],
          { cwd },
        );
        break;
      case 'digitalocean':
        commands.push(`doctl apps spec set ${appName} ${entry.key}=***`);
        result = await exec(
          'doctl',
          ['apps', 'update', appName, '--set-env', `${entry.key}=${entry.value}`],
          {
            cwd,
          },
        );
        break;
      case 'gcp':
        commands.push(
          `gcloud secrets versions add ${appName}-${entry.key.toLowerCase()} --data-file=-`,
        );
        result = await exec(
          'gcloud',
          ['secrets', 'versions', 'add', `${appName}-${entry.key.toLowerCase()}`, '--data-file=-'],
          { cwd, input: entry.value },
        );
        break;
      case 'azure':
        commands.push(`az keyvault secret set --vault-name ${appName} --name ${entry.key}`);
        result = await exec(
          'az',
          [
            'keyvault',
            'secret',
            'set',
            '--vault-name',
            appName,
            '--name',
            entry.key,
            '--value',
            entry.value,
          ],
          { cwd },
        );
        break;
      default:
        commands.push(`# unsupported provider sync: ${entry.key}`);
        failures.push(entry.key);
        continue;
    }

    if (result.exitCode !== 0) {
      failures.push(`${entry.key}: ${result.stderr || result.stdout}`);
    }
  }

  return { commands, failures };
}
