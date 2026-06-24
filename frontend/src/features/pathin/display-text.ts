const CONTROL_CHARACTERS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;
const INVISIBLE_CHARACTERS = /[\u00ad\u200b-\u200d\u2060\ufeff]/g;
const TOKEN_PATTERN = /[A-Za-z0-9]+|[^\w\s]/g;
const CAMEL_TOKEN = /\b[A-Za-z][A-Za-z0-9]{5,}\b/g;
const CAMEL_ACRONYM_BOUNDARY = /([A-Z]+)([A-Z][a-z])/g;
const CAMEL_WORD_BOUNDARY = /([a-z0-9])([A-Z])/g;
const SPLIT_YEAR = /\b[12](?:\s*\d){3}\b/g;
const MONTH_YEAR =
  /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)(\d{4})\b/gi;
const DATE_RANGE =
  /(\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4})\s*[-–—]\s*(Present|(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4})\b/gi;
const COMPACTED_ALPHA_TOKEN = /[A-Za-z]{36,}/;

function collapseCharacterSpacedSegment(segment: string) {
  const tokens = segment.match(TOKEN_PATTERN) ?? [];
  const alphanumeric = tokens.filter((token) => /^[A-Za-z0-9]$/.test(token));
  if (
    alphanumeric.length >= 2 &&
    alphanumeric.length ===
      tokens.filter((token) => /^[A-Za-z0-9]+$/.test(token)).length
  ) {
    return tokens.join("");
  }
  return segment;
}

function splitCompactedCamelToken(token: string) {
  const acronymBoundaries =
    token.match(/([A-Z]+)(?=[A-Z][a-z])/g)?.length ?? 0;
  const wordBoundaries = token.match(/[a-z0-9](?=[A-Z])/g)?.length ?? 0;
  if (acronymBoundaries + wordBoundaries < 2 && token.length < 28) {
    return token;
  }
  return token
    .replace(CAMEL_ACRONYM_BOUNDARY, "$1 $2")
    .replace(CAMEL_WORD_BOUNDARY, "$1 $2");
}

function collapseSplitYear(value: string) {
  const digits = value.replace(/\s+/g, "");
  const year = Number(digits);
  return digits.length === 4 && year >= 1900 && year <= 2099
    ? digits
    : value;
}

export function formatMapText(value: string | null | undefined) {
  const normalized = String(value ?? "")
    .normalize("NFKC")
    .replace(CONTROL_CHARACTERS, " ")
    .replace(INVISIBLE_CHARACTERS, "")
    .replace(/[\u00a0\u2007\u202f]/g, " ");

  return normalized
    .split(/[ \t]{2,}/)
    .map((segment) => collapseCharacterSpacedSegment(segment.trim()))
    .filter(Boolean)
    .join(" ")
    .replace(/\s*\|\s*/g, " · ")
    .replace(CAMEL_TOKEN, splitCompactedCamelToken)
    .replace(SPLIT_YEAR, collapseSplitYear)
    .replace(MONTH_YEAR, "$1 $2")
    .replace(DATE_RANGE, "$1 - $2")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/([,;:])(?=\S)/g, "$1 ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isUnreadableMapText(value: string) {
  const formatted = formatMapText(value);
  const alphabeticCount = [...formatted].filter((character) =>
    /[A-Za-z]/.test(character),
  ).length;
  return (
    COMPACTED_ALPHA_TOKEN.test(formatted) ||
    (formatted.length >= 80 &&
      !formatted.includes(" ") &&
      alphabeticCount / Math.max(formatted.length, 1) >= 0.8)
  );
}

export function safeMapText(value: string, fallback: string) {
  const formatted = formatMapText(value);
  return !formatted || isUnreadableMapText(formatted) ? fallback : formatted;
}

export function compactMapText(
  value: string,
  maxLength: number,
  fallback: string,
) {
  const formatted = safeMapText(value, fallback);
  if (formatted.length <= maxLength) {
    return formatted;
  }

  const cutoff = formatted.lastIndexOf(" ", maxLength - 3);
  const safeCutoff = cutoff >= maxLength / 2 ? cutoff : maxLength - 3;
  return `${formatted.slice(0, safeCutoff).trimEnd()}...`;
}
