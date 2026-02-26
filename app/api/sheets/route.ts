import { google } from 'googleapis';
import { NextResponse } from 'next/server';

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
  const mvc  = L ? 2 : 8;   // meta value col: C (this week) or I (next week)
  const catC = L ? 0 : 6;   // A or G
  const alcC = L ? 1 : 7;   // B or H
  const remC = L ? 2 : 8;   // C or I
  const ovrC = L ? 3 : 9;   // D or J
  const mnC  = L ? 4 : 10;  // E or K

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
      category:    cat,
      allocation:  parseNum(r[alcC]),
      remaining:   parseNum(r[remC]),
      override:    (ovrRaw !== undefined && ovrRaw !== '' && ovrRaw !== null)
                     ? parseNum(ovrRaw)
                     : null,
      monthlyNeed: parseNum(r[mnC]),
      rowNumber:   i + 1,
    });
  }
  return { payDate, amount, left, rows };
}

export async function GET() {
  // Read env vars inside the handler so they're always fresh in serverless
  const SHEET_ID   = process.env.GOOGLE_SHEET_ID;
  const CLIENT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const PRIVATE_KEY  = process.env.GOOGLE_PRIVATE_KEY;

  if (!SHEET_ID || !CLIENT_EMAIL || !PRIVATE_KEY) {
    const missing = [
      !SHEET_ID      && 'GOOGLE_SHEET_ID',
      !CLIENT_EMAIL  && 'GOOGLE_SERVICE_ACCOUNT_EMAIL',
      !PRIVATE_KEY   && 'GOOGLE_PRIVATE_KEY',
    ].filter(Boolean).join(', ');
    return NextResponse.json(
      { error: `Missing environment variable(s): ${missing}. Add them in Vercel → Settings → Environment Variables (or .env.local for local dev).` },
      { status: 500 }
    );
  }

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
      thisWeek:   parseWeek(vals, 'left'),
      nextWeek:   parseWeek(vals, 'right'),
      categories,
    });
  } catch (err) {
    console.error('Sheets read error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
