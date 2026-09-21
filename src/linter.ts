export interface Finding {
  ruleId: 'mixed-separators' | 'unexpected-length';
  message: string;
  line: number;
  column: number;
  text: string;
}

// Structure: optional country code, optional area code in parens, a first
// digit group, then 1-4 more groups joined by a separator, then an optional
// extension. Each group is 2-4 digits on purpose: a lone single digit is
// what shows up in version strings (1.2.3) and IPv4 octets (192.168.1.1),
// and this shape simply can't match those.
const PHONE_PATTERN =
  /(?<cc>\+\d{1,3}[\s.-]?)?(?<area>\(\d{2,4}\)[\s.-]?)?(?<first>\d{2,4})(?<rest>(?:[\s.-]\d{2,4}){1,4})(?<ext>\s?(?:x|ext\.?)\s?\d{1,6})?/gi;

const SEPARATED_GROUP = /([\s.-])(\d{2,4})/g;

const MIN_PHONE_DIGITS = 7;
const MAX_PHONE_DIGITS = 15;

// Digit groupings that are almost always calendar dates (YYYY-MM-DD or
// MM-DD-YYYY) rather than phone numbers, when there's no area/country code
// attached to make the case for "phone number" stronger.
const DATE_SHAPES: number[][] = [
  [4, 2, 2],
  [2, 2, 4],
];

function digitCount(value: string): number {
  const matches = value.match(/\d/g);
  return matches ? matches.length : 0;
}

function sameShape(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((n, i) => n === b[i]);
}

export function lint(source: string): Finding[] {
  const findings: Finding[] = [];
  const lines = source.split(/\r\n|\r|\n/);

  lines.forEach((line, index) => {
    findings.push(...lintLine(line, index + 1));
  });

  return findings;
}

function lintLine(line: string, lineNumber: number): Finding[] {
  const findings: Finding[] = [];

  for (const match of line.matchAll(PHONE_PATTERN)) {
    const groups = match.groups!;
    const countryCode = groups.cc;
    const areaCode = groups.area;
    const firstGroup = groups.first;
    const restText = groups.rest;

    const restGroups = [...restText.matchAll(SEPARATED_GROUP)].map((m) => ({
      separator: m[1],
      digits: m[2],
    }));

    const localGroups = [firstGroup, ...restGroups.map((g) => g.digits)];
    const localShape = localGroups.map((g) => g.length);
    const totalLocalDigits = localGroups.reduce((sum, g) => sum + g.length, 0);
    const totalDigits =
      digitCount(countryCode ?? '') + digitCount(areaCode ?? '') + totalLocalDigits;

    if (totalDigits < MIN_PHONE_DIGITS || totalDigits > MAX_PHONE_DIGITS) {
      continue;
    }

    if (!areaCode && !countryCode && DATE_SHAPES.some((shape) => sameShape(shape, localShape))) {
      continue;
    }

    const column = (match.index ?? 0) + 1;
    const text = match[0];

    const separators = new Set(restGroups.map((g) => g.separator));
    if (separators.size > 1) {
      findings.push({
        ruleId: 'mixed-separators',
        message: `phone number mixes separator styles (${[...separators].join(', ')})`,
        line: lineNumber,
        column,
        text,
      });
    }

    if (!countryCode) {
      const expected = areaCode ? [7] : [7, 10];
      if (!expected.includes(totalLocalDigits)) {
        findings.push({
          ruleId: 'unexpected-length',
          message: `phone number has ${totalLocalDigits} digits, expected ${expected.join(' or ')}`,
          line: lineNumber,
          column,
          text,
        });
      }
    }
  }

  return findings;
}
