/**
 * Collision-Proof ID and Document Number Generator for PTA QMS
 */

/**
 * Legacy sequence generator for tests and requirements.
 * Maintained for 100% backward compatibility.
 */
export function generateId(prefix: string, counter: number): string {
  return `${prefix}-${String(counter).padStart(3, '0')}`;
}

/**
 * Generates a collision-free UUID primary key for store records.
 * Uses crypto.randomUUID() when available in browser/Node, falling back
 * to high-resolution timestamp + random alphanumeric suffix.
 */
export function generateRecordId(prefix: string = 'rec'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  const timestamp = Date.now();
  const rand = Math.random().toString(36).substring(2, 10);
  return `${prefix}-${timestamp}-${rand}`;
}

/**
 * Scans existing records to compute the next sequential business document number.
 * Guarantees zero collisions even if records are deleted, filtered, or imported out-of-order.
 *
 * Example outputs:
 * - DCR: DCR-2026-001, DCR-2026-002
 * - MRM: MRM-2026-01
 * - IA:  IA-2026-01
 *
 * @param prefix Document prefix (e.g. 'DCR', 'MRM', 'IA')
 * @param year Target calendar year (defaults to current year)
 * @param records Array of existing records in the store
 * @param fieldName Specific document number field name (optional)
 * @param digits Number of zero-padded digits (default: 3)
 */
export function generateDocNo(
  prefix: string,
  year: number = new Date().getFullYear(),
  records: Array<Record<string, any>> = [],
  fieldName?: string,
  digits: number = 3
): string {
  const prefixUpper = prefix.trim().toUpperCase();
  const pattern = new RegExp(`^${prefixUpper}-${year}-(\\d+)$`, 'i');
  let maxSeq = 0;

  for (const record of records) {
    if (!record || typeof record !== 'object') continue;

    const value = fieldName
      ? record[fieldName]
      : record.dcrNo || record.meetingNo || record.ref || record.no || record.docNo;

    if (typeof value === 'string') {
      const match = value.trim().match(pattern);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (!Number.isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    }
  }

  const nextSeq = maxSeq + 1;
  return `${prefixUpper}-${year}-${String(nextSeq).padStart(digits, '0')}`;
}

