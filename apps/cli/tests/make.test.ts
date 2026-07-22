import { access, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createCli } from '../src/cli.js';

describe('my make (integration)', () => {
  let dir: string;
  let previousCwd: string;

  beforeEach(() => {
    previousCwd = process.cwd();
  });

  afterEach(async () => {
    process.chdir(previousCwd);
    if (dir) {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('lists generators', async () => {
    const cli = await createCli();
    const result = await cli.run(['make', 'list']);
    expect(result.exitCode).toBe(0);
    await cli.shutdown();
  });

  it('scaffolds a module with registration into a temp project', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-make-'));
    process.chdir(dir);

    await writeFile(
      join(dir, '.myclirc.json'),
      JSON.stringify({
        version: '1.0.0',
        projectName: 'tmp',
        paths: { modules: 'src/modules' },
      }),
    );
    await mkdir(join(dir, 'src'), { recursive: true });

    const cli = await createCli();
    const result = await cli.run([
      'make',
      'module',
      'customer',
      '--fields',
      'name:string,email:email',
    ]);
    expect(result.exitCode).toBe(0);

    const model = await readFile(join(dir, 'src/modules/customer/customer.model.ts'), 'utf8');
    expect(model).toContain('email: string');

    const barrel = await readFile(join(dir, 'src/modules/index.ts'), 'utf8');
    expect(barrel).toContain('customer');

    await cli.shutdown();
  });

  it('scaffolds CRUD with fields', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-crud-'));
    process.chdir(dir);
    await writeFile(
      join(dir, '.myclirc.json'),
      JSON.stringify({
        version: '1.0.0',
        paths: { modules: 'src/modules' },
        orm: 'prisma',
        database: 'postgresql',
      }),
    );
    await mkdir(join(dir, 'src'), { recursive: true });
    await mkdir(join(dir, 'prisma'), { recursive: true });
    await writeFile(
      join(dir, 'prisma/schema.prisma'),
      'generator client { provider = "prisma-client-js" }\n',
    );

    const cli = await createCli();
    const result = await cli.run([
      'make',
      'crud',
      'item',
      '--fields',
      'title:string,price:number,active:boolean',
    ]);
    expect(result.exitCode).toBe(0);

    const dto = await readFile(join(dir, 'src/modules/item/dto/index.ts'), 'utf8');
    expect(dto).toContain('price: number');
    expect(dto).toContain('active: boolean');

    const migrationsDir = join(dir, 'prisma/migrations');
    const entries = await readdir(migrationsDir, { withFileTypes: true });
    expect(entries.some((e) => e.isDirectory())).toBe(true);

    const schema = await readFile(join(dir, 'prisma/schema.prisma'), 'utf8');
    expect(schema).toContain('model Item');

    await cli.shutdown();
  });

  it('scaffolds queue and mail generators', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-make-queue-mail-'));
    process.chdir(dir);
    await writeFile(
      join(dir, '.myclirc.json'),
      JSON.stringify({
        version: '1.0.0',
        paths: { modules: 'src/modules' },
      }),
    );
    await mkdir(join(dir, 'src'), { recursive: true });

    const cli = await createCli();
    const queueResult = await cli.run(['make', 'queue', 'send-welcome']);
    expect(queueResult.exitCode).toBe(0);
    const job = await readFile(join(dir, 'src/jobs/send-welcome/send-welcome.job.ts'), 'utf8');
    expect(job).toContain('SendWelcomeJob');
    expect(job).toContain('enqueueSendWelcomeJob');
    const worker = await readFile(
      join(dir, 'src/jobs/send-welcome/send-welcome.worker.ts'),
      'utf8',
    );
    expect(worker).toContain('registerSendWelcomeWorker');
    expect(worker).toContain('bootstrapSendWelcomeWorker');

    const mailResult = await cli.run(['make', 'mail', 'order-confirmation']);
    expect(mailResult.exitCode).toBe(0);
    const mail = await readFile(join(dir, 'src/mail/order-confirmation.mail.ts'), 'utf8');
    expect(mail).toContain('OrderConfirmationMail');
    expect(mail).toContain('toMessage');
    expect(mail).toContain('sendOrderConfirmationMail');

    await cli.shutdown();
  });

  it('generates prisma migration with make migration', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-make-migration-'));
    process.chdir(dir);
    await writeFile(
      join(dir, '.myclirc.json'),
      JSON.stringify({
        version: '1.0.0',
        paths: { modules: 'src/modules' },
        orm: 'prisma',
        database: 'postgresql',
      }),
    );
    await mkdir(join(dir, 'src'), { recursive: true });
    await mkdir(join(dir, 'prisma'), { recursive: true });
    await writeFile(
      join(dir, 'prisma/schema.prisma'),
      'generator client { provider = "prisma-client-js" }\n\ndatasource db { provider = "postgresql" url = env("DATABASE_URL") }\n',
    );

    const cli = await createCli();
    const result = await cli.run(['make', 'migration', 'create_users']);
    expect(result.exitCode).toBe(0);

    const migrationsDir = join(dir, 'prisma/migrations');
    const entries = await readdir(migrationsDir, { withFileTypes: true });
    const migrationDir = entries.find((e) => e.isDirectory() && e.name.includes('create_users'));
    expect(migrationDir).toBeTruthy();

    const sql = await readFile(join(migrationsDir, migrationDir?.name, 'migration.sql'), 'utf8');
    expect(sql.length).toBeGreaterThan(0);

    await cli.shutdown();
  });

  it('previews module on --dry-run without writing files', async () => {
    dir = await mkdtemp(join(tmpdir(), 'mycli-make-dry-'));
    process.chdir(dir);
    await writeFile(
      join(dir, '.myclirc.json'),
      JSON.stringify({
        version: '1.0.0',
        projectName: 'tmp',
        paths: { modules: 'src/modules' },
      }),
    );
    await mkdir(join(dir, 'src'), { recursive: true });

    const cli = await createCli();
    const result = await cli.run(['make', 'module', 'preview', '--dry-run']);
    expect(result.exitCode).toBe(0);
    await expect(access(join(dir, 'src/modules/preview/preview.model.ts'))).rejects.toThrow();

    await cli.shutdown();
  });
});
