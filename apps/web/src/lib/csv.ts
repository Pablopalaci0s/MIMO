/**
 * CSV mínimo pero correcto: escapa comillas, comas y saltos de línea (regla
 * estándar de RFC 4180) — nunca alcanza con un simple `.join(",")`, un
 * nombre de producto con una coma rompería el archivo en Excel.
 */
function escapeCsvCell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function toCsv(rows: string[][]): string {
  return rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n");
}
