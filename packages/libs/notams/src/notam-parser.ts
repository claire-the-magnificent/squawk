import type { Coordinates } from '@squawk/types';

import type {
  Notam,
  NotamAction,
  NotamConditionCode,
  NotamDateTime,
  NotamPurpose,
  NotamQualifier,
  NotamScope,
  NotamSubjectCode,
  NotamTrafficType,
} from './types/index.js';
import { NOTAM_CONDITION_CODE_MAP, NOTAM_SUBJECT_CODE_MAP } from './types/index.js';

/**
 * Parses a NOTAM datetime string in YYMMDDHHmm format into a {@link NotamDateTime}.
 *
 * @param str - The 10-digit datetime string (e.g. "2404201400").
 * @returns The parsed datetime, or undefined if the format is invalid.
 */
function parseNotamDateTime(str: string): NotamDateTime | undefined {
  const cleaned = str.trim();
  if (cleaned.length !== 10 || !/^\d{10}$/.test(cleaned)) {
    return undefined;
  }
  return {
    year: parseInt(cleaned.substring(0, 2), 10),
    month: parseInt(cleaned.substring(2, 4), 10),
    day: parseInt(cleaned.substring(4, 6), 10),
    hour: parseInt(cleaned.substring(6, 8), 10),
    minute: parseInt(cleaned.substring(8, 10), 10),
  };
}

/**
 * Parses the Q-line coordinate and radius field.
 * Format: DDMMd/DDDMMd/NNN (e.g. "5129N00028W005"). The field may also be
 * empty, or carry only the 3-digit radius, as some issuers send (e.g. "005").
 *
 * @param coordStr - The coordinate/radius string from the Q-line.
 * @returns The parsed coordinates and radius (each absent when the field does not carry it), or
 *   undefined if the field is malformed.
 */
function parseQLineCoordinates(
  coordStr: string,
): { coordinates?: Coordinates; radiusNm?: number } | undefined {
  if (coordStr === '') {
    return {};
  }

  const radiusOnly = coordStr.match(/^(\d{3})$/);
  if (radiusOnly) {
    return { radiusNm: parseInt(radiusOnly[1]!, 10) };
  }

  const match = coordStr.match(/^(\d{2})(\d{2})([NS])(\d{3})(\d{2})([EW])(\d{3})$/);
  if (!match) {
    return undefined;
  }

  let lat = parseInt(match[1]!, 10) + parseInt(match[2]!, 10) / 60;
  if (match[3] === 'S') {
    lat = -lat;
  }

  let lon = parseInt(match[4]!, 10) + parseInt(match[5]!, 10) / 60;
  if (match[6] === 'W') {
    lon = -lon;
  }

  return {
    coordinates: { lat, lon },
    radiusNm: parseInt(match[7]!, 10),
  };
}

/**
 * Parses the traffic type qualifier from the Q-line.
 *
 * @param code - The traffic type code (e.g. "IV", "I", "V", "K").
 * @returns The parsed traffic type.
 */
function parseTrafficType(code: string): NotamTrafficType {
  switch (code) {
    case 'I':
      return 'IFR';
    case 'V':
      return 'VFR';
    case 'IV':
    case 'VI':
      return 'IFR_VFR';
    case 'K':
      return 'CHECKLIST';
    default:
      return 'IFR_VFR';
  }
}

/**
 * Parses the scope qualifier from the Q-line.
 *
 * @param code - The scope code (e.g. "A", "E", "W", "AE").
 * @returns The parsed scope.
 */
function parseScope(code: string): NotamScope {
  const sorted = code.split('').sort().join('');
  switch (sorted) {
    case 'A':
      return 'AERODROME';
    case 'E':
      return 'ENROUTE';
    case 'W':
      return 'NAV_WARNING';
    case 'AE':
      return 'AERODROME_ENROUTE';
    case 'AW':
      return 'AERODROME_WARNING';
    case 'EW':
      return 'ENROUTE_WARNING';
    case 'AEW':
      return 'AERODROME_ENROUTE_WARNING';
    default:
      return 'AERODROME';
  }
}

/** Valid purpose code characters. */
const VALID_PURPOSES = new Set(['N', 'B', 'O', 'M', 'K']);

/**
 * Parses the purpose field from the Q-line into an array of {@link NotamPurpose} codes.
 *
 * @param code - The raw purpose string (e.g. "NBO", "BO", "K").
 * @returns An array of individual purpose codes.
 */
function parsePurposes(code: string): NotamPurpose[] {
  const purposes: NotamPurpose[] = [];
  for (const ch of code) {
    if (VALID_PURPOSES.has(ch)) {
      purposes.push(ch as NotamPurpose);
    }
  }
  return purposes;
}

/**
 * Parses the Q-line into a structured qualifier object.
 * Format: FIR/QCODE/TRAFFIC/PURPOSE/SCOPE/LOWER/UPPER/COORDS
 *
 * @param qLine - The raw Q-line content after "Q)".
 * @returns The parsed qualifier, or undefined if the Q-line cannot be parsed.
 */
function parseQLine(qLine: string): NotamQualifier | undefined {
  const parts = qLine.split('/').map((p) => p.trim());
  if (parts.length < 8) {
    return undefined;
  }

  const fir = parts[0]!;
  const qCode = parts[1]!;

  // Q-code format: QXXXX (5 letters starting with Q)
  const notamCode = qCode;
  let subjectCode: NotamSubjectCode = 'XX';
  let conditionCode: NotamConditionCode = 'XX';
  if (qCode.length === 5 && qCode.startsWith('Q')) {
    const rawSubject = qCode.substring(1, 3);
    const rawCondition = qCode.substring(3, 5);
    subjectCode = rawSubject in NOTAM_SUBJECT_CODE_MAP ? (rawSubject as NotamSubjectCode) : 'XX';
    conditionCode =
      rawCondition in NOTAM_CONDITION_CODE_MAP ? (rawCondition as NotamConditionCode) : 'XX';
  }

  const trafficType = parseTrafficType(parts[2]!);
  const purposes = parsePurposes(parts[3]!);
  const scope = parseScope(parts[4]!);

  const lowerRaw = parseInt(parts[5]!, 10);
  const upperRaw = parseInt(parts[6]!, 10);
  const lowerAltitudeFt = isNaN(lowerRaw) ? undefined : lowerRaw * 100;
  const upperAltitudeFt = isNaN(upperRaw) ? 99900 : upperRaw * 100;

  const coordResult = parseQLineCoordinates(parts[7]!);
  if (!coordResult) {
    return undefined;
  }

  return {
    fir,
    notamCode,
    subjectCode,
    conditionCode,
    trafficType,
    purposes,
    scope,
    ...(lowerAltitudeFt !== undefined && lowerAltitudeFt !== 0 ? { lowerAltitudeFt } : {}),
    upperAltitudeFt,
    ...(coordResult.coordinates ? { coordinates: coordResult.coordinates } : {}),
    ...(coordResult.radiusNm !== undefined ? { radiusNm: coordResult.radiusNm } : {}),
  };
}

/** Optional items that sit before the mandatory Item E, and so cannot start after it. */
const ITEMS_BEFORE_E = new Set(['C', 'D']);

/**
 * Finds the ordered positions of NOTAM item delimiters (A) through G)) in the text.
 * Only considers delimiters that appear in valid ICAO order (A, B, C, D, E, F, G)
 * after the Q-line region, preventing false matches inside free-text content.
 * Items C and D are optional; one is only accepted when it starts before the first
 * Item E delimiter, so a stray " D)" inside the E text (e.g. "(CAT D)") is not
 * mistaken for a missing Item D.
 *
 * @param text - The normalized NOTAM text.
 * @returns A map of item letters to their start positions (position after the "X) " delimiter).
 */
function findItemPositions(text: string): Map<string, { start: number; end: number }> {
  const items = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
  const positions: { letter: string; delimiterStart: number; valueStart: number }[] = [];

  // Skip past the Q-line if present so we don't match inside it
  let searchStart = 0;
  const qMatch = /\bQ\)\s*/i.exec(text);
  if (qMatch) {
    searchStart = qMatch.index;
  }

  // Scan for each item letter in order. Each subsequent item must appear after the previous one.
  let cursor = searchStart;
  for (const letter of items) {
    const pattern = new RegExp(`(?:^|\\s)${letter}\\)\\s*`, 'g');
    pattern.lastIndex = cursor;
    const match = pattern.exec(text);

    let beforeE = true;
    if (match && ITEMS_BEFORE_E.has(letter)) {
      const itemE = /(?:^|\s)E\)\s*/g;
      itemE.lastIndex = cursor;
      const eMatch = itemE.exec(text);
      beforeE = !eMatch || match.index <= eMatch.index;
    }

    if (match && match.index >= cursor && beforeE) {
      const valueStart = match.index + match[0].length;
      positions.push({ letter, delimiterStart: match.index, valueStart });
      cursor = valueStart;
    }
  }

  // Build the map: each item's value runs from its valueStart to the next item's delimiterStart
  const result = new Map<string, { start: number; end: number }>();
  for (let i = 0; i < positions.length; i++) {
    const current = positions[i]!;
    const next = positions[i + 1];
    result.set(current.letter, {
      start: current.valueStart,
      end: next ? next.delimiterStart : text.length,
    });
  }

  return result;
}

/**
 * Extracts the value for a given NOTAM item code from pre-computed positions.
 *
 * @param text - The normalized NOTAM text.
 * @param item - The item letter to extract (e.g. "A", "B", "E").
 * @param positions - Pre-computed item positions from {@link findItemPositions}.
 * @returns The extracted value trimmed of whitespace, or undefined if not found.
 */
function extractItem(
  text: string,
  item: string,
  positions: Map<string, { start: number; end: number }>,
): string | undefined {
  const pos = positions.get(item);
  if (!pos) {
    return undefined;
  }
  return text.substring(pos.start, pos.end).trim();
}

/** Trailing `SOURCE: <originator>` line that some feeds append after the last item. */
const SOURCE_FOOTER = /\s+SOURCE:\s*[A-Z0-9]+\s*$/i;

/** Trailing `CREATED: 15 Nov 2022 15:42:00` line that some feeds append after the last item. */
const CREATED_FOOTER = /\s+CREATED:\s*\d{1,2}\s+[A-Za-z]{3}\s+\d{4}\s+\d{2}:\d{2}(?::\d{2})?\s*$/i;

/**
 * Removes the `CREATED:` / `SOURCE:` footer that some feeds append to a NOTAM so it is not
 * read as part of the last item's value.
 *
 * @param text - The normalized NOTAM text.
 * @returns The text without the footer.
 */
function stripFooter(text: string): string {
  return text.replace(SOURCE_FOOTER, '').replace(CREATED_FOOTER, '');
}

/**
 * Parses a raw ICAO-format NOTAM string into a structured {@link Notam} object.
 *
 * Handles NOTAMN (new), NOTAMR (replacement), and NOTAMC (cancellation)
 * action types. The `A1234/26 NOTAMN` header line may be omitted when the text
 * starts at the Q-line, as in the ICAO rendering served by the FAA NMS; `id` and
 * `action` are then undefined. A trailing `CREATED:` / `SOURCE:` footer is
 * ignored. Parses the Q-line qualifier (FIR, NOTAM code, traffic type,
 * purpose, scope, altitude limits, coordinates/radius) and items A through G
 * (location, effective period, schedule, free-text description, altitude limits).
 *
 * ```typescript
 * import { parseNotam } from '@squawk/notams';
 *
 * const notam = parseNotam(rawNotamString);
 * console.log(notam.id);               // "A1242/24"
 * console.log(notam.action);           // "NEW"
 * console.log(notam.qualifier?.fir);    // "KZNY"
 * console.log(notam.locationCodes);    // ["KJFK"]
 * console.log(notam.text);             // "RWY 09L/27R CLSD DUE TO RESURFACING"
 * ```
 *
 * @param raw - The raw NOTAM string to parse.
 * @returns A parsed {@link Notam} object.
 * @throws {Error} If the string cannot be parsed as a valid NOTAM.
 */
export function parseNotam(raw: string): Notam {
  const trimmed = raw.trim();

  if (!trimmed) {
    throw new Error('Empty NOTAM string');
  }

  // Normalize to single-spaced for easier parsing, preserving original for raw field
  const normalized = stripFooter(trimmed.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim());

  // Parse the NOTAM header: ID and action type
  // Formats: "A1242/24 NOTAMN", "A1242/24 NOTAMR A1200/24", "A1242/24 NOTAMC A1200/24"
  // The header is optional only when the text begins at the Q-line.
  const headerMatch = normalized.match(
    /\b([A-Z]\d{1,5}\/\d{2})\s+NOTAM([NRC])(?:\s+([A-Z]\d{1,5}\/\d{2}))?\b/,
  );
  if (!headerMatch && !/^Q\)/i.test(normalized)) {
    throw new Error('Unable to parse NOTAM header: expected ID and NOTAMN/R/C');
  }

  const id = headerMatch?.[1];
  let action: NotamAction | undefined;
  switch (headerMatch?.[2]) {
    case 'N':
      action = 'NEW';
      break;
    case 'R':
      action = 'REPLACE';
      break;
    case 'C':
      action = 'CANCEL';
      break;
  }
  const referencedId = headerMatch?.[3];

  // Extract Q-line. Each of the 8 slash-separated fields excludes both ')' and
  // '/' so the engine cannot try multiple distributions of the slashes between
  // the fields, which keeps matching linear in input length.
  const qLineMatch = normalized.match(/Q\)\s*([^)/]*(?:\/[^)/]*){7})\s*(?=[A-G]\))/i);
  let qualifier: NotamQualifier | undefined;
  if (qLineMatch) {
    qualifier = parseQLine(qLineMatch[1]!.trim());
  }

  // Find all item positions once, then extract by letter
  const itemPositions = findItemPositions(normalized);

  const itemA = extractItem(normalized, 'A', itemPositions);
  if (!itemA) {
    throw new Error('Unable to parse NOTAM Item A (location)');
  }
  // Multi-part NOTAMs mark each part in Item A ("EDGG PART 1 OF 2"); that is not a location
  const locationCodes = itemA
    .replace(/\bPART\s+\d+\s+OF\s+\d+\b/gi, ' ')
    .split(/\s+/)
    .filter((s) => s.length > 0);

  const itemB = extractItem(normalized, 'B', itemPositions);
  if (!itemB) {
    throw new Error('Unable to parse NOTAM Item B (effective from)');
  }
  const effectiveFrom = parseNotamDateTime(itemB);
  if (!effectiveFrom) {
    throw new Error(`Unable to parse NOTAM Item B datetime: "${itemB}"`);
  }

  const itemC = extractItem(normalized, 'C', itemPositions);
  let effectiveUntil: NotamDateTime | undefined;
  let isEstimatedEnd = false;
  let isPermanent = false;
  let isUntilFurtherNotice = false;

  if (itemC) {
    const cleaned = itemC.trim();
    if (/^PERM$/i.test(cleaned)) {
      isPermanent = true;
    } else if (/^UFN$/i.test(cleaned)) {
      isUntilFurtherNotice = true;
    } else {
      const estMatch = cleaned.match(/^(\d{10})\s*EST$/i);
      if (estMatch) {
        isEstimatedEnd = true;
        effectiveUntil = parseNotamDateTime(estMatch[1]!);
      } else {
        effectiveUntil = parseNotamDateTime(cleaned.substring(0, 10));
      }
    }
  }

  const schedule = extractItem(normalized, 'D', itemPositions);
  const text = extractItem(normalized, 'E', itemPositions);
  if (!text) {
    throw new Error('Unable to parse NOTAM Item E (text)');
  }

  const lowerLimit = extractItem(normalized, 'F', itemPositions);
  const upperLimit = extractItem(normalized, 'G', itemPositions);

  return {
    raw: trimmed,
    ...(id !== undefined ? { id } : {}),
    ...(action !== undefined ? { action } : {}),
    ...(referencedId ? { referencedId } : {}),
    ...(qualifier ? { qualifier } : {}),
    locationCodes,
    effectiveFrom,
    ...(effectiveUntil ? { effectiveUntil } : {}),
    isEstimatedEnd,
    isPermanent,
    isUntilFurtherNotice,
    ...(schedule ? { schedule } : {}),
    text,
    ...(lowerLimit ? { lowerLimit } : {}),
    ...(upperLimit ? { upperLimit } : {}),
  };
}
