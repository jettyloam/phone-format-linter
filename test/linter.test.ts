import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lint } from '../src/linter.js';

interface ExpectedFinding {
  line: number;
  ruleId: string;
}

interface Case {
  name: string;
  input: string;
  expected: ExpectedFinding[];
}

// The regressions here matter more than the code: most of these are cases
// that look like a phone number to a naive digit-and-punctuation regex but
// aren't (dates, versions, IPs, card numbers), plus a few real numbers that
// are formatted in ways that are easy to get wrong.
const cases: Case[] = [
  {
    name: 'plain dash-separated number is clean',
    input: 'Call 555-123-4567 for support.',
    expected: [],
  },
  {
    name: 'area code in parens with space and dash is clean',
    input: 'Contact: (555) 123-4567',
    expected: [],
  },
  {
    name: 'consistent dot separators are clean',
    input: '555.123.4567',
    expected: [],
  },
  {
    name: 'mixed dash and dot separators are flagged',
    input: 'Call 555-123.4567 now.',
    expected: [{ line: 1, ruleId: 'mixed-separators' }],
  },
  {
    name: 'wrong digit count without an area code is flagged',
    input: 'Phone: 555-12-4567',
    expected: [{ line: 1, ruleId: 'unexpected-length' }],
  },
  {
    name: 'toll-free style number is still recognized correctly',
    input: '1-800-555-0199 is our toll-free line.',
    expected: [],
  },
  {
    name: 'an extension is ignored for the length check',
    input: 'Reach the desk at 555-123-4567 x910.',
    expected: [],
  },
  {
    name: 'a country code prefix skips the length check',
    input: '+1 555-123-4567 is the main line.',
    expected: [],
  },
  {
    name: 'a country code prefix still gets checked for mixed separators',
    input: '+1 555-123.4567 is wrong.',
    expected: [{ line: 1, ruleId: 'mixed-separators' }],
  },
  {
    name: 'an ISO date is not treated as a phone number',
    input: 'Deployed on 2024-01-01 to production.',
    expected: [],
  },
  {
    name: 'a US-style date is not treated as a phone number',
    input: 'Due date: 01-01-2024 sharp.',
    expected: [],
  },
  {
    name: 'a semantic version number is not treated as a phone number',
    input: 'Now running v1.2.3.4567 in prod.',
    expected: [],
  },
  {
    name: 'an IPv4 address is not treated as a phone number',
    input: 'connect to 192.168.1.1 for admin.',
    expected: [],
  },
  {
    name: 'a card-like number is not treated as a phone number',
    input: 'Card on file: 4111 1111 1111 1111 exp 12/29.',
    expected: [],
  },
  {
    name: 'line numbers are reported for the line the number is on',
    input: 'no phone here\nCall 555-123.4567 today\nend',
    expected: [{ line: 2, ruleId: 'mixed-separators' }],
  },
];

for (const { name, input, expected } of cases) {
  test(name, () => {
    const findings = lint(input);
    assert.equal(
      findings.length,
      expected.length,
      `expected ${expected.length} finding(s), got ${JSON.stringify(findings)}`,
    );
    findings.forEach((finding, i) => {
      assert.equal(finding.line, expected[i].line);
      assert.equal(finding.ruleId, expected[i].ruleId);
    });
  });
}

test('empty input produces no findings', () => {
  assert.deepEqual(lint(''), []);
});
