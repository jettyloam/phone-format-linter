#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { lint } from './linter.js';

export interface CliResult {
  exitCode: number;
  stdout: string[];
  stderr: string[];
}

// readFile is injectable so tests can exercise the CLI without touching the
// real filesystem or spawning a process.
export function runCli(
  paths: string[],
  readFile: (path: string) => string = (path) => readFileSync(path, 'utf8'),
): CliResult {
  const stdout: string[] = [];
  const stderr: string[] = [];

  if (paths.length === 0) {
    stderr.push('usage: phone-format-linter <file> [file...]');
    return { exitCode: 2, stdout, stderr };
  }

  let hasFindings = false;
  let hasErrors = false;

  for (const path of paths) {
    let text: string;
    try {
      text = readFile(path);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      stderr.push(`${path}: ${message}`);
      hasErrors = true;
      continue;
    }

    for (const finding of lint(text)) {
      hasFindings = true;
      stdout.push(`${path}:${finding.line}:${finding.column} ${finding.ruleId} - ${finding.message}`);
    }
  }

  // A file that couldn't be read is a harder failure than a clean lint
  // result, so it takes priority over the plain "findings exist" exit code.
  const exitCode = hasErrors ? 2 : hasFindings ? 1 : 0;
  return { exitCode, stdout, stderr };
}

function main(): void {
  const { exitCode, stdout, stderr } = runCli(process.argv.slice(2));
  if (stdout.length > 0) {
    process.stdout.write(stdout.join('\n') + '\n');
  }
  if (stderr.length > 0) {
    process.stderr.write(stderr.join('\n') + '\n');
  }
  process.exit(exitCode);
}

const invokedDirectly = process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1];
if (invokedDirectly) {
  main();
}
