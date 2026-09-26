# phone-format-linter

Phone numbers in CSVs, seed data, config files, and docs drift over time.
Someone pastes `555.123.4567` into a file where everything else is
`555-123-4567`, someone drops a digit typing a support number into a
markdown page, someone copies a 9-digit number from a bad export. Nothing
catches it until a customer complains that the number in the footer doesn't
work.

This is a small linter for that: it scans plain text line by line, finds
things that look like phone numbers, and reports formatting problems with
a line and column number, the way a normal linter reports a syntax error.

It is not a phone number *validator* in the libphonenumber sense - it does
not know that area code 555 is fake or that a Swedish number needs a
different shape. It only checks the two things that break most often in
practice: separators used inconsistently within a single number, and a
digit count that doesn't match a plausible NANP (US/Canada) number.

## What it catches

- **mixed-separators** - a number that switches punctuation partway
  through, e.g. `555-123.4567` (dash then dot).
- **unexpected-length** - a number without a `+country` prefix whose
  digit count isn't 7 (local) or 10 (with area code), e.g. `555-12-4567`.

It deliberately ignores things that only look like phone numbers on the
surface: ISO/US dates (`2024-01-01`, `01-01-2024`), semantic versions
(`v1.2.3.4567`), IPv4 addresses (`192.168.1.1`), and long digit runs like
card numbers. See `test/linter.test.ts` for the exact cases it's built
against.

## Usage

As a CLI, against one or more files:

```
node dist/src/cli.js contacts.csv config/support-numbers.txt
```

It prints one line per finding (`path:line:column ruleId - message`) to
stdout and exits `0` if every file is clean, `1` if it found formatting
problems, or `2` if a file couldn't be read - so it can be dropped straight
into CI.

Or as a library:

```ts
import { readFileSync } from 'node:fs';
import { lint } from './src/linter.js';

const text = readFileSync('contacts.csv', 'utf8');

for (const finding of lint(text)) {
  console.log(`contacts.csv:${finding.line}:${finding.column} ${finding.ruleId} - ${finding.message}`);
}
```

Given a file containing:

```
Support: 555-123-4567
Sales:   555-123.4567
Billing: 555-12-4567
```

it reports:

```
contacts.csv:2:10 mixed-separators - phone number mixes separator styles (-, .)
contacts.csv:3:10 unexpected-length - phone number has 9 digits, expected 7 or 10
```

## Development

```
npm run build   # compile src/ and test/ to dist/
npm test        # compile, then run the table-driven suite with node --test
```

No third-party dependencies - just the TypeScript compiler and Node's
built-in test runner.

## Roadmap

- support for international formats beyond NANP
- ignore/disable comments for lines that are intentionally non-standard
- autofix mode that rewrites separators to a chosen style
- JSON output format
