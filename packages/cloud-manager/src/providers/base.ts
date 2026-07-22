import type { CloudDeployOptions, CloudDeployResult } from '../types.js';

export type CommandExecutor = (
  command: string,
  args: string[],
  options: { cwd: string; dryRun?: boolean },
) => Promise<{
  exitCode: number;
  stdout: string;
  stderr: string;
}>;

export interface CloudProviderAdapter {
  readonly name: CloudDeployOptions['provider'];
  requiredFiles(): string[];
  requiredEnv(): string[];
  requiredCli(): string[];
  planPush(options: CloudDeployOptions): CloudDeployResult;
  push(options: CloudDeployOptions, exec: CommandExecutor): Promise<CloudDeployResult>;
}

export function defaultExecutor(
  command: string,
  args: string[],
  options: { cwd: string; dryRun?: boolean },
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  if (options.dryRun) {
    return Promise.resolve({
      exitCode: 0,
      stdout: `[dry-run] ${command} ${args.join(' ')}`,
      stderr: '',
    });
  }
  return import('execa').then(({ execa }) =>
    execa(command, args, { cwd: options.cwd, reject: false }).then((result) => ({
      exitCode: result.exitCode ?? 1,
      stdout: result.stdout,
      stderr: result.stderr,
    })),
  );
}
