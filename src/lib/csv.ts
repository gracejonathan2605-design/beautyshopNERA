export function csvEscape(value: string | number | null | undefined) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function csvRow(cells: Array<string | number | null | undefined>) {
  return cells.map(csvEscape).join(",");
}

export function toCsv(rows: Array<Array<string | number | null | undefined>>) {
  return `${rows.map(csvRow).join("\r\n")}\r\n`;
}
