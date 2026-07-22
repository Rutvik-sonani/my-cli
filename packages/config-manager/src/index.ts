import { ConfigurationError, deepMerge, invariant } from '@mycli-cli/core';
import { type FileSystem, createFileSystem } from '@mycli-cli/filesystem';

export const MYCLI_CONFIG_FILENAME = 'mycli.config.json';
export const MYCLI_PROJECT_FILENAME = '.myclirc.json';

export interface PackageManagerPreference {
  preferred?: 'npm' | 'pnpm' | 'yarn' | 'bun';
  lockfile?: string;
}

export interface TelemetryConfig {
  enabled: boolean;
  anonymousId?: string;
}

export interface PluginConfigEntry {
  name: string;
  version?: string;
  enabled?: boolean;
  path?: string;
  options?: Record<string, unknown>;
}

export interface GeneratorDefaults {
  language?: 'typescript' | 'javascript';
  style?: 'modular' | 'layered';
  testFramework?: 'vitest' | 'jest';
}

export interface MyCliConfig {
  $schema?: string;
  version: string;
  projectName?: string;
  applicationType?: string;
  architecture?: string;
  language?: 'typescript' | 'javascript';
  backend?: string;
  frontend?: string;
  uiLibrary?: string;
  database?: string;
  orm?: string;
  packageManager?: PackageManagerPreference;
  plugins?: PluginConfigEntry[];
  generators?: GeneratorDefaults;
  telemetry?: TelemetryConfig;
  paths?: {
    modules?: string;
    domain?: string;
    application?: string;
    infrastructure?: string;
    cqrs?: string;
    eventSystem?: string;
    tenancy?: string;
    identity?: string;
    audit?: string;
    compliance?: string;
    privacy?: string;
    featureFlags?: string;
    observability?: string;
    security?: string;
    search?: string;
    organizations?: string;
    governance?: string;
    templateMarketplace?: string;
    migration?: string;
    projectHealth?: string;
    documentation?: string;
    templates?: string;
    plugins?: string;
    output?: string;
  };
  architectureStyle?: string;
  architectureLabel?: string;
  features?: Record<string, boolean>;
  extensions?: Record<string, unknown>;
  terraformProvider?: string;
  deployProvider?: string;
  cicdProvider?: string;
  gitProvider?: string;
}

export interface ConfigLoadOptions {
  cwd?: string;
  configPath?: string;
  filesystem?: FileSystem;
}

export const DEFAULT_CONFIG: MyCliConfig = {
  version: '1.0.0',
  language: 'typescript',
  packageManager: { preferred: 'pnpm' },
  telemetry: { enabled: false },
  generators: {
    language: 'typescript',
    style: 'modular',
    testFramework: 'vitest',
  },
  paths: {
    modules: 'src/modules',
    templates: 'templates',
    plugins: 'plugins',
    output: '.',
  },
  features: {},
  plugins: [],
  extensions: {},
};

/**
 * Loads, validates, merges, and persists MyCLI configuration.
 */
export class ConfigManager {
  private config: MyCliConfig;
  private readonly fs: FileSystem;
  private readonly cwd: string;
  private loadedFrom?: string;

  constructor(options: ConfigLoadOptions = {}) {
    this.cwd = options.cwd ?? process.cwd();
    this.fs = options.filesystem ?? createFileSystem(this.cwd);
    this.config = structuredClone(DEFAULT_CONFIG);
  }

  async load(): Promise<MyCliConfig> {
    const candidates = [MYCLI_PROJECT_FILENAME, MYCLI_CONFIG_FILENAME];

    for (const relPath of candidates) {
      if (await this.fs.exists(relPath)) {
        const raw = await this.fs.readJson<Partial<MyCliConfig>>(relPath);
        this.config = this.merge(DEFAULT_CONFIG, raw);
        this.validate(this.config);
        this.loadedFrom = relPath;
        return this.get();
      }
    }

    this.config = structuredClone(DEFAULT_CONFIG);
    this.loadedFrom = undefined;
    return this.get();
  }

  async loadOrCreate(initial?: Partial<MyCliConfig>): Promise<MyCliConfig> {
    await this.load();
    if (!this.loadedFrom && initial) {
      this.config = this.merge(DEFAULT_CONFIG, initial);
      await this.save();
    }
    return this.get();
  }

  get(): MyCliConfig {
    return structuredClone(this.config);
  }

  getPath(key: keyof NonNullable<MyCliConfig['paths']>): string {
    const paths = this.config.paths ?? DEFAULT_CONFIG.paths!;
    return paths[key] ?? DEFAULT_CONFIG.paths?.[key]!;
  }

  getLoadedFrom(): string | undefined {
    return this.loadedFrom;
  }

  set<K extends keyof MyCliConfig>(key: K, value: MyCliConfig[K]): void {
    this.config = { ...this.config, [key]: value };
    this.validate(this.config);
  }

  mergeIn(partial: Partial<MyCliConfig>): MyCliConfig {
    this.config = this.merge(this.config, partial);
    this.validate(this.config);
    return this.get();
  }

  async save(filename: string = MYCLI_PROJECT_FILENAME): Promise<void> {
    this.validate(this.config);
    await this.fs.writeJson(filename, this.config, { overwrite: true });
    this.loadedFrom = filename;
  }

  isFeatureEnabled(feature: string): boolean {
    return Boolean(this.config.features?.[feature]);
  }

  enableFeature(feature: string): void {
    this.config.features = { ...this.config.features, [feature]: true };
  }

  private merge(base: MyCliConfig, partial: Partial<MyCliConfig>): MyCliConfig {
    return deepMerge(
      base as unknown as Record<string, unknown>,
      partial as unknown as Record<string, unknown>,
    ) as unknown as MyCliConfig;
  }

  private validate(config: MyCliConfig): void {
    invariant(
      typeof config.version === 'string' && config.version.length > 0,
      'Config version is required',
    );
    if (config.language && config.language !== 'typescript' && config.language !== 'javascript') {
      throw new ConfigurationError(`Unsupported language: ${config.language}`, {
        code: 'INVALID_CONFIG',
        details: { language: config.language },
      });
    }
    if (config.telemetry && typeof config.telemetry.enabled !== 'boolean') {
      throw new ConfigurationError('telemetry.enabled must be a boolean', {
        code: 'INVALID_CONFIG',
      });
    }
  }
}

export function createConfigManager(options?: ConfigLoadOptions): ConfigManager {
  return new ConfigManager(options);
}
