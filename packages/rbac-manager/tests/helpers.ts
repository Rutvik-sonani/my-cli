import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function featureTemplatesRoot(): string {
  return join(__dirname, '..', '..', '..', 'apps', 'cli', 'templates');
}

/** Assert generated TypeScript sources parse without syntax errors. */
export function assertTypeScriptParses(root: string, relativePaths: string[]): void {
  const diagnostics: ts.Diagnostic[] = [];

  for (const rel of relativePaths) {
    const source = readFileSync(join(root, rel), 'utf8');
    const result = ts.transpileModule(source, {
      fileName: rel,
      reportDiagnostics: true,
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
      },
    });
    if (result.diagnostics?.length) {
      diagnostics.push(...result.diagnostics);
    }
  }

  if (diagnostics.length > 0) {
    const message = ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCanonicalFileName: (fileName) => fileName,
      getCurrentDirectory: () => root,
      getNewLine: () => '\n',
    });
    throw new Error(`Generated TypeScript failed to parse:\n${message}`);
  }
}
