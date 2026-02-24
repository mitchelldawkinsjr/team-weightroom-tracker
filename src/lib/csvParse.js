/**
 * Parse roster CSV: header row + data rows.
 * Returns { headers, rows, errors }.
 * Canonical keys: name, position, grade, jersey_number, level.
 */

const COLUMN_ALIASES = {
  name: ["name"],
  position: ["position", "pos"],
  grade: ["grade"],
  jersey_number: ["jersey_number", "jerseynumber", "jersey", "number", "num", "#"],
  level: ["level", "squad", "team", "varsity", "varsity_jv"],
};

function normalizeHeader(h) {
  return String(h).trim().toLowerCase().replace(/\s+/g, "_");
}

function mapHeaderToCanonical(normalized) {
  for (const [canonical, aliases] of Object.entries(COLUMN_ALIASES)) {
    if (aliases.includes(normalized) || normalized === canonical) return canonical;
  }
  return null;
}

function parseLine(line) {
  const out = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      i += 1;
      let field = "";
      while (i < line.length && line[i] !== '"') {
        field += line[i];
        i += 1;
      }
      if (line[i] === '"') i += 1;
      out.push(field.trim());
    } else {
      let field = "";
      while (i < line.length && line[i] !== ",") {
        field += line[i];
        i += 1;
      }
      out.push(field.trim());
      if (line[i] === ",") i += 1;
    }
  }
  return out;
}

function normalizeLevel(value) {
  if (value == null || String(value).trim() === "") return null;
  const v = String(value).trim().toLowerCase();
  if (["varsity", "v", "var"].includes(v)) return "varsity";
  if (["junior varsity", "junior_varsity", "jv", "jr varsity", "jr"].includes(v)) return "junior_varsity";
  return null;
}

/**
 * @param {string} csvText
 * @returns {{ headers: string[], rows: Array<{ name: string, position?: string, grade?: string, jersey_number?: string, level?: string }>, errors: Array<{ row: number, message: string }> }}
 */
export function parseRosterCsv(csvText) {
  const errors = [];
  const lines = String(csvText)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { headers: [], rows: [], errors: [{ row: 0, message: "No header row" }] };
  }

  const headerLine = lines[0];
  const headerCells = parseLine(headerLine);
  const headers = headerCells.map(normalizeHeader);
  const canonicalIndex = headers.map((h) => mapHeaderToCanonical(h));

  const nameIdx = canonicalIndex.indexOf("name");
  if (nameIdx === -1) {
    errors.push({ row: 1, message: "Missing 'name' column in header" });
  }

  const rows = [];
  for (let r = 1; r < lines.length; r++) {
    const cells = parseLine(lines[r]);
    const row = {};
    for (let c = 0; c < canonicalIndex.length; c++) {
      const canon = canonicalIndex[c];
      const val = cells[c] != null ? String(cells[c]).trim() : "";
      if (!canon) continue;
      if (canon === "level") {
        const normalized = normalizeLevel(val);
        if (normalized) row.level = normalized;
      } else if (val) {
        row[canon] = val;
      }
    }
    if (!row.name) {
      errors.push({ row: r + 1, message: "Name is required" });
      continue;
    }
    rows.push(row);
  }

  return { headers: headerCells, rows, errors };
}
