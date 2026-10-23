// Format utilities for Persian/Farsi
const faDigits = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];

export function faNum(n: string | number): string {
  return String(n).replace(/[0-9]/g, (d) => faDigits[+d]);
}

export function tnum(n: string | number): string {
  return String(n);
}

export function toEnDigits(s: string): string {
  return s.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
}

export function formatPrice(n: number): string {
  return faNum(Math.round(n).toLocaleString('en-US'));
}

export function finalPrice(price: number, discount: number): number {
  if (!discount || discount <= 0) return price;
  return Math.round(price * (1 - discount / 100));
}

export function codeAmount(code: { type: string; value: number }, subtotal: number): number {
  if (!code) return 0;
  if (code.type === 'percent') return Math.round(subtotal * code.value / 100);
  return Math.min(code.value, subtotal);
}

export function normalizeFa(s: string): string {
  return s.replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/[\u064B-\u065F\u0670]/g, '').replace(/\u200c/g, '').trim();
}

export function pad2(n: number): string {
  return n < 10 ? '0' + n : '' + n;
}

export function faDate(d?: Date): string {
  const date = d || new Date();
  try {
    return faNum(new Intl.DateTimeFormat('fa-IR').format(date));
  } catch { return String(date); }
}

export function faDateFull(d?: Date): string {
  const date = d || new Date();
  try {
    return faNum(new Intl.DateTimeFormat('fa-IR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(date));
  } catch { return String(date); }
}

export function faTime(d?: Date): string {
  const date = d || new Date();
  try {
    return faNum(new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit' }).format(date));
  } catch { return ''; }
}

export function dayLabel(d: Date): string {
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return 'امروز';
  if (diff === 1) return 'دیروز';
  return faDate(d);
}

export function orderCode(n: number): string {
  return 'SQ-' + faNum(String(n).padStart(6, '0'));
}

export function toCSV(rows: Record<string, any>[]): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = [headers.map(h => faNum(h)).join(',')];
  rows.forEach(r => lines.push(headers.map(h => {
    const val = r[h];
    if (typeof val === 'number') return faNum(val);
    return JSON.stringify(val ?? '');
  }).join(',')));
  return '\uFEFF' + lines.join('\n');
}

export function toExcel(rows: Record<string, any>[], title: string = 'گزارش'): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  
  const html = `
<!DOCTYPE html>
<html dir="rtl">
<head>
<meta charset="UTF-8">
<style>
  body { font-family: 'Vazirmatn', Tahoma, sans-serif; direction: rtl; }
  table { border-collapse: collapse; width: 100%; margin: 20px 0; }
  th { background: linear-gradient(135deg, #1A2238 0%, #2d4a85 100%); color: white; padding: 12px 8px; text-align: right; font-weight: bold; border: 1px solid #1A2238; }
  td { padding: 10px 8px; border: 1px solid #E8E1CC; text-align: right; }
  tr:nth-child(even) { background-color: #F9F6EB; }
  tr:nth-child(odd) { background-color: #FFFFFF; }
  tr:hover { background-color: #f0f3f9; }
  .title { font-size: 18px; font-weight: bold; color: #1A2238; margin-bottom: 10px; text-align: center; }
  .date { font-size: 12px; color: #666; text-align: center; margin-bottom: 20px; }
  .number { direction: ltr; text-align: left; }
</style>
</head>
<body>
<div class="title">${title}</div>
<div class="date">تاریخ: ${faDateFull()}</div>
<table>
<thead>
<tr>
${headers.map(h => `<th>${faNum(h)}</th>`).join('\n')}
</tr>
</thead>
<tbody>
${rows.map(r => `<tr>
${headers.map(h => {
  const val = r[h];
  if (typeof val === 'number') {
    return `<td class="number">${faNum(val.toLocaleString('en-US'))}</td>`;
  }
  return `<td>${val ?? ''}</td>`;
}).join('\n')}
</tr>`).join('\n')}
</tbody>
</table>
</body>
</html>`;
  return html;
}

export function downloadFile(content: string, name: string, type = 'text/csv') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}
