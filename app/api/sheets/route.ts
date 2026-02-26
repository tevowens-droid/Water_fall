import { google } from 'googleapis';
import { NextResponse } from 'next/server';

function getSheets() {
  // Support either a full JSON key (GOOGLE_SERVICE_ACCOUNT_JSON) or
  // individual vars (GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY)
  let credentials: { client_email: string; private_key: string };

  const jsonKey = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (jsonKey) {
    const parsed = JSON.parse(jsonKey);
    credentials = {
      client_email: parsed.client_email,
      private_key:  parsed.private_key,
    };
  } else {
    credentials = {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? '',
      private_key:  (process.env.GOOGLE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n'),
    };
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
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
  const mvc  = L ? 2 : 8;
  const catC = L ? 0 : 6;
  const alcC = L ? 1 : 7;
  const remC = L ? 2 : 8;
  const ovrC = L ? 3 : 9;
  const mnC  = L ? 4 : 10;

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
                     ? parseNum(ovrRaw) : null,
      monthlyNeed: parseNum(r[mnC]),
      rowNumber:   i + 1,
    });
  }
  return { payDate, amount, left, rows };
}

export async function GET() {
  const SHEET_ID = process.env.GOOGLE_SHEET_ID;
  if (!SHEET_ID) {
    return NextResponse.json(
      { error: 'Missing GOOGLE_SHEET_ID environment variable. Add it in Vercel → Settings → Environment Variables.' },
      { status: 500 }
    );
  }

  const hasJson = !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const hasIndividual = !!(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY);
  if (!hasJson && !hasIndividual) {
    return NextResponse.json(
      { error: 'Missing credentials. Set either GOOGLE_SERVICE_ACCOUNT_JSON (the full JSON key file contents) or both GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY.' },
      { status: 500 }
    );
  }

  try {
    const sheets = getSheets();
    const payRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'Paycheck_Input!A1:K30',
      valueRenderOption: 'FORMATTED_VALUE',
    });

    const vals = (payRes.data.values ?? []) as unknown[][];

    return NextResponse.json({
      thisWeek: parseWeek(vals, 'left'),
      nextWeek: parseWeek(vals, 'right'),
    });
  } catch (err) {
    console.error('Sheets read error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
