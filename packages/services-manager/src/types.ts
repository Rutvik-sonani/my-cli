export type ServiceKind = 'cache' | 'queue' | 'events' | 'mail' | 'storage' | 'upload' | 'payment';

export type CacheProvider = 'redis' | 'memory' | 'memcached';
export type QueueProvider = 'bullmq' | 'rabbitmq' | 'kafka' | 'sqs';
export type MailProvider = 'smtp' | 'sendgrid' | 'mailgun';
export type StorageProvider = 's3' | 'local';
export type PaymentProvider = 'stripe';

export interface ServiceSetupOptions {
  service: ServiceKind;
  appName: string;
  cwd?: string;
  servicesPath?: string;
  provider?: string;
  dryRun?: boolean;
}

export interface ServiceSetupResult {
  files: string[];
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}
