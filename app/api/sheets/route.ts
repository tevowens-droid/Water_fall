import { google } from 'googleapis';
import { NextResponse } from 'next/server';

const SHEET_ID = process.env.GOOGLE_SHEET_ID!;

function getSheets() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: (process.env.GOOGLE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

function parseNum(v: unknown): number {
  if (typeof v === 'number') return v;
  const s = String(v ?? '').replace(/[$,\s]/g, '');
  return parseFloat(s) || 0;
}

function parseWeek(vals: unknown[][], section: 'left' | 'right') {
  const L = section === 'left';
  // Meta row value column: C (index 2) for this week, I (index 8) for next week
  const mvc = L ? 2 : 8;
  // Category columns
  const catC = L ? 0 : 6;   // A or G
  const alcC = L ? 1 : 7;   // B or H  (Allocation)
  const remC = L ? 2 : 8;   // C or I  (Remaining)
  const ovrC = L ? 3 : 9;   // D or J  (Override)
  const mnC  = L ? 4 : 10;  // E or K  (Monthly Need)

  const row = (i: number): unknown[] => vals[i] ?? [];

  const payDate = String(row(0)[mvc] ?? '');
  const amount  = parseNum(row(1)[mvc]);
  const left    = parseNum(row(2)[mvc]);

  const rows = [];
  for (let i = 6; i <= 22; i++) {
    const r = row(i);
    const cat = String(r[catC] ?? '').trim();
    if (!cat || cat.toLowerCase() === 'category') continue;
    const ovrRaw = r[ovrC];
    rows.push({
      category:   cat,
      allocation: parseNum(r[alcC]),
      remaining:  parseNum(r[remC]),
      override:   (ovrRaw !== undefined && ovrRaw !== '' && ovrRaw !== null)
                    ? parseNum(ovrRaw)
                    : null,
      monthlyNeed: parseNum(r[mnC]),
      rowNumber:   i + 1,  // 1-indexed row number in the sheet
    });
  }
  return { payDate, amount, left, rows };
}

export async function GET() {
  try {
    const sheets = getSheets();
    const [payRes, catRes] = await Promise.all([
      sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: 'Paycheck_Input!A1:K30',
        valueRenderOption: 'FORMATTED_VALUE',
      }),
      sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: 'Categories!A2:D20',
        valueRenderOption: 'FORMATTED_VALUE',
      }),
    ]);

    const vals    = (payRes.data.values ?? []) as unknown[][];
    const catVals = (catRes.data.values ?? []) as unknown[][];

    const categories = catVals
      .filter(r => r[0] && String(r[0]).trim())
      .map(r => ({
        name:          String(r[0]),
        type:          String(r[1] ?? 'F') as 'F' | 'V',
        monthlyTarget: parseNum(r[2]),
        mtd:           parseNum(r[3]),
      }));

    return NextResponse.json({
      thisWeek: parseWeek(vals, 'left'),
      nextWeek: parseWeek(vals, 'right'),
      categories,
    });
  } catch (err) {
    console.error('Sheets read error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
