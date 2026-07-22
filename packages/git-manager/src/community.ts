import type { CommitConvention } from './types.js';

export type { CommitConvention };

export interface GitCommunityOptions {
  cwd?: string;
  appName: string;
  templatesRoot: string;
  defaultBranch?: string;
  commitConvention?: CommitConvention;
  packageManager?: 'npm' | 'pnpm' | 'yarn' | 'bun';
  includeSecurity?: boolean;
  dryRun?: boolean;
}

export interface GitHooksOptions extends GitCommunityOptions {
  convention: CommitConvention;
}

export interface GitHooksResult {
  files: string[];
  devDependencies: Record<string, string>;
  scripts: Record<string, string>;
}

export const COMMUNITY_FILES = [
  { template: 'features/git/LICENSE.ejs', out: 'LICENSE' },
  { template: 'features/git/CHANGELOG.ejs', out: 'CHANGELOG.md' },
  { template: 'features/git/CONTRIBUTING.ejs', out: 'CONTRIBUTING.md' },
  { template: 'features/git/CODE_OF_CONDUCT.ejs', out: 'CODE_OF_CONDUCT.md' },
] as const;

export const HOOK_FILES = [
  { template: 'features/git/husky/pre-commit.ejs', out: '.husky/pre-commit' },
  { template: 'features/git/husky/commit-msg.ejs', out: '.husky/commit-msg' },
  { template: 'features/git/husky/pre-push.ejs', out: '.husky/pre-push' },
  { template: 'features/git/commitlint.config.js.ejs', out: 'commitlint.config.js' },
  { template: 'features/git/cz-config.js.ejs', out: '.cz-config.js' },
] as const;

export function commitlintExtends(convention: CommitConvention): string {
  switch (convention) {
    case 'angular':
      return '@commitlint/config-angular';
    case 'custom':
      return '@commitlint/config-conventional';
    default:
      return '@commitlint/config-conventional';
  }
}

export function hookCommands(packageManager: 'npm' | 'pnpm' | 'yarn' | 'bun'): {
  lintStagedCommand: string;
  commitlintCommand: string;
  testCommand: string;
} {
  const pm = packageManager;
  return {
    lintStagedCommand: pm === 'npm' ? 'npx lint-staged' : `${pm} exec lint-staged`,
    commitlintCommand:
      pm === 'npm' ? 'npx --no -- commitlint --edit $1' : `${pm} exec commitlint --edit $1`,
    testCommand: pm === 'npm' ? 'npm test' : `${pm} test`,
  };
}

export function hooksDevDependencies(convention: CommitConvention): Record<string, string> {
  const configPkg =
    convention === 'angular' ? '@commitlint/config-angular' : '@commitlint/config-conventional';

  return {
    husky: '^9.1.7',
    'lint-staged': '^15.3.0',
    '@commitlint/cli': '^19.6.1',
    [configPkg]: '^19.6.0',
    commitizen: '^4.3.1',
    'cz-conventional-changelog': '^3.3.0',
  };
}
