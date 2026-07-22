import type {
  CacheProvider,
  MailProvider,
  PaymentProvider,
  QueueProvider,
  ServiceKind,
  ServiceSetupOptions,
  StorageProvider,
} from './types.js';

export interface ServiceTemplateData {
  appName: string;
  service: ServiceKind;
  provider: string;
  includeUpload: boolean;
}

type ServiceFile = { template: string; out: (base: string) => string };

const DOC_TEMPLATES: Record<ServiceKind, string> = {
  cache: 'features/services/cache/CACHE.md.ejs',
  queue: 'features/services/queue/QUEUE.md.ejs',
  events: 'features/services/events/EVENTS.md.ejs',
  mail: 'features/services/mail/MAIL.md.ejs',
  storage: 'features/services/storage/STORAGE.md.ejs',
  upload: 'features/services/storage/STORAGE.md.ejs',
  payment: 'features/services/payment/PAYMENT.md.ejs',
};

const DOC_OUTPUT: Record<ServiceKind, string> = {
  cache: 'docs/cache.md',
  queue: 'docs/queue.md',
  events: 'docs/events.md',
  mail: 'docs/mail.md',
  storage: 'docs/storage.md',
  upload: 'docs/upload.md',
  payment: 'docs/payment.md',
};

function cacheFiles(provider: CacheProvider): ServiceFile[] {
  switch (provider) {
    case 'memory':
      return [
        {
          template: 'features/services/cache/memory.cache.service.ts.ejs',
          out: (b) => `${b}/cache.service.ts`,
        },
        { template: 'features/services/cache/index.memory.ts.ejs', out: (b) => `${b}/index.ts` },
      ];
    case 'memcached':
      return [
        {
          template: 'features/services/cache/memcached.client.ts.ejs',
          out: (b) => `${b}/memcached.client.ts`,
        },
        {
          template: 'features/services/cache/memcached.cache.service.ts.ejs',
          out: (b) => `${b}/cache.service.ts`,
        },
        { template: 'features/services/cache/index.memcached.ts.ejs', out: (b) => `${b}/index.ts` },
      ];
    default:
      return [
        {
          template: 'features/services/cache/redis.client.ts.ejs',
          out: (b) => `${b}/redis.client.ts`,
        },
        {
          template: 'features/services/cache/cache.service.ts.ejs',
          out: (b) => `${b}/cache.service.ts`,
        },
        { template: 'features/services/cache/index.ts.ejs', out: (b) => `${b}/index.ts` },
      ];
  }
}

function queueFiles(provider: QueueProvider): ServiceFile[] {
  switch (provider) {
    case 'rabbitmq':
      return [
        {
          template: 'features/services/queue/rabbitmq.client.ts.ejs',
          out: (b) => `${b}/rabbitmq.client.ts`,
        },
        {
          template: 'features/services/queue/queue.service.rabbitmq.ts.ejs',
          out: (b) => `${b}/queue.service.ts`,
        },
        {
          template: 'features/services/queue/queue.worker.rabbitmq.ts.ejs',
          out: (b) => `${b}/queue.worker.ts`,
        },
        { template: 'features/services/queue/index.rabbitmq.ts.ejs', out: (b) => `${b}/index.ts` },
      ];
    case 'kafka':
      return [
        {
          template: 'features/services/queue/kafka.client.ts.ejs',
          out: (b) => `${b}/kafka.client.ts`,
        },
        {
          template: 'features/services/queue/queue.service.kafka.ts.ejs',
          out: (b) => `${b}/queue.service.ts`,
        },
        {
          template: 'features/services/queue/queue.worker.kafka.ts.ejs',
          out: (b) => `${b}/queue.worker.ts`,
        },
        { template: 'features/services/queue/index.kafka.ts.ejs', out: (b) => `${b}/index.ts` },
      ];
    case 'sqs':
      return [
        { template: 'features/services/queue/sqs.client.ts.ejs', out: (b) => `${b}/sqs.client.ts` },
        {
          template: 'features/services/queue/queue.service.sqs.ts.ejs',
          out: (b) => `${b}/queue.service.ts`,
        },
        {
          template: 'features/services/queue/queue.worker.sqs.ts.ejs',
          out: (b) => `${b}/queue.worker.ts`,
        },
        { template: 'features/services/queue/index.sqs.ts.ejs', out: (b) => `${b}/index.ts` },
      ];
    default:
      return [
        {
          template: 'features/services/queue/redis.client.ts.ejs',
          out: (b) => `${b}/redis.client.ts`,
        },
        {
          template: 'features/services/queue/queue.service.ts.ejs',
          out: (b) => `${b}/queue.service.ts`,
        },
        {
          template: 'features/services/queue/queue.worker.ts.ejs',
          out: (b) => `${b}/queue.worker.ts`,
        },
        { template: 'features/services/queue/index.ts.ejs', out: (b) => `${b}/index.ts` },
      ];
  }
}

const STATIC_SERVICE_FILES: Record<Exclude<ServiceKind, 'cache' | 'queue'>, ServiceFile[]> = {
  events: [
    {
      template: 'features/services/events/redis.client.ts.ejs',
      out: (b) => `${b}/redis.client.ts`,
    },
    {
      template: 'features/services/events/event-bus.service.ts.ejs',
      out: (b) => `${b}/event-bus.service.ts`,
    },
    { template: 'features/services/events/index.ts.ejs', out: (b) => `${b}/index.ts` },
  ],
  mail: [
    { template: 'features/services/mail/mail.service.ts.ejs', out: (b) => `${b}/mail.service.ts` },
    { template: 'features/services/mail/index.ts.ejs', out: (b) => `${b}/index.ts` },
  ],
  storage: [
    {
      template: 'features/services/storage/storage.service.ts.ejs',
      out: (b) => `${b}/storage.service.ts`,
    },
    {
      template: 'features/services/storage/upload.middleware.ts.ejs',
      out: (b) => `${b}/upload.middleware.ts`,
    },
    { template: 'features/services/storage/index.ts.ejs', out: (b) => `${b}/index.ts` },
  ],
  upload: [
    {
      template: 'features/services/storage/storage.service.ts.ejs',
      out: (b) => `${b}/storage.service.ts`,
    },
    {
      template: 'features/services/storage/upload.middleware.ts.ejs',
      out: (b) => `${b}/upload.middleware.ts`,
    },
    { template: 'features/services/storage/index.ts.ejs', out: (b) => `${b}/index.ts` },
  ],
  payment: [
    {
      template: 'features/services/payment/payment.service.ts.ejs',
      out: (b) => `${b}/payment.service.ts`,
    },
    {
      template: 'features/services/payment/payment.routes.ts.ejs',
      out: (b) => `${b}/payment.routes.ts`,
    },
    { template: 'features/services/payment/index.ts.ejs', out: (b) => `${b}/index.ts` },
  ],
};

const ENV_LINES: Record<ServiceKind, (provider: string) => string[]> = {
  cache: (provider) => {
    switch (provider) {
      case 'memory':
        return ['CACHE_PROVIDER=memory', 'CACHE_TTL_SECONDS=3600'];
      case 'memcached':
        return [
          'CACHE_PROVIDER=memcached',
          'MEMCACHED_SERVERS=localhost:11211',
          'CACHE_TTL_SECONDS=3600',
        ];
      default:
        return [
          'CACHE_PROVIDER=redis',
          'REDIS_URL=redis://localhost:6379',
          'CACHE_TTL_SECONDS=3600',
        ];
    }
  },
  queue: (provider) => {
    switch (provider) {
      case 'rabbitmq':
        return [
          'QUEUE_PROVIDER=rabbitmq',
          'RABBITMQ_URL=amqp://guest:guest@localhost:5672',
          'QUEUE_PREFIX=<%= appName %>',
        ];
      case 'kafka':
        return [
          'QUEUE_PROVIDER=kafka',
          'KAFKA_BROKERS=localhost:9092',
          'KAFKA_CLIENT_ID=<%= appName %>',
          'QUEUE_PREFIX=<%= appName %>',
        ];
      case 'sqs':
        return [
          'QUEUE_PROVIDER=sqs',
          'AWS_REGION=us-east-1',
          'SQS_QUEUE_URL=',
          'QUEUE_PREFIX=<%= appName %>',
        ];
      default:
        return [
          'QUEUE_PROVIDER=bullmq',
          'REDIS_URL=redis://localhost:6379',
          'QUEUE_PREFIX=<%= appName %>',
        ];
    }
  },
  events: () => ['REDIS_URL=redis://localhost:6379', 'EVENTS_CHANNEL=<%= appName %>.events'],
  mail: (provider) =>
    provider === 'sendgrid'
      ? ['MAIL_PROVIDER=sendgrid', 'SENDGRID_API_KEY=', 'MAIL_FROM=noreply@example.com']
      : provider === 'mailgun'
        ? [
            'MAIL_PROVIDER=mailgun',
            'MAILGUN_API_KEY=',
            'MAILGUN_DOMAIN=',
            'MAIL_FROM=noreply@example.com',
          ]
        : [
            'MAIL_PROVIDER=smtp',
            'SMTP_HOST=localhost',
            'SMTP_PORT=1025',
            'SMTP_USER=',
            'SMTP_PASS=',
            'MAIL_FROM=noreply@example.com',
          ],
  storage: (provider) =>
    provider === 'local'
      ? ['STORAGE_PROVIDER=local', 'STORAGE_LOCAL_PATH=./uploads']
      : [
          'STORAGE_PROVIDER=s3',
          'AWS_REGION=us-east-1',
          'AWS_ACCESS_KEY_ID=',
          'AWS_SECRET_ACCESS_KEY=',
          'S3_BUCKET=',
          'S3_ENDPOINT=',
        ],
  upload: (provider) => ENV_LINES.storage(provider),
  payment: () => [
    'PAYMENT_PROVIDER=stripe',
    'STRIPE_SECRET_KEY=',
    'STRIPE_WEBHOOK_SECRET=',
    'STRIPE_CURRENCY=usd',
  ],
};

const DEPENDENCIES: Record<ServiceKind, (provider: string) => Record<string, string>> = {
  cache: (provider) => {
    switch (provider) {
      case 'memory':
        return {} as Record<string, string>;
      case 'memcached':
        return { memcached: '^2.2.2' };
      default:
        return { ioredis: '^5.4.2' };
    }
  },
  queue: (provider) => {
    switch (provider) {
      case 'rabbitmq':
        return { amqplib: '^0.10.5' } as Record<string, string>;
      case 'kafka':
        return { kafkajs: '^2.2.4' } as Record<string, string>;
      case 'sqs':
        return { '@aws-sdk/client-sqs': '^3.723.0' } as Record<string, string>;
      default:
        return { bullmq: '^5.34.8', ioredis: '^5.4.2' };
    }
  },
  events: () => ({ ioredis: '^5.4.2' }),
  mail: () => ({ nodemailer: '^6.9.16' }),
  storage: () => ({ '@aws-sdk/client-s3': '^3.723.0' }),
  upload: () => ({ '@aws-sdk/client-s3': '^3.723.0', '@fastify/multipart': '^9.0.1' }),
  payment: () => ({ stripe: '^17.5.0' }),
};

export function normalizeService(service: ServiceKind): ServiceKind {
  return service === 'upload' ? 'upload' : service;
}

export function resolveProvider(service: ServiceKind, provider?: string): string {
  switch (service) {
    case 'cache': {
      const p = provider ?? 'redis';
      if (p === 'memory' || p === 'memcached' || p === 'redis') return p;
      return 'redis';
    }
    case 'queue': {
      const p = provider ?? 'bullmq';
      if (p === 'bullmq' || p === 'rabbitmq' || p === 'kafka' || p === 'sqs') return p;
      return 'bullmq';
    }
    case 'mail':
      return (provider ?? 'smtp') as MailProvider;
    case 'storage':
    case 'upload':
      return (provider ?? 's3') as StorageProvider;
    case 'payment':
      return (provider ?? 'stripe') as PaymentProvider;
    default:
      return provider ?? 'default';
  }
}

export function buildServiceTemplateData(options: ServiceSetupOptions): ServiceTemplateData {
  const service = normalizeService(options.service);
  return {
    appName: options.appName,
    service,
    provider: resolveProvider(service, options.provider),
    includeUpload: service === 'upload' || service === 'storage',
  };
}

export function getServiceFiles(
  service: ServiceKind,
  provider: string,
): Array<{ template: string; out: (base: string) => string }> {
  if (service === 'cache') {
    return cacheFiles(provider as CacheProvider);
  }
  if (service === 'queue') {
    return queueFiles(provider as QueueProvider);
  }
  return STATIC_SERVICE_FILES[service];
}

export function getDocTemplate(service: ServiceKind): { template: string; out: string } {
  return { template: DOC_TEMPLATES[service], out: DOC_OUTPUT[service] };
}

export function getEnvLines(service: ServiceKind, provider: string, appName: string): string[] {
  return ENV_LINES[service](provider).map((line) => line.replace('<%= appName %>', appName));
}

export function getServiceDependencies(
  service: ServiceKind,
  provider: string,
): {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
} {
  return { dependencies: DEPENDENCIES[service](provider), devDependencies: {} };
}

export function serviceFolderName(service: ServiceKind): string {
  if (service === 'upload') return 'storage';
  return service;
}
