export type GitProvider = 'github' | 'gitlab' | 'bitbucket' | 'azure-devops' | 'skip';
export type BranchStrategy = 'git-flow' | 'github-flow' | 'trunk-based';
export type CommitConvention = 'conventional' | 'angular' | 'custom';

export interface GitInitOptions {
  cwd?: string;
  defaultBranch?: string;
  commitMessage?: string;
  createInitialCommit?: boolean;
}

export interface RemoteOptions {
  name?: string;
  url: string;
  cwd?: string;
}

export interface CreateRemoteRepoOptions {
  provider: GitProvider;
  name: string;
  cwd?: string;
  private?: boolean;
  owner?: string;
  organization?: string;
  project?: string;
  branch?: string;
  dryRun?: boolean;
  push?: boolean;
}

export interface CreateRemoteRepoResult {
  url: string;
  remoteName: string;
  commands: string[];
  executed: boolean;
  message?: string;
}

export interface PublishToRemoteOptions extends CreateRemoteRepoOptions {
  commitMessage?: string;
  ensureCommit?: boolean;
}

export interface PublishToRemoteResult extends CreateRemoteRepoResult {
  branch: string;
  pushed: boolean;
}

export interface GitProviderAdapter {
  readonly provider: GitProvider;
  readonly cliTools: string[];
  isAvailable(): Promise<boolean>;
  planCreate(options: CreateRemoteRepoOptions): CreateRemoteRepoResult;
  executeCreate(options: CreateRemoteRepoOptions): Promise<CreateRemoteRepoResult>;
}
