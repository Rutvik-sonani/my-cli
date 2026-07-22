export { GitManager, createGitManager } from './manager.js';
export type {
  GitProvider,
  BranchStrategy,
  CommitConvention,
  GitInitOptions,
  RemoteOptions,
  CreateRemoteRepoOptions,
  CreateRemoteRepoResult,
  PublishToRemoteOptions,
  PublishToRemoteResult,
} from './types.js';
export type { GitCommunityOptions, GitHooksOptions, GitHooksResult } from './community.js';
export { getGitProviderAdapter, listGitProviderAdapters } from './providers/index.js';
export {
  GithubGitAdapter,
  GitlabGitAdapter,
  BitbucketGitAdapter,
  AzureDevOpsGitAdapter,
} from './providers/index.js';
