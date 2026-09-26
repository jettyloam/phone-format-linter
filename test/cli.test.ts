import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runCli } from '../src/cli.js';

test('no files given prints usage and exits 2', () => {
  const result = runCli([]);
  assert.equal(result.exitCode, 2);
  assert.deepEqual(result.stdout, []);
  assert.equal(result.stderr.length, 1);
  assert.match(result.stderr[0], /usage/);
});

test('clean file exits 0 with no output', () => {
  const files: Record<string, string> = {
    'clean.txt': 'Call 555-123-4567 for support.',
  };
  const result = runCli(['clean.txt'], (path) => files[path]);
  assert.equal(result.exitCode, 0);
  assert.deepEqual(result.stdout, []);
  assert.deepEqual(result.stderr, []);
});

test('file with findings exits 1 and reports path-prefixed output', () => {
  const files: Record<string, string> = {
    'contacts.csv': 'Sales: 555-123.4567',
  };
  const result = runCli(['contacts.csv'], (path) => files[path]);
  assert.equal(result.exitCode, 1);
  assert.deepEqual(result.stdout, [
    'contacts.csv:1:8 mixed-separators - phone number mixes separator styles (-, .)',
  ]);
  assert.deepEqual(result.stderr, []);
});

test('a file that cannot be read exits 2 and reports the error', () => {
  const result = runCli(['missing.txt'], () => {
    throw new Error('ENOENT: no such file or directory');
  });
  assert.equal(result.exitCode, 2);
  assert.equal(result.stderr.length, 1);
  assert.match(result.stderr[0], /missing\.txt/);
});

test('a read error takes priority over findings from other files', () => {
  const files: Record<string, string> = {
    'bad.txt': 'Sales: 555-123.4567',
  };
  const result = runCli(['bad.txt', 'missing.txt'], (path) => {
    if (path in files) return files[path];
    throw new Error('not found');
  });
  assert.equal(result.exitCode, 2);
  assert.equal(result.stdout.length, 1);
  assert.equal(result.stderr.length, 1);
});
