import { MyCliError } from '@mycli-cli/core';
import { execa } from 'execa';

export interface GithubLabelDefinition {
  name: string;
  color: string;
  description: string;
}

export const DEFAULT_GITHUB_LABELS: GithubLabelDefinition[] = [
  { name: 'bug', color: 'd73a4a', description: 'Something is broken' },
  { name: 'feature', color: 'a2eeef', description: 'New feature or request' },
  { name: 'documentation', color: '0075ca', description: 'Documentation improvements' },
  { name: 'security', color: 'e11d21', description: 'Security vulnerability or hardening' },
  { name: 'breaking-change', color: 'b60205', description: 'Breaking API or behavior change' },
  { name: 'performance', color: 'fbca04', description: 'Performance improvement' },
  { name: 'dependencies', color: '0366d6', description: 'Dependency updates' },
  { name: 'ci', color: '1d76db', description: 'CI/CD changes' },
];

export interface GithubCreateLabelsOptions {
  cwd?: string;
  labels?: GithubLabelDefinition[];
  dryRun?: boolean;
}

export interface GithubCreateLabelsResult {
  labels: string[];
  commands: string[];
  created: number;
}

export async function createGithubLabels(
  options: GithubCreateLabelsOptions = {},
): Promise<GithubCreateLabelsResult> {
  const cwd = options.cwd ?? process.cwd();
  const labels = options.labels ?? DEFAULT_GITHUB_LABELS;
  const commands: string[] = [];
  let created = 0;

  const ghCheck = await execa('gh', ['auth', 'status'], { reject: false });
  if (ghCheck.exitCode !== 0 && !options.dryRun) {
    throw new MyCliError('GitHub CLI (gh) is not authenticated. Run: gh auth login', {
      code: 'GIT_ERROR',
    });
  }

  for (const label of labels) {
    const command = `gh label create "${label.name}" --color ${label.color} --description "${label.description}" --force`;
    commands.push(command);

    if (!options.dryRun) {
      const result = await execa(
        'gh',
        [
          'label',
          'create',
          label.name,
          '--color',
          label.color,
          '--description',
          label.description,
          '--force',
        ],
        { cwd, reject: false },
      );
      if (result.exitCode === 0) {
        created += 1;
      }
    }
  }

  return {
    labels: labels.map((label) => label.name),
    commands,
    created: options.dryRun ? 0 : created,
  };
}
