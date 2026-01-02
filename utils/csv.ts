type CsvValue = string | number | boolean | null | undefined | Date;

function escapeCsvValue(value: CsvValue): string {
  if (value == null) return '';
  const str = value instanceof Date ? value.toISOString() : String(value);

  // Quote if it contains special chars
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCsv<T extends Record<string, unknown>>(
  rows: T[],
  columns: Array<{ key: keyof T; header: string }>
): string {
  const headerLine = columns.map((c) => escapeCsvValue(c.header)).join(',');
  const lines = rows.map((row) =>
    columns
      .map((c) => escapeCsvValue(row[c.key] as CsvValue))
      .join(',')
  );
  return [headerLine, ...lines].join('\n');
}

export function downloadCsv(filename: string, csvText: string) {
  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
