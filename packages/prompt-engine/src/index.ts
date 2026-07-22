import * as p from '@clack/prompts';
import { ValidationError } from '@mycli/core';
import pc from 'picocolors';
import type { I18n } from './i18n.js';

export interface TextPromptOptions {
  message: string;
  placeholder?: string;
  defaultValue?: string;
  validate?: (value: string) => string | undefined;
}

export interface ConfirmPromptOptions {
  message: string;
  initialValue?: boolean;
}

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  hint?: string;
}

export interface SelectPromptOptions<T extends string = string> {
  message: string;
  options: SelectOption<T>[];
  initialValue?: T;
}

export interface MultiSelectPromptOptions<T extends string = string> {
  message: string;
  options: SelectOption<T>[];
  initialValues?: T[];
  required?: boolean;
}

export interface PromptEngineOptions {
  interactive?: boolean;
  i18n?: I18n;
}

/**
 * Interactive prompt engine built on @clack/prompts.
 * Throws on cancel so callers can exit cleanly.
 */
export class PromptEngine {
  private readonly interactive: boolean;
  private readonly i18n?: I18n;

  constructor(options: PromptEngineOptions = {}) {
    this.interactive = options.interactive ?? Boolean(process.stdin.isTTY);
    this.i18n = options.i18n;
  }

  intro(message: string): void {
    p.intro(pc.bgCyan(pc.black(` ${message} `)));
  }

  outro(message: string): void {
    p.outro(message);
  }

  note(message: string, title?: string): void {
    p.note(message, title);
  }

  info(message: string): void {
    p.log.info(message);
  }

  success(message: string): void {
    p.log.success(message);
  }

  warn(message: string): void {
    p.log.warn(message);
  }

  error(message: string): void {
    p.log.error(message);
  }

  async text(options: TextPromptOptions): Promise<string> {
    this.assertInteractive();
    const value = await p.text({
      message: options.message,
      placeholder: options.placeholder,
      defaultValue: options.defaultValue,
      validate: options.validate,
    });
    return assertNotCancelled(value, this.i18n);
  }

  async confirm(options: ConfirmPromptOptions): Promise<boolean> {
    this.assertInteractive();
    const value = await p.confirm({
      message: options.message,
      initialValue: options.initialValue ?? true,
    });
    return assertNotCancelled(value, this.i18n);
  }

  async select<T extends string>(options: SelectPromptOptions<T>): Promise<T> {
    this.assertInteractive();
    const value = await p.select({
      message: options.message,
      options: options.options as never,
      initialValue: options.initialValue,
    });
    return assertNotCancelled(value, this.i18n) as T;
  }

  async multiSelect<T extends string>(options: MultiSelectPromptOptions<T>): Promise<T[]> {
    this.assertInteractive();
    const value = await p.multiselect({
      message: options.message,
      options: options.options as never,
      initialValues: options.initialValues,
      required: options.required ?? true,
    });
    return assertNotCancelled(value, this.i18n) as T[];
  }

  spinner(message: string): {
    start: (msg?: string) => void;
    stop: (msg?: string) => void;
    error: (msg?: string) => void;
  } {
    const spin = p.spinner();
    return {
      start: (msg?: string) => spin.start(msg ?? message),
      stop: (msg?: string) => spin.stop(msg ?? message),
      error: (msg?: string) => {
        // clack spinner uses stop for both; message conveys failure
        spin.stop(msg ?? message);
      },
    };
  }

  isInteractive(): boolean {
    return this.interactive;
  }

  private assertInteractive(): void {
    if (!this.interactive) {
      throw new ValidationError(
        'Interactive prompts are unavailable in non-interactive mode. Provide flags/config instead.',
        { code: 'VALIDATION_FAILED' },
      );
    }
  }
}

function assertNotCancelled<T>(value: T | symbol, i18n?: I18n): T {
  if (p.isCancel(value)) {
    p.cancel(i18n?.t('operation_cancelled') ?? 'Operation cancelled.');
    throw new ValidationError('Prompt cancelled by user', { code: 'VALIDATION_FAILED' });
  }
  return value;
}

export function createPromptEngine(options?: PromptEngineOptions): PromptEngine {
  return new PromptEngine(options);
}

export {
  I18n,
  createI18n,
  createI18nFromDir,
  loadLocaleSync,
  parseLocaleFile,
  type I18nOptions,
  type LocaleMessages,
} from './i18n.js';
